# Changelog

## v0.2.1

- Ship the card as a single source file (`www/bubble-climate-card.js`): JavaScript tests and packaging checks read the shipped asset, and any duplicate copy of the source fails packaging.
- Migrate instead of discarding on version mismatch: storage payloads move through registered schema steps (`migrate_storage_data`) or are dropped with an explicit warning, and a config-entry `async_migrate_entry` rejects entries saved by newer releases.
- Backend errors now carry machine-readable codes (`{code, context, message}`) in `last_error` and the diagnostic sensor; the card translates them in English and Italian with the new `errorLabel` helper.
- Service-call errors are localized through the integration `exceptions` translations (EN/IT) plus translation metadata on `ScheduleValidationError`; the readable English message stays as fallback on releases without exception translation.
- The visual editor groups options into localized sections (identity, visible elements, advanced controls) with per-field help texts and an inert live preview of the edited config.
- CI runs the card and backend test suites alongside hassfest/HACS validation, and a manual release workflow gates on manifest/CHANGELOG consistency; packaging tests keep manifest version and CHANGELOG in sync.

## v0.2.0

- Add an optional HVAC mode to a saved program: the scheduler applies `climate.set_hvac_mode` before the slot target, validates the mode against the entity's exposed `hvac_modes`, and leaves the current mode untouched when none is set. Schedulable program modes are `off`, `heat`, `cool`, `auto`, `dry`, and `fan_only`; `heat_cool` stays unsupported because a program uses a single target, and `off` sets the mode without a target.
- Add an optional outside-schedule temperature (`away_temperature`) applied whenever no slot is active; programs without it keep the previous behavior of no climate call outside slots. The outside target is validated together with the slot targets against the entity's limits and step.
- Track the applied program state by mode plus target kind, so a manual mode or target change still stands until the next slot boundary (including the outside-schedule target); availability handling treats mode-only and outside-target programs as active for pending retries.
- Extend the `save_program` service with the optional `away_temperature` and `hvac_mode` fields and document them in `services.yaml`.
- Extend the weekly schedule editor with an HVAC mode selector (default "Don't change", limited to the modes the entity exposes and the backend accepts) and an "Outside schedule" temperature field; both are validated in the editor and saved with the program.
- Localize the card and its schedule editor in English and Italian, following `hass.locale.language` with an English fallback: control aria labels, editor labels and actions, day names, HVAC mode and status labels, and validation messages.
- Retry mode validation when a climate entity advertises an updated `hvac_modes` list; preserve keyboard focus after optimistic +/- updates and use distinct two-letter weekday pills.
- Honor an explicit card `step` as an override: a `step` set in the card configuration now takes precedence over the entity's `target_temp_step` (previously the entity step always won); new card presets omit `step` so the entity's increment is respected by default, with 0.5 as fallback.
- Tint the schedule calendar button with the accent color while the entity's program is enabled, in both card layouts (`bubble` and `compact`); the tint follows the program's enabled state on the card button only and is not applied inside the schedule editor dialog.
- Add backend and frontend tests for the new program fields, the step override, and the localized strings.

## v0.1.9

- Toggle between `heat` and `off` by tapping a non-interactive card area or pressing Enter/Space, only when both modes are supported; child controls do not trigger the toggle.
- Show the requested target optimistically immediately when using +/- controls in `bubble` and `compact` layouts, then reconcile with Home Assistant or roll back on error/timeout.
- Send compact slider targets when the change is committed.
- No backend changes.

## v0.1.8

- Rename the default horizontal layout to `bubble`; the legacy `row` value remains supported as an alias, and `compact` is unchanged.
- Show the calendar button by default as a standalone pill, separate from the temperature control group; set `show_schedule_button: false` to hide it. Existing configurations that explicitly saved `false` continue to hide it and must be changed explicitly to show the button.
- No backend changes.

## v0.1.7

- Refine the `row` layout to more faithfully match the reference screenshot, with decrease, target setpoint, and increase grouped in one control pill and consistent spacing before temperature units.
- Improve narrow-width navigation and horizontal overflow handling so controls remain reachable without overflowing the card.
- Hide the calendar button by default; it remains available as an opt-in with `show_schedule_button: true`. Preserve the existing `compact` layout.
- No backend changes.

## v0.1.6

- Match the referenced card screenshot: the row current-temperature chip is tinted with the accent color while the climate entity is active (icon follows the text color), and the target setpoint renders as borderless text between the minus and plus pills.
- Keep minus, plus, and the calendar button as independent rounded pills.
- Redesign the weekly schedule editor dialog with a premium look: sticky header with accent calendar icon, entity subtitle, and close button; a status pill with next change and active slot; a toggle switch for Enabled; rounded slot cards with uppercase titles and a remove action; accent-filled single-letter day pills; bordered time/target fields; and a Save/Delete action bar. The dialog carries its own styles instead of duplicating them in both card layouts.

## v0.1.5

- Restyle the `row` layout control cluster to match the Bubble Card look: decrease, target setpoint, increase, and the schedule calendar button are now independent rounded pills with a gap instead of one fused background bar.
- Emphasize the row current-temperature chip with a pill background and semibold text; its house icon stays secondary-colored and hidden from assistive technology.
- Controls keep theme-driven colors (`--secondary-background-color`, `--divider-color`) and the existing shrink/scroll behavior on narrow cards; the calendar button remains reachable.
- No backend, manifest behavior, or card option changes.

## v0.1.4

- Make the horizontal entity-row climate layout the default (`layout: row`): circular status-aware icon, name plus live `hvac_action`/state status with relative time, current-temperature chip, and a control cluster with decrease, setpoint, increase, and the schedule calendar button.
- Keep `layout: compact` as the previous two-row card with HVAC mode dropdown and slider; reject unknown layouts. The visual editor exposes `row`/`compact` in a layout dropdown.
- Show an `mdi:home-thermometer` house icon inside the row current-temperature chip (text stays in a span with an accessible label); the icon hides together with the chip when disabled or unavailable.
- Localize the row relative time with `Intl.RelativeTimeFormat(hass.locale.language, { numeric: 'auto' })` and a short-English fallback, and localize row current/target numbers with `Intl.NumberFormat(hass.locale.language, { maximumFractionDigits: 2 })`; `compact` rendering is unchanged.
- Keep the row control cluster shrinkable (`flex: 0 1 auto` with `min-width: 0`) so it scrolls within the available width instead of being clipped, keeping the calendar button reachable.
- Show row humidity whenever `show_humidity_chip` is enabled, even with `show_state_chip: false`; state and relative time remain governed by `show_state_chip`. Row humidity numbers use the same locale formatting as temperatures.
- Mark the row current-temperature chip with `role="img"` (keeping its accessible label) and hide the decorative climate icon from assistive technology.
- Migration: v0.1.3 editor configs may contain a saved `layout: compact` key; set `layout: row` or remove the key for the new look, or keep `compact` for the previous layout.
- No backend, manifest, or version changes; the scheduler editor and HA registry re-registration behavior are unchanged.

## v0.1.3

- Re-register the card and editor in the active `customElements` registry once the Home Assistant frontend is ready, verifying both tags in the live registry with bounded retries; keep the `customCards` picker entry independent of element registration. A deterministic `define()` failure during the poll is reported once and stops polling instead of escaping uncaught from the timer.

## v0.1.2

- Introduce a compact, fixed two-row premium layout.
- Use a 0.5°C temperature step fallback; the climate entity's `target_temp_step` takes precedence when declared.
- Replace potentially overflowing HVAC mode buttons with an HVAC mode dropdown.

## v0.1.1

- Add a visual card editor for choosing a climate entity.
- Load and register the card frontend through the integration, enabling it to appear in the dashboard card picker without a manually configured resource.
- Document the HACS and manual installation flows.
