# Changelog

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
