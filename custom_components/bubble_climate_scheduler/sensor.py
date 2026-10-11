"""Single discovery sensor exposing all configured climate programs."""

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.entity import EntityCategory

from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    scheduler = hass.data[DOMAIN][entry.entry_id]
    entity = SchedulerSensor(scheduler)
    scheduler.sensor = entity
    async_add_entities([entity])


class SchedulerSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_name = "Programs"
    _attr_unique_id = "bubble_climate_scheduler_programs"
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_icon = "mdi:calendar-clock"

    def __init__(self, scheduler):
        self.scheduler = scheduler

    @property
    def native_value(self):
        return "ready"

    @property
    def extra_state_attributes(self):
        return {
            "scheduler_domain": DOMAIN,
            "programs": self.scheduler.sensor_programs(),
        }
