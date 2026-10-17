<div align="center">

# Bubble Climate Card

### A climate card with Bubble-inspired pill styling and a persistent weekly schedule for Home Assistant.

[![Release](https://img.shields.io/github/v/release/kerdx/bubble-climate-card?label=release)](https://github.com/kerdx/bubble-climate-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Minimum Home Assistant version](https://img.shields.io/badge/Home%20Assistant-2025.1%2B-41BDF5)](https://www.home-assistant.io/)
[![Add repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=kerdx&repository=bubble-climate-card&category=integration)

</div>

---

**Bubble Climate Card** (`custom:bubble-climate-card`) is a standalone Lovelace climate card with an optional weekly temperature scheduler. Programs run in the integration backend, so they keep working with the dashboard closed and after a Home Assistant restart.

> Independent project: it is not part of Bubble Card and does not depend on Bubble Card or Nodalia.

## Features

- **Pill layout** — horizontal `bubble` layout by default (`row` remains a supported alias), with the previous two-row card available as `layout: compact`. Colors come from your theme.
- **Weekly schedule** — multi-slot programs per climate entity, edited from the calendar button and executed by the backend, with an optional HVAC mode per program (heating or cooling).
- **Outside-schedule temperature** — optional target applied outside the configured slots.
- **Timezone & DST aware** — `[start, end)` intervals in Home Assistant's timezone.
- **Zero-setup frontend** — the integration serves and registers the card's JavaScript; no Lovelace resource, YAML, `schedule.*` helper or webhook.
- **English & Italian UI** — the card and its schedule editor follow Home Assistant's language (English fallback), with localized relative times and localized numbers in the `bubble` (`row` alias) layout (the `compact` layout renders raw values), labeled controls and visible focus rings.

## Installation

Distributed as a HACS **custom repository**; it is not currently listed in the default HACS catalog.

### HACS

1. **⋮ → Custom repositories** → add `https://github.com/kerdx/bubble-climate-card` with category **Integration**.
2. Install **Bubble Climate Scheduler** and restart Home Assistant.
3. **Settings → Devices & services → Add integration** → **Bubble Climate Scheduler**.
4. Refresh the dashboard, then **Edit dashboard → Add card → Bubble Climate Card** and pick a climate entity.

HACS installs the latest release by default; to try `main`, use **Re-download → Need a different version? → main**.

### Manual

1. Copy `custom_components/bubble_climate_scheduler` into `config/custom_components/`.
2. Restart Home Assistant and add **Bubble Climate Scheduler** from **Settings → Devices & services → Add integration**.
3. Refresh the dashboard and add **Bubble Climate Card** from **Edit dashboard → Add card**.

The integration registers the card's JavaScript automatically: no manual resource, `schedule.*` helper or webhook is required. Entity suggestions use Home Assistant's `getEntitySuggestion` API on Home Assistant 2026.6 and later.

### YAML

```yaml
type: custom:bubble-climate-card
entity: climate.living_room
name: Living Room
layout: bubble
step: 0.5
```

`layout: row` remains supported as an alias for `bubble`. Cards saved by the v0.1.3 editor may contain `layout: compact`; set `layout: bubble` (or remove the key) for the horizontal layout.

## Card options

| Option | Default | Description |
| --- | --- | --- |
| `entity` | — | Climate entity. Required. |
| `name` | Entity name | Card title. |
| `icon` | Entity icon | Icon override. |
| `layout` | `bubble` | `bubble` (horizontal entity row; legacy `row` is an alias) or `compact` (previous two-row card). Unknown values are rejected. |
| `show_state_chip` | `true` | HVAC state and relative time in the row status line. |
| `show_current_temperature_chip` | `true` | Measured-temperature chip. |
| `show_humidity_chip` | `false` | Humidity in the status line when available (independent of `show_state_chip`). |
| `show_unavailable_badge` | `true` | Unavailable indicator. |
| `show_mode_buttons` | `true` | HVAC mode dropdown (`compact` only; in `bubble`, change modes from the entity details opened by the setpoint). |
| `show_step_controls` | `true` | Decrease / increase target controls. |
| `show_schedule_button` | `true` | Standalone calendar pill that opens the weekly editor; set to `false` to hide it. Existing cards that explicitly saved `false` continue to hide it. |
| `step` | `0.5` fallback | Temperature increment. An explicitly configured `step` wins over the entity's `target_temp_step` (use `0.5` on an entity that declares `1`); otherwise the entity step is used, with `0.5` as fallback if missing. New card presets omit `step`. Existing configs that saved a preset `step: 0.5` now explicitly override the entity; remove `step` to follow `target_temp_step`. Without an override, an invalid declared entity step disables target controls. |

## Layouts

- **`bubble`** (default; `row` is an alias): circular status icon, name and status line, current-temperature chip, and a grouped pill for decrease, setpoint, and increase. The calendar is a separate pill, accent-colored while its schedule program is enabled.
- **`compact`**: the previous two-row card (identity, chips and calendar, then target, slider and HVAC mode dropdown).

In either layout, tap an unused card area to toggle between `heat` and `off` when both modes are supported; Enter/Space works when the card is focused. Interactive child controls do not trigger the toggle. The target display updates immediately after using +/- and reverts if Home Assistant does not confirm the target or the service fails. The compact slider sends its target when the change is committed, not continuously while dragging.

## Weekly schedule

A saved program runs only when **Enabled**; the backend owns persistence and execution. Each climate entity has one program with:

- **Slots** — non-overlapping intervals, each with one target temperature.
- **Mode** (optional) — the HVAC mode set while the program is enabled (`set_hvac_mode`, applied before the target). Use it to schedule heating in winter and cooling in summer; with no mode selected the integration never changes the mode.
- **Outside schedule** (optional) — the target applied outside every slot.

Rules:

- Days are ISO weekdays; times are `HH:MM` in Home Assistant's timezone. Intervals are `[start, end)`; an end earlier than the start crosses midnight.
- Outside a slot, no **target temperature** call is made unless **Outside schedule** is configured (then it is applied once); with **Mode** configured, `set_hvac_mode` is still sent outside the slots.
- A manual change (mode or target) is not reasserted until the next slot boundary.
- Unavailable entities stay pending and are retried; targets must satisfy the entity's limits and step (no silent rounding).
- A program blocked because the entity does not expose the configured **Mode** is retried when the entity reports a new mode list (`hvac_modes`), a changed range or step, or a `heat_cool` transition.
- `heat_cool` is rejected (a program uses a single target); `off` sets the mode without a target.

### Actions

- `bubble_climate_scheduler.save_program` — `climate_entity`, `enabled`, `slots`, optional `away_temperature`, optional `hvac_mode`.
- `bubble_climate_scheduler.set_enabled` — `climate_entity`, `enabled`.
- `bubble_climate_scheduler.delete_program` — `climate_entity`.

```yaml
service: bubble_climate_scheduler.save_program
data:
  climate_entity: climate.living_room
  enabled: true
  hvac_mode: cool
  away_temperature: 17
  slots:
    - id: weekday-morning
      days: [1, 2, 3, 4, 5]
      start: "06:30"
      end: "08:00"
      temperature: 21
```

A diagnostic sensor exposes the configured programs.

## Quality

- **48 JavaScript tests** (`npm test`) and **40 Python unit tests**, including DST transition coverage.
- Minimum Home Assistant version: 2025.1.
- Card UI languages: English and Italian, chosen from `hass.locale.language` (other languages fall back to English).
- No Home Assistant/browser visual verification has been performed.

## Links

- [Report a bug or request a feature](https://github.com/kerdx/bubble-climate-card/issues)
- [Releases](https://github.com/kerdx/bubble-climate-card/releases) · [MIT license](LICENSE)
