<div align="center">

# Bubble Climate Card

### A polished climate control card with a persistent weekly schedule for Home Assistant.

[![Release](https://img.shields.io/github/v/release/kerdx/bubble-climate-card?label=release)](https://github.com/kerdx/bubble-climate-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Minimum Home Assistant version](https://img.shields.io/badge/Home%20Assistant-2025.1%2B-41BDF5)](https://www.home-assistant.io/)
[![Add repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=kerdx&repository=bubble-climate-card&category=integration)

</div>

---

**Bubble Climate Card** (`custom:bubble-climate-card`) is a standalone Lovelace climate card with Bubble-inspired pill styling and an optional weekly temperature scheduler. Scheduling runs in the Home Assistant integration backend: your programs keep running when the dashboard is closed — and after Home Assistant restarts.

> This is an independent project. It is not part of Bubble Card and does not depend on Bubble Card or Nodalia.

## Why you'll like it

| | |
| --- | --- |
| 🎨 **Bubble styling** | Rounded pill controls in a horizontal entity row that inherits your theme's colors — no dark-only palette, no hardcoded styles. |
| 📅 **Real weekly scheduling** | Build multi-slot programs per climate entity from the calendar button; the backend executes them independently of any open dashboard. |
| 🕒 **Timezone & DST aware** | Slots follow Home Assistant's timezone, intervals are computed as `[start, end)`, and daylight-saving transitions that change the active slot are handled. |
| ♿ **Accessible** | Labeled controls, visible focus rings, decorative icons hidden from assistive technology, and localized numbers and relative times. |
| 🧩 **Zero-setup frontend** | The integration registers the card's JavaScript automatically: no manual Lovelace resource, no YAML required, no `schedule.*` helper or webhook. |

## Features

- Climate controls that follow the entity's available HVAC capabilities.
- A horizontal entity-row layout by default, with the previous two-row layout still available as `compact`.
- Weekly schedule editor opened from the calendar button.
- Backend persistence and execution, independent of an open dashboard.
- Visual card editor with a climate entity selector and entity suggestions.
- One temperature target per scheduled interval, with Home Assistant timezone support.
- A diagnostic schedule sensor and integration actions for managing programs.
- Localized rendering: row numbers use `Intl.NumberFormat` and relative times use `Intl.RelativeTimeFormat` with `hass.locale.language` (for example `20,5 °C` and `43 secondi fa` in Italian), falling back to English labels when `Intl` is unavailable.

## Installation

The repository is distributed as a HACS **custom repository**; it is not currently listed in the default HACS catalog.

**Version note:** the current release is [`v0.1.5`](https://github.com/kerdx/bubble-climate-card/releases/tag/v0.1.5). HACS installs the latest release by default; to try `main`, use **Re-download → Need a different version? → main**.

### HACS

1. In HACS, open **⋮ → Custom repositories** and add [`https://github.com/kerdx/bubble-climate-card`](https://github.com/kerdx/bubble-climate-card) with category **Integration**.
2. Install **Bubble Climate Scheduler** and restart Home Assistant.
3. Go to **Settings → Devices & services → Add integration** and add **Bubble Climate Scheduler**.
4. Refresh or reopen the dashboard, then choose **Edit dashboard → Add card**. Search for and select **Bubble Climate Card**, choose a climate entity in the visual editor, and save.

The integration loads and registers the card's JavaScript module through Home Assistant's extra module URL. After integration setup, refresh the dashboard and choose **Edit dashboard → Add card → Bubble Climate Card**. Select the card and a climate entity in the visual editor, then save. Entity suggestions are available only on Home Assistant 2026.6 and later. The integration does not add a card to any dashboard automatically: you choose where to add it. No manual Lovelace resource or YAML configuration is required.

### Manual installation

1. Copy `custom_components/bubble_climate_scheduler` into `config/custom_components/`.
2. Restart Home Assistant, then add **Bubble Climate Scheduler** from **Settings → Devices & services → Add integration**.
3. Refresh or reopen the dashboard and add **Bubble Climate Card** from **Edit dashboard → Add card**. Select a climate entity in its visual editor.

### YAML alternative

For users who prefer YAML, the following optional configuration is an alternative to the visual editor:

```yaml
type: custom:bubble-climate-card
entity: climate.living_room
name: Living Room
icon: mdi:thermostat
layout: row
show_state_chip: false
show_current_temperature_chip: true
show_humidity_chip: false
show_unavailable_badge: false
show_step_controls: true
show_schedule_button: true
step: 0.5
```

`layout: compact` keeps the previous two-row card with the HVAC mode dropdown and temperature slider.

Migration note: in v0.1.3 the visual editor's config stub saved `layout: compact`, so cards created then may contain that key and keep the previous appearance (not every saved card is necessarily affected). To get the new horizontal row look in such configs, set `layout: row` or remove the `layout` key; new cards and assets without an explicit layout use `row`. The `compact` choice remains available.

The integration serves and registers the bundled frontend JavaScript. No manual resource, `schedule.*` helper, or webhook is required.

## Card options

| Option | Default | Description |
| --- | --- | --- |
| `entity` | — | Climate entity to control. Required. |
| `name` | Entity name | Optional card title. |
| `icon` | Entity icon | Optional icon override. |
| `layout` | `row` | Card layout: `row` (default horizontal entity row) or `compact` (previous two-row layout). Unknown values are rejected. |
| `show_state_chip` | `true` | Show the HVAC state and relative time in the row status line. Humidity is governed separately by `show_humidity_chip`. |
| `show_current_temperature_chip` | `true` | Show the measured temperature chip. |
| `show_humidity_chip` | `false` | Show the humidity in the row status line when available, even when `show_state_chip` is `false`. |
| `show_unavailable_badge` | `true` | Show an unavailable indicator when the entity is unavailable. |
| `show_mode_buttons` | `true` | Show an HVAC mode dropdown for modes exposed by the entity (`compact` layout only; in `row` there is no inline mode menu and modes are changed from the entity details opened by the setpoint). |
| `show_step_controls` | `true` | Show controls to decrease or increase the target temperature. |
| `show_schedule_button` | `true` | Show the button that opens the weekly schedule editor. |
| `step` | `0.5` | Fallback temperature increment used only when the climate entity's `target_temp_step` is missing, `unknown`, `unavailable`, or null. A declared invalid step (zero, negative, or non-numeric) disables target controls rather than substituting an unsupported increment. A valid entity step always takes precedence; for example, an entity step of `1` is not treated as `0.5`. |

## Layout anatomy

The default `row` layout shows a horizontal entity row: a circular climate icon on the left (accented while the state is anything other than `off`/`unavailable`/`unknown`, neutral otherwise), the entity name with a readable status line beneath it, the current-temperature chip when enabled, and a control cluster of **independent rounded pills** — decrease, target setpoint, increase, and the calendar button (hidden when `show_schedule_button` is `false`).

- The current-temperature chip pairs an `mdi:home-thermometer` house icon with the measured value in a text span; the chip carries `role="img"` with an accessible label while the house icon itself is decorative and hidden from assistive technology; the whole chip (icon included) is hidden when the option is off or the value is unavailable.
- The status line prefers `hvac_action` (for example heating/cooling/off) and uses Home Assistant formatting/localization when available, falling back to a readable label; it also appends humidity when `show_humidity_chip` is enabled (independently of `show_state_chip`, using the same locale number formatting as temperatures) and a short relative time from `last_changed`/`last_updated` when `show_state_chip` is enabled.
- The setpoint button opens the entity details (`hass-more-info`); minus/plus call `climate.set_temperature` through the existing step logic, and the calendar button opens the same weekly schedule editor.
- Names, status, and controls truncate without overflowing the card; on very narrow widths the control cluster is shrinkable with scrollable overflow, so it yields width instead of being clipped and the calendar button stays reachable.
- Colors follow the active Home Assistant theme; no dark-only palette is hardcoded.

The `compact` layout keeps the previous fixed two-row card: identity, optional chips, and calendar on the first row; target, temperature controls, and the HVAC mode dropdown on the second. Names, chips, and long targets (including `heat_cool` ranges) truncate on narrow cards rather than wrapping; full target text remains available through its accessible label and title. At exceptionally narrow widths, the second row scrolls horizontally so controls remain reachable; they are not necessarily all visible at once. Keyboard focus and input range controls are retained. In `row`, the HVAC mode dropdown is not rendered; modes remain changeable from the entity details opened by the setpoint, and `compact` keeps the inline dropdown.

## Weekly schedule

The calendar button opens a weekly editor. A saved program runs only when **Enabled** is selected. The backend owns schedule persistence and execution; the dashboard can be closed without interrupting it.

- One program is supported per climate entity; each program can contain multiple non-overlapping time slots, each with one target temperature.
- Days use ISO weekday numbers; times use `HH:MM` in Home Assistant's timezone. Intervals are `[start, end)`. An end time earlier than its start crosses midnight; overlapping intervals are rejected.
- Outside scheduled slots, the integration makes no climate call: it does not change the HVAC mode or turn the entity off.
- A manual target change during a slot is not reasserted every minute. The schedule resumes at the next slot.
- Unavailable climate entities remain pending and are retried when available. Targets must satisfy the entity's temperature limits and step; invalid targets are not silently rounded.
- Scheduling `heat_cool` is rejected. The backend uses `climate.set_temperature` only.
- Disabling or deleting a program does not restore a previous target.

The climate card's manual controls are separate from scheduling and should respect the HVAC capabilities exposed by the entity. The integration also exposes a diagnostic schedule sensor and the actions `bubble_climate_scheduler.save_program`, `bubble_climate_scheduler.set_enabled`, and `bubble_climate_scheduler.delete_program`.

## Quality & verification

- Every release passes **27 JavaScript tests** (`npm test`) and **21 Python unit tests**, including DST transition case coverage.
- The project minimum is Home Assistant 2025.1; entity suggestions use Home Assistant's `getEntitySuggestion` API on Home Assistant 2026.6 and later.
- No Home Assistant/browser visual verification has been performed; the schedule editor labels are currently in English.

## Support and releases

- [Report a bug or request a feature](https://github.com/kerdx/bubble-climate-card/issues)
- [Latest published release](https://github.com/kerdx/bubble-climate-card/releases/latest) · [Browse all releases](https://github.com/kerdx/bubble-climate-card/releases)
- [MIT license](LICENSE)
