# Changelog

## v0.1.2 (Unreleased)

- Introduce a compact, fixed two-row premium layout.
- Use a 0.5°C temperature step fallback; the climate entity's `target_temp_step` takes precedence when declared.
- Replace potentially overflowing HVAC mode buttons with an HVAC mode dropdown.

## v0.1.1

- Add a visual card editor for choosing a climate entity.
- Load and register the card frontend through the integration, enabling it to appear in the dashboard card picker without a manually configured resource.
- Document the HACS and manual installation flows.
