import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BubbleClimateCard, BubbleClimateCardEditor, BUBBLE_CLIMATE_CARD_TAG, BUBBLE_CLIMATE_CARD_EDITOR_TAG, registerBubbleClimateElements, isBubbleClimateElementsRegistered, isHomeAssistantFrontendReady, scheduleBubbleClimateReregistration, clampTarget, temperaturePayload, targetModel, hvacToggleMode, scheduleDraft, validateScheduleDraft, defaultCardConfig, configSchema, getEntitySuggestion, effectiveStep, normalizeLayout, isClimateActive, climateStatusKey, statusLabel, pickEntityTimestamp, formatRelativeTime, formatNumber, rowStatusParts, currentTemperatureDisplay } from './bubble-climate-card.js';

test('module imports without browser DOM and exports the card class', () => {
  assert.equal(typeof BubbleClimateCard, 'function');
  assert.equal(typeof clampTarget, 'function');
});

test('row status and temperatures preserve readable separators and spacing', () => {
  assert.deepEqual(rowStatusParts({ statusText: 'Off', relativeText: '1 hour ago' }), ['Off', '1 hour ago']);
  assert.equal(currentTemperatureDisplay(20.5, '°C', 'it-IT'), '20,5 °C');
  const source = readFileSync(new URL('./bubble-climate-card.js', import.meta.url), 'utf8');
  assert.match(source, /\.status-line span\+span:before\{content:' · '/);
  assert.match(source, /overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain/);
  assert.match(source, /\.meta\{flex:1 1 0;min-width:0/);
});

test('editor schema exposes climate entity and all supported visual options', () => {
  assert.deepEqual(configSchema[0].selector.entity, { filter: { domain: ['climate'] } });
  const fields = configSchema.map((field) => field.name);
  for (const name of ['entity', 'name', 'icon', 'layout', 'step', 'show_state_chip', 'show_current_temperature_chip', 'show_humidity_chip', 'show_unavailable_badge', 'show_mode_buttons', 'show_step_controls', 'show_schedule_button']) assert.ok(fields.includes(name));
  assert.deepEqual(configSchema.find((field) => field.name === 'layout').selector, { select: { mode: 'dropdown', options: ['bubble', 'compact'] } });
  assert.deepEqual(defaultCardConfig('climate.living_room'), {
    entity: 'climate.living_room', layout: 'bubble', step: 0.5,
    show_state_chip: true, show_current_temperature_chip: true, show_humidity_chip: false,
      show_unavailable_badge: true, show_mode_buttons: true, show_step_controls: true, show_schedule_button: true,
  });
  assert.equal(typeof BubbleClimateCard.getStubConfig, 'function');
  assert.equal(typeof BubbleClimateCard.getConfigElement, 'function');
});

test('entity suggestion targets climate entities only and includes card type and defaults', () => {
  assert.deepEqual(getEntitySuggestion({}, 'climate.living_room'), {
    type: 'custom:bubble-climate-card', ...defaultCardConfig('climate.living_room'),
  });
  assert.equal(getEntitySuggestion({}, 'light.living_room'), null);
  assert.deepEqual(BubbleClimateCard.getStubConfig({ states: {} }), defaultCardConfig('climate.example'));
  assert.equal(Object.hasOwn(BubbleClimateCard.getStubConfig({ states: {} }), 'type'), false);
});

test('target is bounded and rounded to entity step', () => {
  const entity = { attributes: { min_temp: 7, max_temp: 30, target_temp_step: 0.5 } };
  assert.equal(clampTarget(19.26, entity), 19.5);
  assert.equal(clampTarget(21, entity), 21);
  assert.equal(clampTarget(40, entity), 30);
  assert.equal(clampTarget(10, { attributes: { min_temp: 0, max_temp: 10, target_temp_step: 4 } }), 8);
  assert.equal(clampTarget(10, { attributes: { min_temp: 0, max_temp: 9.9999999995, target_temp_step: 10 } }), 0);
  assert.equal(clampTarget(0.3, { attributes: { min_temp: 0.1, max_temp: 0.3, target_temp_step: 0.1 } }), 0.3);
  assert.equal(clampTarget(1, { attributes: { min_temp: 0, max_temp: 10, target_temp_step: 1e-320 } }), null);
  assert.equal(clampTarget(0, { attributes: { min_temp: 5, max_temp: 10, target_temp_step: 4 } }), 5);
  assert.equal(clampTarget(-5, { attributes: { min_temp: 5, max_temp: 10, target_temp_step: 4 } }), 5);
  assert.equal(clampTarget('bad', entity), null);
  assert.equal(clampTarget(null, entity), null);
  assert.equal(clampTarget(20, { attributes: { min_temp: null, max_temp: 30, target_temp_step: 0.5 } }), null);
  assert.equal(clampTarget(20, { attributes: { min_temp: 5, max_temp: 30, target_temp_step: 0 } }), null);
});

test('effective step prefers a valid entity step and otherwise uses fallback', () => {
  assert.equal(effectiveStep({ attributes: { target_temp_step: 0.5 } }), 0.5);
  assert.equal(effectiveStep({ attributes: { target_temp_step: 1 } }, 0.5), 1);
  assert.equal(effectiveStep({ attributes: {} }), 0.5);
  assert.equal(effectiveStep({ attributes: { target_temp_step: null } }, 0.25), 0.25);
  assert.equal(effectiveStep({ attributes: { target_temp_step: 'unavailable' } }, 0.25), 0.25);
  assert.equal(effectiveStep({ attributes: { target_temp_step: 0 } }, 0.25), null);
  assert.equal(effectiveStep({ attributes: { target_temp_step: -1 } }, 0.25), null);
  assert.equal(effectiveStep({ attributes: { target_temp_step: 'invalid' } }, 0.25), null);
  assert.equal(clampTarget(21.4, { attributes: { min_temp: 10, max_temp: 30, target_temp_step: 0 } }, 0.5), null);
  assert.equal(temperaturePayload({ state: 'heat', attributes: { min_temp: 10, max_temp: 30, temperature: 21, target_temp_step: 'invalid' } }, 21, 0.5), null);
  assert.equal(clampTarget(21.4, { attributes: { min_temp: 10, max_temp: 30, target_temp_step: 1 } }, 0.5), 21);
  assert.equal(clampTarget(21.4, { attributes: { min_temp: 10, max_temp: 30 } }, 0.5), 21.5);
});

test('heat_cool model and payload use dual targets and preserve their gap', () => {
  const entity = { state: 'heat_cool', attributes: { min_temp: 5, max_temp: 35, target_temp_step: 0.5, target_temp_low: 18, target_temp_high: 22.5 } };
  assert.deepEqual(targetModel(entity), { dual: true, low: 18, high: 22.5, value: 20.25, min: 5, max: 35, available: true, controllable: true, sliderMin: 7.25, sliderMax: 32.75 });
  assert.deepEqual(temperaturePayload(entity, 20.75, 0.5), { target_temp_low: 18.5, target_temp_high: 23 });
  assert.deepEqual(temperaturePayload(entity, 34, 0.5), { target_temp_low: 30.5, target_temp_high: 35 });
  assert.equal(temperaturePayload({ ...entity, state: 'unavailable' }, 21, 0.5), null);
  assert.equal(temperaturePayload({ ...entity, attributes: { ...entity.attributes, target_temp_low: null } }, 21, 0.5), null);
  assert.equal(temperaturePayload({ ...entity, attributes: { ...entity.attributes, target_temp_high: 17 } }, 21, 0.5), null);
  const invalidBounds = { state: 'heat_cool', attributes: { min_temp: 5, max_temp: 10, target_temp_step: 0.5, target_temp_low: 4, target_temp_high: 10 } };
  assert.equal(temperaturePayload(invalidBounds, 7, 0.5), null);
});

test('single target payload uses standard temperature field', () => {
  assert.deepEqual(temperaturePayload({ state: 'heat', attributes: { min_temp: 10, max_temp: 30 } }, 21, 1), { temperature: 21 });
});

test('zero is a valid single target', () => {
  const entity = { state: 'heat', attributes: { min_temp: 0, max_temp: 10, target_temp_step: 1, temperature: 0 } };
  assert.equal(targetModel(entity).available, true);
  assert.deepEqual(temperaturePayload(entity, 0, 1), { temperature: 0 });
});

test('missing or unavailable climate state cannot produce a service payload', () => {
  const attrs = { min_temp: 5, max_temp: 30, temperature: 20 };
  assert.equal(temperaturePayload({ attributes: attrs }, 21, 0.5), null);
  assert.equal(targetModel({ state: 'unavailable', attributes: attrs }).available, false);
});

test('known target remains readable without numeric limits but is not controllable', () => {
  const model = targetModel({ state: 'heat', attributes: { temperature: 21.5, min_temp: null, max_temp: null } });
  assert.equal(model.available, true);
  assert.equal(model.value, 21.5);
  assert.equal(model.controllable, false);
  assert.equal(model.sliderMin, null);
});

test('schedule draft conversion and validation', () => {
  assert.deepEqual(scheduleDraft({ enabled: true, slots: [{ id: 'a', days: [1, 8, 2], start: '07:30', end: '08:00', temperature: 20 }] }), {
    enabled: true, slots: [{ id: 'a', days: [1, 2], start: '07:30', end: '08:00', temperature: 20 }],
  });
  const draft = scheduleDraft({ slots: [{ id: 'a', days: [1], start: '07:30', end: '08:00', temperature: 20 }] });
  assert.equal(validateScheduleDraft(draft), null);
  assert.match(validateScheduleDraft({ ...draft, enabled: 'true' }), /Invalid schedule/);
  assert.match(validateScheduleDraft({ enabled: true, slots: [] }), /needs at least one slot/);
  assert.equal(validateScheduleDraft({ enabled: false, slots: [] }), null);
  assert.match(validateScheduleDraft({ enabled: false, slots: [{ ...draft.slots[0], end: '07:30' }] }), /start and end/);
  assert.ok(validateScheduleDraft({ slots: [{ ...draft.slots[0], temperature: '' }] }));
});

test('bubble is the default layout and row remains a legacy alias', () => {
  assert.equal(normalizeLayout(undefined), 'bubble');
  assert.equal(normalizeLayout(null), 'bubble');
  assert.equal(normalizeLayout(''), 'bubble');
  assert.equal(normalizeLayout('row'), 'bubble');
  assert.equal(normalizeLayout('bubble'), 'bubble');
  assert.equal(normalizeLayout('compact'), 'compact');
  assert.equal(normalizeLayout('tall'), null);
  assert.equal(defaultCardConfig('climate.living_room').layout, 'bubble');
  assert.equal(BubbleClimateCard.getStubConfig({ states: {} }).layout, 'bubble');
  assert.equal(getEntitySuggestion({}, 'climate.living_room').layout, 'bubble');
});

test('bubble schedule pill is a sibling of temperature controls in markup', () => {
  const source = readFileSync(new URL('./bubble-climate-card.js', import.meta.url), 'utf8');
  const bubbleSection = source.slice(source.indexOf('  _renderRow() {'), source.indexOf('  _renderCompact() {'));
  assert.match(bubbleSection, /<div class="controls"><\/div><button class="schedule"/);
  assert.doesNotMatch(bubbleSection, /controls\.append\(schedule\)/);
});

test('climate active state distinguishes running modes from off and unavailable', () => {
  assert.equal(isClimateActive({ state: 'heat' }), true);
  assert.equal(isClimateActive({ state: 'cool' }), true);
  assert.equal(isClimateActive('heat'), true);
  assert.equal(isClimateActive({ state: 'off' }), false);
  assert.equal(isClimateActive({ state: 'unavailable' }), false);
  assert.equal(isClimateActive({ state: 'unknown' }), false);
  assert.equal(isClimateActive({}), false);
  assert.equal(isClimateActive(null), false);
});

test('status key prefers hvac_action and labels stay readable', () => {
  assert.equal(climateStatusKey({ state: 'heat', attributes: { hvac_action: 'heating' } }), 'heating');
  assert.equal(climateStatusKey({ state: 'heat', attributes: {} }), 'heat');
  assert.equal(climateStatusKey({ state: 'off', attributes: { hvac_action: 'off' } }), 'off');
  assert.equal(statusLabel('heating'), 'Heating');
  assert.equal(statusLabel('cooling'), 'Cooling');
  assert.equal(statusLabel('off'), 'Off');
  assert.equal(statusLabel('heat_cool'), 'Heat / cool');
  assert.equal(statusLabel('custom_mode'), 'Custom mode');
  assert.equal(statusLabel(''), '');
  assert.equal(statusLabel(null), '');
});

test('relative time uses last change before last update and stays short', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  assert.equal(formatRelativeTime('2026-10-12T11:59:40Z', now), 'just now');
  assert.equal(formatRelativeTime('2026-10-12T11:55:00Z', now), '5 min ago');
  assert.equal(formatRelativeTime('2026-10-12T10:00:00Z', now), '2 h ago');
  assert.equal(formatRelativeTime('2026-10-09T12:00:00Z', now), '3 d ago');
  assert.equal(formatRelativeTime('not-a-date', now), '');
  assert.equal(formatRelativeTime(null, now), '');
  assert.equal(pickEntityTimestamp({ last_changed: '2026-10-12T11:00:00Z', last_updated: '2026-10-12T11:59:00Z' }), '2026-10-12T11:00:00Z');
  assert.equal(pickEntityTimestamp({ last_updated: '2026-10-12T11:59:00Z' }), '2026-10-12T11:59:00Z');
  assert.equal(pickEntityTimestamp({ last_changed: 'bad', last_updated: 'also-bad' }), null);
  assert.equal(pickEntityTimestamp({}), null);
});

test('relative time localizes with hass locale through Intl', (t) => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  const RealRtf = globalThis.Intl.RelativeTimeFormat;
  const seen = [];
  class FakeRtf {
    constructor(locale, options) { seen.push([locale, options]); }
    format(value, unit) {
      const abs = Math.abs(value);
      if (value === 0 && unit === 'second') return 'ora';
      if (unit === 'second') return `${abs} secondi fa`;
      if (unit === 'minute') return abs === 1 ? '1 minuto fa' : `${abs} minuti fa`;
      if (unit === 'hour') return abs === 1 ? '1 ora fa' : `${abs} ore fa`;
      return abs === 1 ? '1 giorno fa' : `${abs} giorni fa`;
    }
  }
  globalThis.Intl.RelativeTimeFormat = FakeRtf;
  t.after(() => { globalThis.Intl.RelativeTimeFormat = RealRtf; });
  assert.equal(formatRelativeTime('2026-10-12T11:59:17Z', now, 'it-IT'), '43 secondi fa');
  assert.equal(formatRelativeTime('2026-10-12T11:59:00Z', now, 'it-IT'), '1 minuto fa');
  assert.equal(formatRelativeTime('2026-10-12T10:00:00Z', now, 'it-IT'), '2 ore fa');
  assert.equal(formatRelativeTime('2026-10-09T12:00:00Z', now, 'it-IT'), '3 giorni fa');
  assert.equal(formatRelativeTime('2026-10-12T11:59:58Z', now, 'it-IT'), 'ora');
  assert.equal(formatRelativeTime('not-a-date', now, 'it-IT'), '');
  assert.equal(formatRelativeTime(null, now, 'it-IT'), '');
  assert.ok(seen.length >= 5);
  for (const [locale, options] of seen) {
    assert.equal(locale, 'it-IT');
    assert.deepEqual(options, { numeric: 'auto' });
  }
});

test('relative time falls back to short English without locale or Intl', (t) => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  assert.equal(formatRelativeTime('2026-10-12T11:59:17Z', now, ''), 'just now');
  assert.equal(formatRelativeTime('2026-10-12T11:59:17Z', now), 'just now');
  const RealIntl = globalThis.Intl;
  globalThis.Intl = undefined;
  t.after(() => { globalThis.Intl = RealIntl; });
  assert.equal(formatRelativeTime('2026-10-12T11:59:17Z', now, 'it-IT'), 'just now');
  assert.equal(formatRelativeTime('2026-10-12T11:55:00Z', now, 'it-IT'), '5 min ago');
  assert.equal(formatRelativeTime('2026-10-12T10:00:00Z', now, 'it-IT'), '2 h ago');
  assert.equal(formatRelativeTime('2026-10-09T12:00:00Z', now, 'it-IT'), '3 d ago');
});

test('row numbers localize with hass locale while compact keeps raw output', (t) => {
  assert.equal(formatNumber(20.5), '20.5');
  assert.equal(formatNumber(20), '20');
  assert.equal(formatNumber('20.5'), '20.5');
  assert.equal(formatNumber(null), '');
  assert.equal(formatNumber('unknown'), '');
  const RealNf = globalThis.Intl.NumberFormat;
  const seen = [];
  class FakeNf {
    constructor(locale, options) { seen.push([locale, options]); this.locale = locale; }
    format(n) {
      if (this.locale === 'it-IT') return String(n).replace('.', ',');
      return String(n);
    }
  }
  globalThis.Intl.NumberFormat = FakeNf;
  t.after(() => { globalThis.Intl.NumberFormat = RealNf; });
  assert.equal(formatNumber(20.5, 'it-IT'), '20,5');
  assert.equal(formatNumber(20.25, 'it-IT'), '20,25');
  assert.equal(formatNumber(20.5, 'en'), '20.5');
  assert.ok(seen.some(([locale, options]) => locale === 'it-IT' && options?.maximumFractionDigits === 2));
});

test('row status parts keep humidity independent of the state chip', (t) => {
  assert.deepEqual(
    rowStatusParts({ statusText: 'Heating', humidityValue: 55, relativeText: '2 h ago', showStateChip: true, showHumidityChip: true }),
    ['Heating', '55%', '2 h ago'],
  );
  assert.deepEqual(
    rowStatusParts({ statusText: 'Heating', humidityValue: 55, relativeText: '2 h ago', showStateChip: false, showHumidityChip: true }),
    ['55%'],
  );
  assert.deepEqual(
    rowStatusParts({ statusText: 'Heating', humidityValue: 55, relativeText: '2 h ago', showStateChip: false, showHumidityChip: false }),
    [],
  );
  assert.deepEqual(
    rowStatusParts({ statusText: '', humidityValue: null, relativeText: '', showStateChip: true, showHumidityChip: true }),
    [],
  );
  assert.deepEqual(
    rowStatusParts({ statusText: 'Heating', humidityValue: null, relativeText: '2 h ago', showStateChip: true, showHumidityChip: true }),
    ['Heating', '2 h ago'],
  );
  const RealNf = globalThis.Intl.NumberFormat;
  class FakeNf {
    constructor(locale) { this.locale = locale; }
    format(n) {
      if (this.locale === 'it-IT') return String(n).replace('.', ',');
      return String(n);
    }
  }
  globalThis.Intl.NumberFormat = FakeNf;
  t.after(() => { globalThis.Intl.NumberFormat = RealNf; });
  assert.deepEqual(
    rowStatusParts({ statusText: 'Heating', humidityValue: 20.5, relativeText: '', showStateChip: false, showHumidityChip: true, locale: 'it-IT' }),
    ['20,5%'],
  );
});

test('row shadow CSS scopes a hidden rule to .row (static presence check, no rendering)', () => {
  // No DOM available here, so verify the row shadow CSS statically: an
  // explicit `.row [hidden]` rule must beat the author `.current`/`.controls`
  // display declarations (which otherwise override the UA `[hidden] none`).
  const source = readFileSync(new URL('./bubble-climate-card.js', import.meta.url), 'utf8');
  const rowStart = source.indexOf('  _renderRow() {');
  const compactStart = source.indexOf('  _renderCompact() {');
  assert.ok(rowStart !== -1 && compactStart !== -1 && rowStart < compactStart);
  const rowSection = source.slice(rowStart, compactStart);
  assert.match(rowSection, /\.row\s*\[hidden\][^{]*\{[^}]*display\s*:\s*none\s*!important/);
  const compactSection = source.slice(compactStart);
  assert.doesNotMatch(compactSection, /\.row\s*\[hidden\]/);
});

const fakeRegistry = (entries = {}) => {
  // Minimal stand-in for CustomElementRegistry used without a DOM: it enforces
  // only duplicate-name and constructor-type checks. Unlike the native
  // registry it cannot validate custom-element construction steps or DOM Node
  // constraints, since no DOM Node exists in this harness.
  const store = new Map(Object.entries(entries));
  return {
    store,
    get(tag) { return store.get(tag); },
    define(tag, ctor) {
      if (typeof ctor !== 'function') throw new TypeError('Custom element constructor must be a function');
      if (store.has(tag)) throw new Error(`"${tag}" has already been defined`);
      store.set(tag, ctor);
    },
  };
};

const fakeTimers = () => {
  let nextId = 1;
  const pending = new Map();
  const cleared = [];
  return {
    pending,
    cleared,
    schedule(fn) { const id = nextId++; pending.set(id, fn); return id; },
    clear(id) { cleared.push(id); pending.delete(id); },
  };
};

const withBrowserStubs = (t, { registry, win } = {}) => {
  const prevElements = globalThis.customElements;
  const prevHTMLElement = globalThis.HTMLElement;
  const prevWindow = globalThis.window;
  class FakeHTMLElement {}
  globalThis.customElements = registry ?? fakeRegistry();
  globalThis.HTMLElement = FakeHTMLElement;
  globalThis.window = win ?? {};
  t.after(() => {
    if (prevElements === undefined) delete globalThis.customElements;
    else globalThis.customElements = prevElements;
    if (prevHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = prevHTMLElement;
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
  });
  return FakeHTMLElement;
};

test('card registration is idempotent in the same registry', (t) => {
  const registry = fakeRegistry();
  const win = { customCards: [] };
  withBrowserStubs(t, { registry, win });
  assert.equal(registerBubbleClimateElements(), true);
  assert.equal(registerBubbleClimateElements(), true);
  assert.equal(registry.get(BUBBLE_CLIMATE_CARD_TAG), BubbleClimateCard);
  assert.equal(registry.get(BUBBLE_CLIMATE_CARD_EDITOR_TAG), BubbleClimateCardEditor);
  assert.equal(isBubbleClimateElementsRegistered(), true);
  assert.equal(win.customCards.filter((card) => card?.type === 'bubble-climate-card').length, 1);
});

test('window.customCards entry is preserved without customElements', (t) => {
  const prevElements = globalThis.customElements;
  const prevHTMLElement = globalThis.HTMLElement;
  const prevWindow = globalThis.window;
  const win = { customCards: [] };
  delete globalThis.customElements;
  delete globalThis.HTMLElement;
  globalThis.window = win;
  t.after(() => {
    if (prevElements === undefined) delete globalThis.customElements;
    else globalThis.customElements = prevElements;
    if (prevHTMLElement === undefined) delete globalThis.HTMLElement;
    else globalThis.HTMLElement = prevHTMLElement;
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
  });
  assert.equal(registerBubbleClimateElements(), false);
  assert.equal(registerBubbleClimateElements(), false);
  assert.equal(win.customCards.filter((card) => card?.type === 'bubble-climate-card').length, 1);
});

test('card re-registers in a replaced scoped registry once the frontend is ready', (t) => {
  const win = { customCards: [] };
  const nativeRegistry = fakeRegistry();
  withBrowserStubs(t, { registry: nativeRegistry, win });
  assert.equal(registerBubbleClimateElements(), true);
  assert.equal(nativeRegistry.get('bubble-climate-card'), BubbleClimateCard);
  // Scoped polyfill replaces window.customElements: fresh registry that only
  // knows the app bundle element, reproducing customElements.get(card) holes.
  class HomeAssistantElement {}
  const scopedRegistry = fakeRegistry({ 'home-assistant': HomeAssistantElement });
  globalThis.customElements = scopedRegistry;
  assert.equal(isHomeAssistantFrontendReady(), true);
  assert.equal(scopedRegistry.get('bubble-climate-card'), undefined);
  assert.equal(registerBubbleClimateElements(), true);
  assert.equal(scopedRegistry.get('bubble-climate-card'), BubbleClimateCard);
  assert.equal(scopedRegistry.get('bubble-climate-card-editor'), BubbleClimateCardEditor);
  assert.equal(isBubbleClimateElementsRegistered(), true);
  assert.equal(win.customCards.filter((card) => card?.type === 'bubble-climate-card').length, 1);
  assert.equal(nativeRegistry.get('bubble-climate-card'), BubbleClimateCard);
});

test('deferred poll registers queued attempt in the live scoped registry', (t) => {
  const win = { customCards: [] };
  withBrowserStubs(t, { registry: fakeRegistry(), win });
  assert.equal(isHomeAssistantFrontendReady(), false);
  const timers = fakeTimers();
  const warnings = [];
  const cancel = scheduleBubbleClimateReregistration({
    intervalMs: 1, maxAttempts: 5,
    schedule: timers.schedule, clear: timers.clear, warn: (message) => warnings.push(String(message)),
  });
  assert.equal(typeof cancel, 'function');
  assert.equal(timers.pending.size, 1);
  const [queuedId] = [...timers.pending.keys()];
  // Scoped polyfill swaps the registry while the poll is pending: the new live
  // registry already contains home-assistant but lost our tags.
  class HomeAssistantElement {}
  const scopedRegistry = fakeRegistry({ 'home-assistant': HomeAssistantElement });
  globalThis.customElements = scopedRegistry;
  assert.equal(isHomeAssistantFrontendReady(), true);
  const queuedPoll = timers.pending.get(queuedId);
  assert.equal(typeof queuedPoll, 'function');
  timers.pending.delete(queuedId);
  queuedPoll();
  assert.equal(scopedRegistry.get(BUBBLE_CLIMATE_CARD_TAG), BubbleClimateCard);
  assert.equal(scopedRegistry.get(BUBBLE_CLIMATE_CARD_EDITOR_TAG), BubbleClimateCardEditor);
  assert.equal(isBubbleClimateElementsRegistered(), true);
  assert.equal(timers.pending.size, 0);
  assert.equal(warnings.length, 0);
  cancel();
});

test('ready poll retries until the bounded limit when verification keeps failing', (t) => {
  const win = { customCards: [] };
  class HomeAssistantElement {}
  // Registry reports the frontend as ready but silently drops our tags, so
  // every register() attempt leaves verification false without throwing.
  const store = new Map([['home-assistant', HomeAssistantElement]]);
  const refusingRegistry = {
    store,
    get(tag) { return store.get(tag); },
    define(tag, ctor) {
      if (typeof ctor !== 'function') throw new TypeError('Custom element constructor must be a function');
      if (tag === 'home-assistant') {
        if (!store.has(tag)) store.set(tag, ctor);
        return;
      }
    },
  };
  withBrowserStubs(t, { registry: refusingRegistry, win });
  assert.equal(isHomeAssistantFrontendReady(), true);
  const timers = fakeTimers();
  const warnings = [];
  scheduleBubbleClimateReregistration({
    intervalMs: 1, maxAttempts: 2,
    schedule: timers.schedule, clear: timers.clear, warn: (message) => warnings.push(String(message)),
  });
  assert.equal(timers.pending.size, 1);
  assert.equal(isBubbleClimateElementsRegistered(), false);
  const first = [...timers.pending.values()][0];
  timers.pending.clear();
  first();
  assert.equal(timers.pending.size, 1);
  assert.equal(isBubbleClimateElementsRegistered(), false);
  const second = [...timers.pending.values()][0];
  timers.pending.clear();
  second();
  assert.equal(timers.pending.size, 0);
  assert.equal(isBubbleClimateElementsRegistered(), false);
  assert.equal(warnings.length, 1);
});

test('define failure in poll surfaces once and stops polling without uncaught', (t) => {
  const win = { customCards: [] };
  withBrowserStubs(t, { registry: fakeRegistry(), win });
  assert.equal(isHomeAssistantFrontendReady(), false);
  const timers = fakeTimers();
  const warnings = [];
  scheduleBubbleClimateReregistration({
    intervalMs: 1, maxAttempts: 5,
    schedule: timers.schedule, clear: timers.clear, warn: (message) => warnings.push(String(message)),
  });
  assert.equal(timers.pending.size, 1);
  const [queuedId] = [...timers.pending.keys()];
  // Scoped swap delivers a live registry that reports the frontend as ready
  // but throws deterministically when defining the card tag.
  class HomeAssistantElement {}
  const store = new Map([['home-assistant', HomeAssistantElement]]);
  const throwingRegistry = {
    get(tag) { return store.get(tag); },
    define(tag, ctor) {
      if (tag === BUBBLE_CLIMATE_CARD_TAG) throw new TypeError('invalid constructor');
      if (typeof ctor !== 'function') throw new TypeError('Custom element constructor must be a function');
      if (!store.has(tag)) store.set(tag, ctor);
    },
  };
  globalThis.customElements = throwingRegistry;
  assert.equal(isHomeAssistantFrontendReady(), true);
  const queuedPoll = timers.pending.get(queuedId);
  assert.equal(typeof queuedPoll, 'function');
  timers.pending.delete(queuedId);
  assert.doesNotThrow(queuedPoll);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /failed to register custom elements/);
  assert.match(warnings[0], /invalid constructor/);
  assert.equal(timers.pending.size, 0);
  assert.equal(isBubbleClimateElementsRegistered(), false);
});

test('cancel clears a pending poll before it runs', (t) => {
  const win = { customCards: [] };
  withBrowserStubs(t, { registry: fakeRegistry(), win });
  assert.equal(isHomeAssistantFrontendReady(), false);
  const timers = fakeTimers();
  const warnings = [];
  let ran = 0;
  const originalSchedule = timers.schedule;
  const cancel = scheduleBubbleClimateReregistration({
    intervalMs: 1, maxAttempts: 5,
    schedule: (fn, ms) => originalSchedule(() => { ran += 1; fn(); }, ms),
    clear: timers.clear,
    warn: (message) => warnings.push(String(message)),
  });
  assert.equal(timers.pending.size, 1);
  const [timerId] = [...timers.pending.keys()];
  cancel();
  assert.deepEqual(timers.cleared, [timerId]);
  assert.equal(timers.pending.size, 0);
  assert.equal(ran, 0);
  cancel();
  assert.equal(timers.cleared.length, 1);
  assert.equal(warnings.length, 0);
});

test('HVAC card toggle only requests supported heat/off modes', () => {
 assert.equal(hvacToggleMode({state:'off',attributes:{hvac_modes:['off','heat']}}),'heat');
 assert.equal(hvacToggleMode({state:'heat',attributes:{hvac_modes:['off','heat']}}),'off');
 assert.equal(hvacToggleMode({state:'off',attributes:{hvac_modes:['off']}}),null);
 assert.equal(hvacToggleMode({state:'heat',attributes:{hvac_modes:['heat']}}),null);
 assert.equal(hvacToggleMode({state:'unavailable',attributes:{hvac_modes:['heat','off']}}),null);
 assert.equal(hvacToggleMode({state:'unknown',attributes:{hvac_modes:['heat','off']}}),null);
});

test('card tap excludes controls and target updates optimistically with service rerender', () => {
 const source=readFileSync(new URL('./bubble-climate-card.js', import.meta.url),'utf8');
 assert.match(source,/role="group" aria-label="Tap card background to toggle heating"/);
 assert.doesNotMatch(source,/ha-card tabindex="0" role="button"/);
 assert.match(source,/path\.some\(node=>node!==card[\s\S]*?node\?\.matches\?\.\('button,input,select,textarea,a,\[role="slider"\],\[role="button"\],\[role="group"\]'\)/);
 assert.match(source,/node!==card && node\?\.matches\?\./);
 assert.match(source,/ev\.key==='Enter'\|\|ev\.key===' '/);
 assert.match(source,/\.slider'\)\?\.addEventListener\('change'/);
 assert.doesNotMatch(source,/\.slider'\)\?\.addEventListener\('input',[^;]*_setTemperature/);
 assert.match(source,/this\._optimistic=\{entityId:this\.config\.entity,payload\}/);
 assert.match(source,/this\._render\(\); this\._optimisticTimer=setTimeout/);
 assert.match(source,/Promise\.resolve\(\)\.then\(\(\)=>this\._hass\?\.callService\('climate','set_temperature'/);
 assert.match(source,/if\(this\._optimistic===seq\)\{clearTimeout\(this\._optimisticTimer\);this\._optimistic=null;this\._render\(\);\}/);
 assert.match(source,/catch\(\(\)=>/);
});

test('optimistic target model uses the service payload for single and dual targets', () => {
 const single={state:'heat',attributes:{temperature:20,min_temp:5,max_temp:30,target_temp_step:1}};
 const payload=temperaturePayload(single,22,0.5); assert.deepEqual(payload,{temperature:22});
 assert.equal(targetModel({...single,attributes:{...single.attributes,...payload}}).value,22);
 const dual={state:'heat_cool',attributes:{target_temp_low:18,target_temp_high:22,min_temp:5,max_temp:30,target_temp_step:1}};
 const dualPayload=temperaturePayload(dual,23,0.5); assert.deepEqual(dualPayload,{target_temp_low:19,target_temp_high:23});
 assert.deepEqual([targetModel({...dual,attributes:{...dual.attributes,...dualPayload}}).low,targetModel({...dual,attributes:{...dual.attributes,...dualPayload}}).high],[19,23]);
});
