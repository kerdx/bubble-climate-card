"""Integration constants."""

DOMAIN = "bubble_climate_scheduler"
FRONTEND_URL = "/bubble_climate_scheduler/bubble-climate-card.js"
PLATFORMS = ("sensor",)
STORAGE_KEY = "bubble_climate_scheduler.programs"

# Storage payload schema version; migrations live in schedule.DATA_MIGRATIONS,
# keyed by the version each step upgrades *from*.
STORAGE_VERSION = 1

# Config-entry schema version, shared between config_flow.ConfigFlow.VERSION
# and the async_migrate_entry hook. Bump it together with an entry-data
# migration so existing entries keep working.
CONFIG_ENTRY_VERSION = 1
