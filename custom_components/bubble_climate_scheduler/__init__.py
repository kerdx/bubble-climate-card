"""Independent weekly scheduler for Home Assistant climate entities."""

from __future__ import annotations

import asyncio
import logging
import math
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components.frontend import add_extra_js_url, remove_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, FRONTEND_URL, PLATFORMS, STORAGE_KEY, STORAGE_VERSION, CONFIG_ENTRY_VERSION
from .schedule import (
    ScheduleError,
    availability_action,
    entity_config_changed,
    validate_program,
    program_status,
    resolve_target,
    validate_single_target_mode,
    validate_target,
    target_needs_update,
    snapshot_entity_state,
    restore_entity_state,
    migrate_storage_data,
    structured_error,
    error_entry,
)

_LOGGER = logging.getLogger(__name__)


class ScheduleValidationError(HomeAssistantError):
    """Invalid schedule request, distinct from failed persistent writes."""

    def __init__(self, message: str, *args: Any, code: str | None = None, context: dict[str, Any] | None = None) -> None:
        """Keep the readable English message and the machine-readable code.

        The translation metadata lets Home Assistant render the localized
        message where supported; on releases without exception translation
        the English message remains the visible fallback.
        """
        super().__init__(message, *args)
        self.code = code or "invalid_program"
        self.context = dict(context or {})
        self.translation_domain = DOMAIN
        self.translation_key = self.code
        self.translation_placeholders = {key: str(value) for key, value in self.context.items()}


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
        if not isinstance(stored, dict):
            self.programs = {}
            return
        stored_version = stored.get("schema_version")
        if not isinstance(stored_version, int):
            _LOGGER.warning("Ignoring stored schedules written without a schema version")
            self.programs = {}
            return
        if stored_version != STORAGE_VERSION:
            migrated = migrate_storage_data(stored, stored_version, STORAGE_VERSION)
            if migrated is None:
                _LOGGER.warning(
                    "Discarding stored schedules: schema version %s cannot be migrated to %s",
                    stored_version,
                    STORAGE_VERSION,
                )
                self.programs = {}
                return
            stored = migrated
            # The migrated payload stays on disk until the next program write;
            # the loader re-migrates idempotently, so no startup save is needed.
        raw_programs = stored.get("programs", {})
        if not isinstance(raw_programs, dict):
            return
        for entity_id, raw in raw_programs.items():
            try:
                if not isinstance(entity_id, str) or not entity_id.startswith("climate."):
                    continue
                program = validate_program(raw["slots"], raw.get("enabled", False), raw.get("away_temperature"), raw.get("hvac_mode"))
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

    async def async_set_program(self, entity_id: str, enabled: bool, slots: list[dict[str, Any]], away_temperature: Any = None, hvac_mode: Any = None) -> None:
        try:
            program = validate_program(slots, enabled, away_temperature, hvac_mode)
            if enabled:
                state = self.hass.states.get(entity_id)
                if state is not None and state.state not in ("unavailable", "unknown"):
                    _validate_program(state, program)
        except (ScheduleError, HomeAssistantError) as err:
            # Pure schedule errors carry a code; entity-state checks do not,
            # and fall back to the entity_validation_failed code that shows
            # the readable message.
            code = getattr(err, "code", None) or "entity_validation_failed"
            raise ScheduleValidationError(str(err), code=code, context=getattr(err, "context", None)) from err
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
                raise ScheduleValidationError("No schedule exists for this climate entity", code="no_program")
            if enabled:
                state = self.hass.states.get(entity_id)
                if state is not None and state.state not in ("unavailable", "unknown"):
                    try:
                        _validate_program(state, self.programs[entity_id])
                    except (ScheduleError, HomeAssistantError) as err:
                        code = getattr(err, "code", None) or "entity_validation_failed"
                        raise ScheduleValidationError(str(err), code=code, context=getattr(err, "context", None)) from err
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

    def _set_error(self, entity_id: str, code: str, message: str, *, log: bool = False) -> None:
        self.errors[entity_id] = error_entry(code, message)
        if log and self._last_logged_error.get(entity_id) != message:
            _LOGGER.warning("Could not apply schedule to %s: %s", entity_id, message)
            self._last_logged_error[entity_id] = message

    async def async_report_error(self, entity_id: str, error: HomeAssistantError) -> None:
        async with self._evaluation_lock:
            self.errors[entity_id] = structured_error(error)
            self._update_sensor()

    async def async_evaluate(self, only: str | None = None) -> None:
        async with self._evaluation_lock:
            now = dt_util.now()
            entities = [only] if only else list(self.programs)
            for entity_id in entities:
                program = self.programs.get(entity_id)
                if not program or not program["enabled"]:
                    continue
                target_kind, target = resolve_target(program["slots"], program.get("away_temperature"), now)
                mode = program.get("hvac_mode")
                if target_kind is None and mode is None:
                    self.applied_slot[entity_id] = None
                    self.pending.discard(entity_id)
                    self.errors[entity_id] = None
                    self._last_logged_error.pop(entity_id, None)
                    continue
                # The applied key covers the mode too: a manual mode or target
                # change still stands until the next slot boundary.
                apply_key = f"{mode or '-'}|{target_kind or '-'}"
                if entity_id not in self.pending and self.applied_slot.get(entity_id, object()) == apply_key:
                    continue
                state = self.hass.states.get(entity_id)
                if state is None or state.state in ("unavailable", "unknown"):
                    self.pending.add(entity_id)
                    self._set_error(entity_id, "entity_unavailable", "Climate entity is unavailable; target is pending")
                    continue
                try:
                    if mode is not None:
                        _validate_hvac_mode(state, mode)
                    if target is not None and mode != "off":
                        _validate_climate_target(state, [target], mode)
                except HomeAssistantError as err:
                    # A permanent validation failure is retried on config/state change,
                    # but not on every minute tick.
                    self.pending.discard(entity_id)
                    self.applied_slot[entity_id] = apply_key
                    self._set_error(entity_id, getattr(err, "code", None) or "entity_validation_failed", str(err), log=True)
                    continue
                try:
                    if mode is not None and state.state != mode:
                        await self.hass.services.async_call("climate", "set_hvac_mode", {
                            "entity_id": entity_id, "hvac_mode": mode,
                        }, blocking=True)
                    if target is not None and mode != "off":
                        current = state.attributes.get("temperature")
                        if target_needs_update(current, target, _step(state)):
                            await self.hass.services.async_call("climate", "set_temperature", {
                                "entity_id": entity_id, "temperature": target,
                            }, blocking=True)
                    self.applied_slot[entity_id] = apply_key
                    self.pending.discard(entity_id)
                    self.errors[entity_id] = None
                    self._last_logged_error.pop(entity_id, None)
                except Exception as err:
                    # A service call may fail transiently. Keep it pending for the
                    # minute tick/availability event; suppress identical log spam.
                    self.pending.add(entity_id)
                    self._set_error(entity_id, "service_call_failed", str(err) or "Climate service call failed; target is pending", log=True)
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
            has_target = resolve_target(program["slots"], program.get("away_temperature"), now)[0] is not None
            active = program["enabled"] and (has_target or program.get("hvac_mode") is not None)
            old_state = old.state if old else None
            action = availability_action(program["enabled"], active, old_state, new.state)
            if action == "pending":
                self.pending.add(entity_id)
                self._set_error(entity_id, "entity_unavailable", "Climate entity is unavailable; target is pending")
                self._update_sensor()
            elif action == "retry":
                # A restore during an active slot is actionable even if no prior
                # event/tick managed to mark the entity pending.
                self.pending.add(entity_id)
                retry = True
            config_changed = entity_config_changed(
                old.attributes if old is not None else None,
                new.attributes,
                old.state if old is not None else None,
                new.state,
            )
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


def _program_temperatures(program: dict[str, Any]) -> list[Any]:
    """Slot targets plus the optional away target, validated together."""
    temperatures: list[Any] = [slot["temperature"] for slot in program["slots"]]
    away = program.get("away_temperature")
    if away is not None:
        temperatures.append(away)
    return temperatures


def _validate_hvac_mode(state: Any, mode: str) -> None:
    """Reject a program mode the entity does not expose, with a machine code."""
    modes = state.attributes.get("hvac_modes")
    if isinstance(modes, list) and modes and mode not in modes:
        raise ScheduleError(
            f"HVAC mode {mode} is not available for this climate entity",
            "unsupported_hvac_mode", mode=mode,
        )


def _validate_program(state: Any, program: dict[str, Any]) -> None:
    """Validate the program's mode and targets against the entity."""
    mode = program.get("hvac_mode")
    if mode is not None:
        _validate_hvac_mode(state, mode)
    if mode == "off":
        return
    _validate_climate_target(state, _program_temperatures(program), mode)


def _validate_climate_target(state: Any, temperatures: list[Any], mode: Any = None) -> None:
    """Validate the target grid against the entity; pure errors keep their code."""
    validate_single_target_mode(mode if mode is not None else state.state, None if mode is not None else state.attributes.get("hvac_mode"))
    step = _step(state)
    for target in temperatures:
        validate_target(target, state.attributes["min_temp"], state.attributes["max_temp"], step)


@callback
def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Migrate a saved config entry to the current entry version.

    Version 1 entries are the current schema and skip this hook entirely.
    Future versions return True after rewriting entry data (persisted with
    a compatible schema); entries written by a newer release are rejected
    so an outdated integration never saves over newer data.
    """
    if entry.version > CONFIG_ENTRY_VERSION:
        _LOGGER.error(
            "Config entry for Bubble Climate Scheduler was saved by a newer version; update the integration"
        )
        return False
    if entry.version != CONFIG_ENTRY_VERSION:
        hass.config_entries.async_update_entry(entry, version=CONFIG_ENTRY_VERSION)
    return True


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
        vol.Optional("away_temperature"): vol.Any(None, int, float),
        vol.Optional("hvac_mode"): vol.Any(None, str),
    })
    enabled_schema = vol.Schema({vol.Required("climate_entity"): schema_entity, vol.Required("enabled"): _strict_bool})
    delete_schema = vol.Schema({vol.Required("climate_entity"): schema_entity})

    async def save(call: ServiceCall) -> None:
        try:
            await scheduler.async_set_program(call.data["climate_entity"], call.data["enabled"], call.data["slots"], call.data.get("away_temperature"), call.data.get("hvac_mode"))
        except ScheduleValidationError as err:
            entity = call.data.get("climate_entity")
            if entity:
                await scheduler.async_report_error(entity, err)
            raise HomeAssistantError(str(err)) from err

    async def enable(call: ServiceCall) -> None:
        try:
            await scheduler.async_enable(call.data["climate_entity"], call.data["enabled"])
        except ScheduleValidationError as err:
            await scheduler.async_report_error(call.data["climate_entity"], err)
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
    add_extra_js_url(hass, FRONTEND_URL)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: Any) -> bool:
    scheduler: Scheduler = hass.data[DOMAIN][entry.entry_id]
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    remove_extra_js_url(hass, FRONTEND_URL)
    if scheduler.refresh:
        scheduler.refresh()
    if scheduler.unsub_state:
        scheduler.unsub_state()
    for name in ("save_program", "set_enabled", "delete_program"):
        hass.services.async_remove(DOMAIN, name)
    hass.data[DOMAIN].pop(entry.entry_id, None)
    return True
