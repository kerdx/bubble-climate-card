import test from 'node:test';
import assert from 'node:assert/strict';
import { BubbleClimateCard, clampTarget, temperaturePayload, targetModel, scheduleDraft, validateScheduleDraft, defaultCardConfig, configSchema, getEntitySuggestion, effectiveStep } from './bubble-climate-card.js';

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
