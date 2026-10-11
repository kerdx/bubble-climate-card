"""Independent weekly scheduler for Home Assistant climate entities."""

from __future__ import annotations

import asyncio
import logging
import math
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, PLATFORMS, STORAGE_KEY, STORAGE_VERSION
from .schedule import (
    ScheduleError,
    active_slot,
    availability_action,
    validate_program,
    program_status,
    validate_single_target_mode,
    validate_target,
    target_needs_update,
    snapshot_entity_state,
    restore_entity_state,
)

_LOGGER = logging.getLogger(__name__)


class ScheduleValidationError(HomeAssistantError):
    """Invalid schedule request, distinct from failed persistent writes."""


class Scheduler:
    """Own persisted programs and their runtime state."""

    def __init__(self, hass: HomeAssistant, store: Store) -> None:
        self.hass = hass
        self.store = store
        self.programs: dict[str, dict[str, Any]] = {}
        self.errors: dict[str, str | None] = {}
        self.pending: set[str] = set()
        self.applied_slot: dict[str, str | None] = {}
        self._evaluation_lock = asyncio.Lock()
        self._last_logged_error: dict[str, str] = {}
        self.refresh: Any = None
        self.unsub_state: Any = None
        self.sensor: Any = None

    async def async_load(self) -> None:
        stored = await self.store.async_load()
        if not isinstance(stored, dict) or stored.get("schema_version") != STORAGE_VERSION:
            self.programs = {}
            return
        raw_programs = stored.get("programs", {})
        if not isinstance(raw_programs, dict):
            return
        for entity_id, raw in raw_programs.items():
            try:
                if not isinstance(entity_id, str) or not entity_id.startswith("climate."):
                    continue
                program = validate_program(raw["slots"], raw.get("enabled", False))
                self.programs[entity_id] = program
                self.errors[entity_id] = raw.get("last_error")
            except (KeyError, ScheduleError, TypeError):
                _LOGGER.warning("Ignoring invalid stored schedule for %s", entity_id)

    async def async_save(self) -> None:
        await self.store.async_save({
            "schema_version": STORAGE_VERSION,
            "programs": {
                entity_id: {**program, "last_error": self.errors.get(entity_id)}
                for entity_id, program in self.programs.items()
            },
        })
        self._update_sensor()

    def _update_sensor(self) -> None:
        if self.sensor:
            self.sensor.async_write_ha_state()

    def _snapshot_entity(self, entity_id: str) -> tuple[Any, ...]:
        return snapshot_entity_state(
            entity_id,
            (self.programs, self.errors, self.applied_slot, self._last_logged_error),
            (self.pending,),
        )

    def _rollback_entity(self, snapshot: tuple[Any, ...]) -> None:
        restore_entity_state(snapshot)
        self._update_sensor()

    def sensor_programs(self) -> dict[str, dict[str, Any]]:
        now = dt_util.now()
        result: dict[str, dict[str, Any]] = {}
        for entity_id, program in self.programs.items():
            slot, boundary = program_status(program["slots"], program["enabled"], now)
            result[entity_id] = {
                **program,
                "active_slot_id": slot["id"] if slot else None,
                "next_change": boundary.isoformat() if boundary else None,
                "last_error": self.errors.get(entity_id),
            }
        return result

    async def async_set_program(self, entity_id: str, enabled: bool, slots: list[dict[str, Any]]) -> None:
        try:
            program = validate_program(slots, enabled)
            if enabled:
                state = self.hass.states.get(entity_id)
                if state is not None and state.state not in ("unavailable", "unknown"):
                    _validate_climate_target(state, program["slots"])
        except (ScheduleError, HomeAssistantError) as err:
            raise ScheduleValidationError(str(err)) from err
        async with self._evaluation_lock:
            snapshot = self._snapshot_entity(entity_id)
            try:
                self.programs[entity_id] = program
                self.errors[entity_id] = None
                self.applied_slot.pop(entity_id, None)
                self._last_logged_error.pop(entity_id, None)
                if not enabled:
                    self.pending.discard(entity_id)
                await self.async_save()
            except BaseException:
                self._rollback_entity(snapshot)
                raise
        if enabled:
            await self.async_evaluate(entity_id)

    async def async_enable(self, entity_id: str, enabled: bool) -> None:
        async with self._evaluation_lock:
            if entity_id not in self.programs:
                raise ScheduleValidationError("No schedule exists for this climate entity")
            if enabled:
                state = self.hass.states.get(entity_id)
                if state is not None and state.state not in ("unavailable", "unknown"):
                    try:
                        _validate_climate_target(state, self.programs[entity_id]["slots"])
                    except HomeAssistantError as err:
                        raise ScheduleValidationError(str(err)) from err
            snapshot = self._snapshot_entity(entity_id)
            try:
                self.programs[entity_id]["enabled"] = enabled
                self.errors[entity_id] = None
                self.applied_slot.pop(entity_id, None)
                self._last_logged_error.pop(entity_id, None)
                if not enabled:
                    self.pending.discard(entity_id)
                await self.async_save()
            except BaseException:
                self._rollback_entity(snapshot)
                raise
        if enabled:
            await self.async_evaluate(entity_id)

    async def async_delete(self, entity_id: str) -> None:
        async with self._evaluation_lock:
            snapshot = self._snapshot_entity(entity_id)
            try:
                self.programs.pop(entity_id, None)
                self.errors.pop(entity_id, None)
                self.pending.discard(entity_id)
                self.applied_slot.pop(entity_id, None)
                self._last_logged_error.pop(entity_id, None)
                await self.async_save()
            except BaseException:
                self._rollback_entity(snapshot)
                raise

    def _set_error(self, entity_id: str, message: str, *, log: bool = False) -> None:
        self.errors[entity_id] = message
        if log and self._last_logged_error.get(entity_id) != message:
            _LOGGER.warning("Could not apply schedule to %s: %s", entity_id, message)
            self._last_logged_error[entity_id] = message

    async def async_report_error(self, entity_id: str, message: str) -> None:
        async with self._evaluation_lock:
            self.errors[entity_id] = message
            self._update_sensor()

    async def async_evaluate(self, only: str | None = None) -> None:
        async with self._evaluation_lock:
            now = dt_util.now()
            entities = [only] if only else list(self.programs)
            for entity_id in entities:
                program = self.programs.get(entity_id)
                if not program or not program["enabled"]:
                    continue
                slot = active_slot(program["slots"], now)
                slot_id = slot["id"] if slot else None
                if slot is None:
                    self.applied_slot[entity_id] = None
                    self.pending.discard(entity_id)
                    self.errors[entity_id] = None
                    self._last_logged_error.pop(entity_id, None)
                    continue
                if entity_id not in self.pending and self.applied_slot.get(entity_id, object()) == slot_id:
                    continue
                state = self.hass.states.get(entity_id)
                if state is None or state.state in ("unavailable", "unknown"):
                    self.pending.add(entity_id)
                    self._set_error(entity_id, "Climate entity is unavailable; target is pending")
                    continue
                try:
                    _validate_climate_target(state, [slot])
                except HomeAssistantError as err:
                    # A permanent validation failure is retried on config/state change,
                    # but not on every minute tick.
                    self.pending.discard(entity_id)
                    self.applied_slot[entity_id] = slot_id
                    self._set_error(entity_id, str(err), log=True)
                    continue
                try:
                    target = float(slot["temperature"])
                    current = state.attributes.get("temperature")
                    if target_needs_update(current, target, _step(state)):
                        await self.hass.services.async_call("climate", "set_temperature", {
                            "entity_id": entity_id, "temperature": target,
                        }, blocking=True)
                    self.applied_slot[entity_id] = slot_id
                    self.pending.discard(entity_id)
                    self.errors[entity_id] = None
                    self._last_logged_error.pop(entity_id, None)
                except Exception as err:
                    # A service call may fail transiently. Keep it pending for the
                    # minute tick/availability event; suppress identical log spam.
                    self.pending.add(entity_id)
                    self._set_error(entity_id, str(err) or "Climate service call failed; target is pending", log=True)
            self._update_sensor()

    async def async_state_changed(self, event: Any) -> None:
        entity_id = event.data.get("entity_id")
        old, new = event.data.get("old_state"), event.data.get("new_state")
        if not new:
            return
        retry = False
        config_retry = False
        async with self._evaluation_lock:
            program = self.programs.get(entity_id)
            if not program:
                return
            now = dt_util.now()
            active = program["enabled"] and active_slot(program["slots"], now) is not None
            old_state = old.state if old else None
            action = availability_action(program["enabled"], active, old_state, new.state)
            if action == "pending":
                self.pending.add(entity_id)
                self._set_error(entity_id, "Climate entity is unavailable; target is pending")
                self._update_sensor()
            elif action == "retry":
                # A restore during an active slot is actionable even if no prior
                # event/tick managed to mark the entity pending.
                self.pending.add(entity_id)
                retry = True
            config_changed = old is None or any(
                old.attributes.get(key) != new.attributes.get(key)
                for key in ("hvac_mode", "min_temp", "max_temp", "target_temp_step")
            ) or (old is not None and old.state != new.state and "heat_cool" in (old.state, new.state))
            validation_blocked = bool(self.errors.get(entity_id)) and entity_id not in self.pending
            if config_changed and validation_blocked:
                self.applied_slot.pop(entity_id, None)
                self._last_logged_error.pop(entity_id, None)
                config_retry = True
        if retry or config_retry:
            await self.async_evaluate(entity_id)


def _step(state: Any) -> float:
    try:
        step = float(state.attributes["target_temp_step"])
        minimum, maximum = float(state.attributes["min_temp"]), float(state.attributes["max_temp"])
    except (KeyError, TypeError, ValueError) as err:
        raise HomeAssistantError("Climate temperature range or step is unavailable") from err
    if not all(math.isfinite(v) for v in (step, minimum, maximum)) or step <= 0 or minimum >= maximum:
        raise HomeAssistantError("Climate temperature range or step is invalid")
    return step


def _strict_bool(value: Any) -> bool:
    if not isinstance(value, bool):
        raise vol.Invalid("enabled must be boolean")
    return value


def _validate_climate_target(state: Any, slots: list[dict[str, Any]]) -> None:
    try:
        validate_single_target_mode(state.state, state.attributes.get("hvac_mode"))
    except ScheduleError as err:
        raise HomeAssistantError(str(err)) from err
    step = _step(state)
    for slot in slots:
        try:
            validate_target(slot["temperature"], state.attributes["min_temp"], state.attributes["max_temp"], step)
        except ScheduleError as err:
            raise HomeAssistantError(str(err)) from err


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    hass.data.setdefault(DOMAIN, {})
    www_path = Path(__file__).parent / "www"
    await hass.http.async_register_static_paths([
        StaticPathConfig("/bubble_climate_scheduler", str(www_path), cache_headers=False)
    ])
    return True


async def async_setup_entry(hass: HomeAssistant, entry: Any) -> bool:
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    scheduler = Scheduler(hass, store)
    await scheduler.async_load()
    hass.data[DOMAIN][entry.entry_id] = scheduler
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    schema_entity = vol.All(cv.entity_id, vol.Match(r"^climate\."))
    set_program_schema = vol.Schema({
        vol.Required("climate_entity"): schema_entity,
        vol.Required("enabled"): _strict_bool,
        vol.Required("slots"): list,
    })
    enabled_schema = vol.Schema({vol.Required("climate_entity"): schema_entity, vol.Required("enabled"): _strict_bool})
    delete_schema = vol.Schema({vol.Required("climate_entity"): schema_entity})

    async def save(call: ServiceCall) -> None:
        try:
            await scheduler.async_set_program(call.data["climate_entity"], call.data["enabled"], call.data["slots"])
        except ScheduleValidationError as err:
            entity = call.data.get("climate_entity")
            if entity:
                await scheduler.async_report_error(entity, str(err))
            raise HomeAssistantError(str(err)) from err

    async def enable(call: ServiceCall) -> None:
        try:
            await scheduler.async_enable(call.data["climate_entity"], call.data["enabled"])
        except ScheduleValidationError as err:
            await scheduler.async_report_error(call.data["climate_entity"], str(err))
            raise

    async def delete(call: ServiceCall) -> None:
        await scheduler.async_delete(call.data["climate_entity"])

    for name, handler, schema in (("save_program", save, set_program_schema), ("set_enabled", enable, enabled_schema), ("delete_program", delete, delete_schema)):
        if not hass.services.has_service(DOMAIN, name):
            hass.services.async_register(DOMAIN, name, handler, schema=schema)
    scheduler.refresh = async_track_time_change(
        hass,
        lambda _: hass.async_create_task(scheduler.async_evaluate()),
        second=0,
    )
    scheduler.unsub_state = hass.bus.async_listen("state_changed", scheduler.async_state_changed)
    await scheduler.async_evaluate()
    return True


async def async_unload_entry(hass: HomeAssistant, entry: Any) -> bool:
    scheduler: Scheduler = hass.data[DOMAIN][entry.entry_id]
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    if scheduler.refresh:
        scheduler.refresh()
    if scheduler.unsub_state:
        scheduler.unsub_state()
    for name in ("save_program", "set_enabled", "delete_program"):
        hass.services.async_remove(DOMAIN, name)
    hass.data[DOMAIN].pop(entry.entry_id, None)
    return True
