import test from 'node:test';
import assert from 'node:assert/strict';
import { BubbleClimateCard, BubbleClimateCardEditor, BUBBLE_CLIMATE_CARD_TAG, BUBBLE_CLIMATE_CARD_EDITOR_TAG, registerBubbleClimateElements, isBubbleClimateElementsRegistered, isHomeAssistantFrontendReady, scheduleBubbleClimateReregistration, clampTarget, temperaturePayload, targetModel, scheduleDraft, validateScheduleDraft, defaultCardConfig, configSchema, getEntitySuggestion, effectiveStep } from './bubble-climate-card.js';

test('module imports without browser DOM and exports the card class', () => {
  assert.equal(typeof BubbleClimateCard, 'function');
  assert.equal(typeof clampTarget, 'function');
});

test('editor schema exposes climate entity and all supported visual options', () => {
  assert.deepEqual(configSchema[0].selector.entity, { filter: { domain: ['climate'] } });
  const fields = configSchema.map((field) => field.name);
  for (const name of ['entity', 'name', 'icon', 'step', 'show_state_chip', 'show_current_temperature_chip', 'show_humidity_chip', 'show_unavailable_badge', 'show_mode_buttons', 'show_step_controls', 'show_schedule_button']) assert.ok(fields.includes(name));
  assert.deepEqual(defaultCardConfig('climate.living_room'), {
    entity: 'climate.living_room', layout: 'compact', step: 0.5,
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
  assert.match(validateScheduleDraft({ slots: [{ ...draft.slots[0], end: '07:30' }] }), /start and end/);
  assert.ok(validateScheduleDraft({ slots: [{ ...draft.slots[0], temperature: '' }] }));
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
