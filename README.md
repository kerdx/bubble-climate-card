<div align="center">

# Bubble Climate Card

### A focused climate control card with a persistent weekly schedule for Home Assistant.

[![Release](https://img.shields.io/github/v/release/kerdx/bubble-climate-card?label=release)](https://github.com/kerdx/bubble-climate-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Minimum Home Assistant version](https://img.shields.io/badge/Home%20Assistant-2025.1%2B-41BDF5)](https://www.home-assistant.io/)
[![Add repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=kerdx&repository=bubble-climate-card&category=integration)

</div>

`custom:bubble-climate-card` is a standalone Lovelace climate card with Bubble-inspired styling and an optional weekly temperature scheduler. Scheduling runs in the Home Assistant integration backend, so it continues when the dashboard is closed and after Home Assistant restarts.

> This is an independent project. It is not part of Bubble Card and does not depend on Bubble Card or Nodalia.

## Features

- Climate controls that follow the entity's available HVAC capabilities.
- A compact two-row layout with an HVAC mode dropdown.
- Weekly schedule editor opened from the calendar button.
- Backend persistence and execution, independent of an open dashboard.
- Visual card editor with a climate entity selector and entity suggestions.
- One temperature target per scheduled interval, with Home Assistant timezone support.
- A diagnostic schedule sensor and integration actions for managing programs.

## Installation

The repository is distributed as a HACS **custom repository**; it is not currently listed in the default HACS catalog.

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

For users who prefer YAML, the following optional configuration is an alternative to the visual editor:

```yaml
type: custom:bubble-climate-card
entity: climate.living_room
name: Living Room
icon: mdi:thermostat
layout: compact
show_state_chip: false
show_current_temperature_chip: true
show_humidity_chip: false
show_unavailable_badge: false
show_mode_buttons: true
show_step_controls: true
show_schedule_button: true
step: 0.5
```

The integration serves and registers the bundled frontend JavaScript. No manual resource, `schedule.*` helper, or webhook is required.

## Card options

| Option | Default | Description |
| --- | --- | --- |
| `entity` | — | Climate entity to control. Required. |
| `name` | Entity name | Optional card title. |
| `icon` | Entity icon | Optional icon override. |
| `layout` | `compact` | Card layout. |
| `show_state_chip` | `true` | Show the current HVAC mode chip. |
| `show_current_temperature_chip` | `true` | Show the measured temperature chip. |
| `show_humidity_chip` | `false` | Show the humidity chip when available. |
| `show_unavailable_badge` | `true` | Show an unavailable indicator when the entity is unavailable. |
| `show_mode_buttons` | `true` | Show an HVAC mode dropdown for modes exposed by the entity. |
| `show_step_controls` | `true` | Show controls to decrease or increase the target temperature. |
| `show_schedule_button` | `true` | Show the button that opens the weekly schedule editor. |
| `step` | `0.5` | Fallback temperature increment used only when the climate entity's `target_temp_step` is missing, `unknown`, `unavailable`, or null. A declared invalid step (zero, negative, or non-numeric) disables target controls rather than substituting an unsupported increment. A valid entity step always takes precedence; for example, an entity step of `1` is not treated as `0.5`. |

The card uses a fixed two-row layout: identity, optional chips, and calendar on the first row; target, temperature controls, and the HVAC mode dropdown on the second. Names, chips, and long targets (including `heat_cool` ranges) truncate on narrow cards rather than wrapping; full target text remains available through its accessible label and title. At exceptionally narrow widths, the second row scrolls horizontally so controls remain reachable; they are not necessarily all visible at once. Keyboard focus and input range controls are retained.

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

## Verification status

The project minimum is Home Assistant 2025.1; entity suggestions use Home Assistant's `getEntitySuggestion` API on Home Assistant 2026.6 and later. The `v0.1.2` verification checks are performed by the release coordinator: 21 Python unit tests and `compileall`. Node.js is unavailable, so JavaScript tests are not run. Live Home Assistant/browser behavior and the layout have not been visually verified. The schedule editor labels are currently in English.

## Support and releases

- [Report a bug or request a feature](https://github.com/kerdx/bubble-climate-card/issues)
- [Release v0.1.2](https://github.com/kerdx/bubble-climate-card/releases/tag/v0.1.2) · [Browse all releases](https://github.com/kerdx/bubble-climate-card/releases)
- [MIT license](LICENSE)
