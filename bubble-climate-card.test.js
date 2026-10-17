import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BubbleClimateCard, BubbleClimateCardEditor, BUBBLE_CLIMATE_CARD_TAG, BUBBLE_CLIMATE_CARD_EDITOR_TAG, registerBubbleClimateElements, isBubbleClimateElementsRegistered, isHomeAssistantFrontendReady, scheduleBubbleClimateReregistration, clampTarget, temperaturePayload, targetModel, hvacToggleMode, scheduleDraft, validateScheduleDraft, defaultCardConfig, configSchema, configSchemaFields, getEntitySuggestion, sameCardConfig, errorLabel, effectiveStep, normalizeLayout, isClimateActive, isScheduleEnabled, awayTemperaturePayload, schedulableModes, climateStatusKey, statusLabel, modeLabel, resolveLanguage, cardStrings, fieldLabel, pickEntityTimestamp, formatRelativeTime, formatNumber, rowStatusParts, currentTemperatureDisplay } from './custom_components/bubble_climate_scheduler/www/bubble-climate-card.js';

test('module imports without browser DOM and exports the card class', () => {
  assert.equal(typeof BubbleClimateCard, 'function');
  assert.equal(typeof clampTarget, 'function');
});

test('row status and temperatures preserve readable separators and spacing', () => {
  assert.deepEqual(rowStatusParts({ statusText: 'Off', relativeText: '1 hour ago' }), ['Off', '1 hour ago']);
  assert.equal(currentTemperatureDisplay(20.5, '°C', 'it-IT'), `${formatNumber(20.5, 'it-IT')} °C`);
  const source = readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url), 'utf8');
  assert.match(source, /\.status-line span\+span:before\{content:' · '/);
  assert.match(source, /overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain/);
  assert.match(source, /\.meta\{flex:1 1 0;min-width:0/);
});

test('editor schema groups the options into localized sections', () => {
  assert.deepEqual(configSchema.map((entry) => entry.type), ['grid', 'grid', 'expandable']);
  assert.deepEqual(configSchema.map((entry) => entry.name), ['identity', 'chips', 'controls']);
  assert.equal(configSchema[2].collapsed, true);
  for (const lang of ['en', 'it']) {
    const strings = cardStrings(lang);
    assert.deepEqual(Object.keys(strings.sections), ['identity', 'chips', 'controls']);
    assert.ok(strings.sections.identity && strings.sections.chips && strings.sections.controls);
  }
  // Every help entry maps to a real schema field, in both languages.
  const names = configSchemaFields().map((entry) => entry.name).sort();
  for (const lang of ['en', 'it']) {
    const help = cardStrings(lang).help;
    assert.deepEqual(Object.keys(help).sort(), names);
  }
});

test('editor schema exposes climate entity and all supported visual options', () => {
  const fields = configSchemaFields();
  assert.deepEqual(fields[0].selector.entity, { filter: { domain: ['climate'] } });
  const names = fields.map((entry) => entry.name);
  for (const name of ['entity', 'name', 'icon', 'layout', 'step', 'show_state_chip', 'show_current_temperature_chip', 'show_humidity_chip', 'show_unavailable_badge', 'show_mode_buttons', 'show_step_controls', 'show_schedule_button']) assert.ok(names.includes(name));
  assert.deepEqual(fields.find((entry) => entry.name === 'layout').selector, { select: { mode: 'dropdown', options: ['bubble', 'compact'] } });
  assert.deepEqual(defaultCardConfig('climate.living_room'), {
    entity: 'climate.living_room', layout: 'bubble',
    show_state_chip: true, show_current_temperature_chip: true, show_humidity_chip: false,
      show_unavailable_badge: true, show_mode_buttons: true, show_step_controls: true, show_schedule_button: true,
  });
  assert.equal(typeof BubbleClimateCard.getStubConfig, 'function');
  assert.equal(typeof BubbleClimateCard.getConfigElement, 'function');
});

test('sameCardConfig compares shallow configs so the editor can skip re-rendering', () => {
  const config = defaultCardConfig('climate.living_room');
  assert.equal(sameCardConfig(config, { ...config }), true);
  assert.equal(sameCardConfig(config, { ...config, name: 'Sala' }), false);
  assert.equal(sameCardConfig({ step: 0.5 }, { step: '0.5' }), false);
  assert.equal(sameCardConfig(undefined, config), false);
  assert.equal(sameCardConfig(config, null), false);
  assert.equal(sameCardConfig(null, null), true);
  // An absent key and an explicit undefined are equivalent for the editor.
  assert.equal(sameCardConfig(config, { ...config, extra: undefined }), true);
  assert.equal(sameCardConfig(config, { ...config, extra: 1 }), false);
});

test('editor builds the form once and never resets the shadow root (static check, no rendering)', () => {
  const source = readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url), 'utf8');
  const start = source.indexOf('export class BubbleClimateCardEditor');
  const end = source.indexOf('export class BubbleClimateCard extends');
  assert.ok(start !== -1 && end !== -1 && start < end);
  const editor = source.slice(start, end);
  assert.doesNotMatch(editor, /shadowRoot\.innerHTML\s*=/);
  assert.match(editor, /if \(this\._form\) this\._form\.hass = value;/);
  assert.match(editor, /this\.shadowRoot\.append\(form, previewBox\)/);
  assert.match(editor, /if \(!sameCardConfig\(this\._formData, this\._config\)\)/);
});

test('editor serves grouped forms with helpers and an inert live preview', () => {
  const source = readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url), 'utf8');
  const start = source.indexOf('export class BubbleClimateCardEditor');
  const end = source.indexOf('export class BubbleClimateCard extends');
  const editor = source.slice(start, end);
  // hui-form covers grouped schemas; ha-form stays as the standalone fallback.
  assert.match(editor, /customElements\?\.get\?\.\('hui-form'\) \? 'hui-form' : 'ha-form'/);
  // Localized section names win over field names in the label callback.
  assert.match(editor, /this\._strings\(\)\.sections\[schema\.name\] \|\| fieldLabel/);
  assert.match(editor, /form\.computeHelper = \(schema\) => this\._strings\(\)\.help\[schema\.name\]/);
  // The preview is a real card fed with the edited config, but inert:
  // clicks must never call services while the user is only configuring.
  assert.match(editor, /\.preview\{pointer-events:none\}/);
  assert.match(editor, /document\.createElement\('bubble-climate-card'\)/);
  assert.match(editor, /this\._preview\.hass = value;/);
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

test('an explicitly configured step overrides the entity step', () => {
  const entity = { state: 'heat', attributes: { min_temp: 10, max_temp: 30, target_temp_step: 1, temperature: 21 } };
  assert.equal(effectiveStep(entity, 0.5, 0.5), 0.5);
  assert.equal(effectiveStep(entity, 0.5, '0.5'), 0.5);
  assert.equal(effectiveStep(entity, 0.5, 1), 1);
  assert.equal(effectiveStep(entity, 0.5, null), 1);
  assert.equal(effectiveStep({ attributes: {} }, 0.5, 0.5), 0.5);
  assert.equal(effectiveStep(entity, 0.5, 0), null);
  assert.equal(effectiveStep(entity, 0.5, -1), null);
  assert.equal(effectiveStep(entity, 0.5, 'invalid'), 1);
  assert.equal(clampTarget(21.4, entity, 0.5, 0.5), 21.5);
  assert.equal(clampTarget(21.4, entity, 0.5), 21);
  assert.deepEqual(temperaturePayload(entity, 21.5, 0.5, 0.5), { temperature: 21.5 });
  assert.deepEqual(temperaturePayload(entity, 21.5, 0.5), { temperature: 22 });
});

// setConfig only needs attachShadow: with no shadowRoot _render returns early,
// so the card's step handling can be exercised without a DOM.
const configuredCard = (config) => {
  const card = new BubbleClimateCard();
  card.attachShadow = () => {};
  card.setConfig(config);
  return card;
};

test('new card presets carry no explicit step, so the entity step stays effective', () => {
  // The preset is not an override: an absent `step` key keeps target_temp_step
  // in charge and leaves 0.5 as the runtime fallback only.
  for (const preset of [defaultCardConfig('climate.living_room'), BubbleClimateCard.getStubConfig({ states: {} }), getEntitySuggestion({}, 'climate.living_room')]) {
    assert.equal(Object.hasOwn(preset, 'step'), false);
    assert.equal(preset.step, undefined);
  }
  const stubCard = configuredCard(BubbleClimateCard.getStubConfig({ states: {} }));
  assert.equal(stubCard._stepOverride, null);
  assert.equal(stubCard.config.step, 0.5);
  assert.equal(effectiveStep({ attributes: { target_temp_step: 1 } }, stubCard.config.step, stubCard._stepOverride), 1);
  assert.equal(effectiveStep({ attributes: {} }, stubCard.config.step, stubCard._stepOverride), 0.5);
  assert.equal(effectiveStep({ attributes: { target_temp_step: null } }, stubCard.config.step, stubCard._stepOverride), 0.5);
  assert.deepEqual(
    temperaturePayload({ state: 'heat', attributes: { min_temp: 10, max_temp: 30, temperature: 21, target_temp_step: 1 } }, 21, stubCard.config.step, stubCard._stepOverride),
    { temperature: 21 },
  );
  const suggestedCard = configuredCard(getEntitySuggestion({}, 'climate.living_room'));
  assert.equal(suggestedCard._stepOverride, null);
  assert.equal(effectiveStep({ attributes: { target_temp_step: 1 } }, suggestedCard.config.step, suggestedCard._stepOverride), 1);
});

test('an explicitly configured step still overrides the entity step after the preset change', () => {
  const entity = { state: 'heat', attributes: { min_temp: 10, max_temp: 30, temperature: 21, target_temp_step: 1 } };
  const card = configuredCard({ ...defaultCardConfig('climate.living_room'), step: 0.5 });
  assert.equal(card._stepOverride, 0.5);
  assert.equal(effectiveStep(entity, card.config.step, card._stepOverride), 0.5);
  assert.deepEqual(temperaturePayload(entity, 21.5, card.config.step, card._stepOverride), { temperature: 21.5 });
  assert.deepEqual(temperaturePayload(entity, 21, card.config.step, card._stepOverride), { temperature: 21 });
  const explicitStepCard = configuredCard({ ...defaultCardConfig('climate.living_room'), step: 1 });
  assert.equal(explicitStepCard._stepOverride, 1);
  assert.equal(effectiveStep({ attributes: { target_temp_step: 0.5 } }, explicitStepCard.config.step, explicitStepCard._stepOverride), 1);
  assert.throws(() => configuredCard({ ...defaultCardConfig('climate.living_room'), step: 0 }), /step must be a number greater than zero/);
  assert.throws(() => configuredCard({ ...defaultCardConfig('climate.living_room'), step: 'bad' }), /step must be a number greater than zero/);
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
  assert.deepEqual(scheduleDraft({ enabled: true, away_temperature: 17, hvac_mode: 'cool', slots: [{ id: 'a', days: [1, 8, 2], start: '07:30', end: '08:00', temperature: 20 }] }), {
    enabled: true, awayTemperature: 17, hvacMode: 'cool', slots: [{ id: 'a', days: [1, 2], start: '07:30', end: '08:00', temperature: 20 }],
  });
  const draft = scheduleDraft({ slots: [{ id: 'a', days: [1], start: '07:30', end: '08:00', temperature: 20 }] });
  assert.equal(draft.awayTemperature, null);
  assert.equal(draft.hvacMode, null);
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

test('program HVAC mode is validated and filtered to schedulable modes', () => {
  const draft = scheduleDraft({ enabled: false, slots: [] });
  for (const hvacMode of [null, '', 'off', 'heat', 'cool', 'auto', 'dry', 'fan_only']) {
    assert.equal(validateScheduleDraft({ ...draft, hvacMode }), null, `mode ${String(hvacMode)}`);
  }
  for (const hvacMode of ['heat_cool', 'banana', true]) {
    assert.match(validateScheduleDraft({ ...draft, hvacMode }), /Unsupported HVAC mode/);
  }
  assert.match(validateScheduleDraft({ ...draft, hvacMode: 'banana' }, cardStrings('it')), /non supportata/);
  assert.deepEqual(schedulableModes({ attributes: { hvac_modes: ['heat_cool', 'cool', 'heat', 'off'] } }), ['off', 'heat', 'cool']);
  assert.deepEqual(schedulableModes({ attributes: { hvac_modes: ['fan_only'] } }), ['fan_only']);
  assert.deepEqual(schedulableModes({ attributes: {} }), ['off', 'heat', 'cool', 'auto', 'dry', 'fan_only']);
  assert.deepEqual(schedulableModes(undefined), ['off', 'heat', 'cool', 'auto', 'dry', 'fan_only']);
});

test('outside-schedule temperature validation and payload', () => {
  const draft = scheduleDraft({ enabled: false, slots: [] });
  for (const awayTemperature of [17, 17.5, '17.5', '', '   ', null, undefined]) {
    assert.equal(validateScheduleDraft({ ...draft, awayTemperature }), null, `away ${String(awayTemperature)}`);
  }
  for (const awayTemperature of ['warm', 'NaN', {}]) {
    assert.match(validateScheduleDraft({ ...draft, awayTemperature }), /outside-schedule temperature/i);
  }
  assert.equal(awayTemperaturePayload(17), 17);
  assert.equal(awayTemperaturePayload('17.5'), 17.5);
  for (const empty of ['', '   ', null, undefined, 'unknown']) assert.equal(awayTemperaturePayload(empty), null);
});

test('bubble schedule pill is a sibling of temperature controls in markup', () => {
  const source = readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url), 'utf8');
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

test('schedule enabled helper tracks the program enabled flag only', () => {
  assert.equal(isScheduleEnabled({ enabled: true }), true);
  assert.equal(isScheduleEnabled({ enabled: false }), false);
  assert.equal(isScheduleEnabled({ enabled: true, slots: [{ id: 'a' }], active_slot_id: null }), true);
  assert.equal(isScheduleEnabled({ enabled: false, active_slot_id: 'a' }), false);
  assert.equal(isScheduleEnabled({}), false);
  assert.equal(isScheduleEnabled(undefined), false);
  assert.equal(isScheduleEnabled(null), false);
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

test('UI strings follow the Home Assistant locale with an English fallback', () => {
  assert.equal(resolveLanguage('it'), 'it');
  assert.equal(resolveLanguage('it-IT'), 'it');
  assert.equal(resolveLanguage('IT-it'), 'it');
  assert.equal(resolveLanguage('en-US'), 'en');
  assert.equal(resolveLanguage('de'), 'en');
  assert.equal(resolveLanguage(undefined), 'en');
  assert.equal(resolveLanguage(null), 'en');
  assert.equal(cardStrings('it').saveProgram, 'Salva programma');
  assert.equal(cardStrings('it').toggleHeating, 'Tocca lo sfondo della scheda per alternare riscaldamento e spento');
  assert.equal(cardStrings('it').temperatureControls, 'Controlli temperatura');
  assert.equal(cardStrings('it').dontChange, 'Non cambiare');
  assert.equal(cardStrings('en').badMode, 'Unsupported HVAC mode.');
  assert.equal(cardStrings('it-IT').outsideSchedule, 'Fuori orario');
  assert.equal(cardStrings('de').saveProgram, 'Save program');
  assert.deepEqual(cardStrings('it').dayPills, ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']);
  assert.deepEqual(cardStrings('en').dayPills, ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);
  assert.equal(modeLabel('heat', cardStrings('it')), 'Caldo');
  assert.equal(modeLabel('heat'), 'Heat');
  assert.equal(modeLabel('fan_only', cardStrings('it')), 'Solo ventilazione');
  assert.equal(statusLabel('heating', cardStrings('it')), 'Riscaldamento');
  assert.equal(statusLabel('heating'), 'Heating');
  assert.equal(fieldLabel(cardStrings('it'), 'entity'), 'Entità climate');
  assert.equal(fieldLabel(cardStrings('it'), 'unknown_field'), 'unknown field');
  assert.match(validateScheduleDraft(scheduleDraft({ enabled: true, slots: [] }), cardStrings('it')), /almeno una fascia/);
  assert.match(validateScheduleDraft(scheduleDraft({ enabled: true, slots: [] })), /needs at least one slot/);
});

test('schedule day pills use unique short labels while aria-labels stay complete', () => {
  const source = readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url), 'utf8');
  for (const language of ['en', 'it']) {
    const strings = cardStrings(language);
    assert.equal(strings.dayPills.length, 7, `${language} pill labels`);
    assert.equal(strings.dayNames.length, 7, `${language} day names`);
    assert.equal(new Set(strings.dayPills).size, 7, `${language} pill labels must be unique`);
    assert.equal(new Set(strings.dayNames).size, 7, `${language} day names must be unique`);
    for (const pill of strings.dayPills) assert.equal(pill.length, 2, `${language} pill "${pill}" stays two letters`);
    for (const name of strings.dayNames) assert.ok(name.length > 2, `${language} name "${name}" stays a full day name`);
    for (const pill of strings.dayPills) assert.equal(strings.dayNames.includes(pill), false, `${language} pill "${pill}" is not an accessible name`);
    // First letters alone collide (Mar/Mer, Tue/Thu, Sat/Sun), which is why
    // the pill text no longer derives from them.
    assert.ok(new Set(strings.dayNames.map((name) => name[0])).size < 7, `${language} full names collide on their first letter`);
  }
  assert.doesNotMatch(source, /pill\.textContent = day\[0\]/);
  assert.doesNotMatch(source, /t\.days\.forEach/);
  assert.match(source, /t\.dayNames\.forEach\(\(name, i\) =>/);
  assert.match(source, /pill\.textContent = t\.dayPills\[i\]/);
  // The checkbox keeps the complete accessible name and its ISO weekday.
  assert.match(source, /cb\.setAttribute\('aria-label', name\)/);
  assert.match(source, /cb\.checked = slot\.days\.includes\(i \+ 1\)/);
  assert.match(source, /\[\.\.\.slot\.days, i \+ 1\]/);
  assert.match(source, /slot\.days\.filter\(\(x\) => x !== i \+ 1\)/);
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
  const source = readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url), 'utf8');
  const rowStart = source.indexOf('  _renderRow() {');
  const compactStart = source.indexOf('  _renderCompact() {');
  assert.ok(rowStart !== -1 && compactStart !== -1 && rowStart < compactStart);
  const rowSection = source.slice(rowStart, compactStart);
  assert.match(rowSection, /\.row\s*\[hidden\][^{]*\{[^}]*display\s*:\s*none\s*!important/);
  const compactSection = source.slice(compactStart);
  assert.doesNotMatch(compactSection, /\.row\s*\[hidden\]/);
});

test('calendar button accent CSS exists per layout (static presence check, no rendering)', () => {
  // The calendar button is tinted with the same accent used by the active
  // current-temperature chip when the schedule program is enabled; verify the
  // rule is present and scoped in both layouts without rendering.
  const source = readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url), 'utf8');
  const rowStart = source.indexOf('  _renderRow() {');
  const compactStart = source.indexOf('  _renderCompact() {');
  assert.ok(rowStart !== -1 && compactStart !== -1 && rowStart < compactStart);
  const rowSection = source.slice(rowStart, compactStart);
  const compactSection = source.slice(compactStart);
  assert.match(rowSection, /\.schedule\[data-active="true"\][^{]*\{[^}]*var\(--bubble-accent-color,var\(--primary-color\)\)/);
  assert.match(compactSection, /\.head \.schedule\[data-active="true"\][^{]*\{[^}]*var\(--bubble-accent-color,var\(--primary-color\)\)/);
  assert.match(rowSection, /schedule\.dataset\.active = scheduleActive/);
  assert.match(compactSection, /schedule\.dataset\.active = scheduleActive/);
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
 const source=readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url),'utf8');
 assert.match(source,/role="group" aria-label="Tap card background to toggle heating"/);
 assert.doesNotMatch(source,/ha-card tabindex="0" role="button"/);
 assert.match(source,/path\.some\(node=>node!==card[\s\S]*?node\?\.matches\?\.\('button,input,select,textarea,a,\[role="slider"\],\[role="button"\],\[role="group"\]'\)/);
 assert.match(source,/node!==card && node\?\.matches\?\./);
 assert.match(source,/ev\.key==='Enter'\|\|ev\.key===' '/);
 assert.match(source,/\.slider'\)\?\.addEventListener\('change'/);
 assert.doesNotMatch(source,/\.slider'\)\?\.addEventListener\('input',[^;]*_setTemperature/);
 assert.match(source,/this\._optimistic=\{entityId:this\.config\.entity,payload\}/);
 assert.match(source,/this\._renderPreservingDeltaFocus\(\); this\._optimisticTimer=setTimeout/);
 assert.match(source,/Promise\.resolve\(\)\.then\(\(\)=>this\._hass\?\.callService\('climate','set_temperature'/);
 assert.match(source,/if\(this\._optimistic===seq\)\{clearTimeout\(this\._optimisticTimer\);this\._optimistic=null;this\._renderPreservingDeltaFocus\(\);\}/);
 assert.match(source,/catch\(\(\)=>/);
});

test('optimistic target model uses the service payload for single and dual targets', () => {
 const single={state:'heat',attributes:{temperature:20,min_temp:5,max_temp:30,target_temp_step:1}};
 const payload=temperaturePayload(single,22,0.5); assert.deepEqual(payload,{temperature:22});
 assert.equal(targetModel({...single,attributes:{...single.attributes,...payload}}).value,22);
 const dual={state:'heat_cool',attributes:{target_temp_low:18,target_temp_high:22,min_temp:5,max_temp:30,target_temp_step:1}};
 const dualPayload=temperaturePayload(dual,23,0.5); assert.deepEqual(dualPayload,{target_temp_low:21,target_temp_high:25});
 assert.deepEqual([targetModel({...dual,attributes:{...dual.attributes,...dualPayload}}).low,targetModel({...dual,attributes:{...dual.attributes,...dualPayload}}).high],[21,25]);
});

test('every card rebuild restores focus on an active +/- delta and never steals it', async (t) => {
  const source = readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url), 'utf8');

  // Static wiring: all four rebuild paths (hass tick, optimistic render, the
  // 8s timeout and the service rollback) go through the same wrapper, so a
  // later re-render cannot drop focus that the first one already restored.
  assert.match(source, /set hass\(hass\) \{ this\._hass = hass; this\._reconcileOptimistic\(\); this\._renderPreservingDeltaFocus\(\); \}/);
  const cardStart = source.indexOf('export class BubbleClimateCard extends');
  const configStart = source.indexOf('  setConfig(config) {', cardStart);
  const hassStart = source.indexOf('  set hass(hass)', configStart);
  assert.ok(configStart !== -1 && hassStart > configStart, 'card config setter exists');
  assert.match(source.slice(configStart, hassStart), /this\._renderPreservingDeltaFocus\(\)/);
  assert.match(source, /this\._optimistic=\{entityId:this\.config\.entity,payload\}; this\._renderPreservingDeltaFocus\(\); this\._optimisticTimer=setTimeout/);
  assert.match(source, /this\._optimisticTimer=setTimeout\(\(\)=>\{this\._optimistic=null;this\._optimisticTimer=null;this\._renderPreservingDeltaFocus\(\);\},8000\)/);
  assert.match(source, /if\(this\._optimistic===seq\)\{clearTimeout\(this\._optimisticTimer\);this\._optimistic=null;this\._renderPreservingDeltaFocus\(\);\}/);
  // The wrapper captures the delta before the swap and restores it after it.
  const wrapStart = source.indexOf('_renderPreservingDeltaFocus() {');
  assert.ok(wrapStart !== -1, 'wrapper exists');
  const wrap = source.slice(wrapStart, source.indexOf('_setTemperature(', wrapStart));
  const capture = wrap.indexOf('const delta = this._focusedDelta();');
  const rebuild = wrap.indexOf('this._render();');
  const restore = wrap.indexOf('this._restoreDeltaFocus(delta);');
  assert.ok(capture !== -1 && rebuild !== -1 && restore !== -1, 'capture, render and restore all present');
  assert.ok(capture < rebuild && rebuild < restore, 'capture happens before the render and restore after it');
  assert.match(source, /activeElement\?\.dataset\?\.delta/);
  assert.match(source, /root\.querySelector\(`\[data-delta="\$\{delta\}"\]`\)\?\.focus\?\.\(\)/);

  // Behavioural checks without a DOM: a fake shadow root records every step.
  const delta = { dataset: { delta: '-0.5' } };
  const restored = ['activeElement', 'render', 'activeElement', 'query [data-delta="-0.5"]', 'focus'];
  const newHarness = (callService = () => {}) => {
    const card = configuredCard(defaultCardConfig('climate.living_room'));
    const order = [];
    const focusState = { active: null };
    const shadow = { querySelector: (selector) => { order.push(`query ${selector}`); return selector === '[data-delta="-0.5"]' ? { focus: () => order.push('focus') } : null; } };
    Object.defineProperty(shadow, 'activeElement', { get: () => { order.push('activeElement'); return focusState.active; }, configurable: true });
    Object.defineProperty(card, 'shadowRoot', { value: shadow, configurable: true });
    card._render = () => order.push('render');
    card._hass = {
      states: { 'climate.living_room': { state: 'heat', attributes: { temperature: 21, min_temp: 7, max_temp: 30, target_temp_step: 0.5 } } },
      callService,
    };
    t.after(() => card.disconnectedCallback());
    return { card, order, focusState };
  };
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  // Swap setTimeout just for the scheduling call, so the 8s optimistic timer
  // can be fired by hand instead of waiting or mocking global timers.
  const scheduleOf = (run) => {
    const scheduled = [];
    const realSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn, ms) => { scheduled.push({ fn, ms }); return scheduled.length; };
    try { run(); } finally { globalThis.setTimeout = realSetTimeout; }
    return scheduled;
  };

  // Optimistic render, then a hass tick, then the 8s timeout: the delta that
  // owns focus keeps it through every rebuild.
  const kept = newHarness();
  kept.focusState.active = delta;
  const timers = scheduleOf(() => kept.card._setTemperature(20.5, null));
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 8000);
  assert.deepEqual(kept.order, restored);
  await flush();
  kept.order.length = 0;
  kept.card.hass = { ...kept.card._hass, states: { ...kept.card._hass.states } };
  assert.deepEqual(kept.order, restored, 'hass update restores the delta focus');
  kept.order.length = 0;
  timers[0].fn();
  assert.deepEqual(kept.order, restored, 'optimistic timeout restores the delta focus');

  // The same timer with focus already moved to a plain control: no restore.
  kept.order.length = 0;
  kept.focusState.active = { dataset: {} };
  const second = scheduleOf(() => kept.card._setTemperature(22, null));
  assert.deepEqual(kept.order, ['activeElement', 'render']);
  kept.order.length = 0;
  second[0].fn();
  assert.deepEqual(kept.order, ['activeElement', 'render']);

  // Service rollback re-renders too, and behaves the same way.
  const failing = newHarness(() => Promise.reject(new Error('service failed')));
  failing.focusState.active = delta;
  scheduleOf(() => failing.card._setTemperature(21, null));
  failing.order.length = 0;
  await flush();
  assert.equal(failing.card._optimistic, null, 'rollback clears the optimistic payload');
  assert.deepEqual(failing.order, restored, 'rollback restores the delta focus');

  const failingUnfocused = newHarness(() => Promise.reject(new Error('service failed')));
  scheduleOf(() => failingUnfocused.card._setTemperature(21, null));
  failingUnfocused.order.length = 0;
  await flush();
  assert.deepEqual(failingUnfocused.order, ['activeElement', 'render']);

  // A live control that still owns focus after the swap keeps it: nothing is
  // queried and nothing is refocused.
  const keptLive = newHarness();
  keptLive.focusState.active = { dataset: { delta: '-0.5' }, isConnected: true };
  keptLive.card.hass = { ...keptLive.card._hass, states: { ...keptLive.card._hass.states } };
  assert.deepEqual(keptLive.order, ['activeElement', 'render', 'activeElement']);

  // Focus already moved outside the card: the restore must not steal it back,
  // while focus dropped to the document body is still handed to the delta.
  const body = {};
  globalThis.document = { body, activeElement: { id: 'somewhere-else' } };
  try {
    const outside = newHarness();
    outside.focusState.active = delta;
    outside.card.hass = { ...outside.card._hass, states: { ...outside.card._hass.states } };
    assert.deepEqual(outside.order, ['activeElement', 'render', 'activeElement']);
    globalThis.document.activeElement = body;
    outside.order.length = 0;
    outside.card.hass = { ...outside.card._hass, states: { ...outside.card._hass.states } };
    assert.deepEqual(outside.order, restored);
  } finally { delete globalThis.document; }

  // A focus target without a delta (the slider, or nothing) is left alone.
  const plain = newHarness();
  plain.focusState.active = { dataset: {} };
  plain.card._setTemperature(21.5, null);
  assert.deepEqual(plain.order, ['activeElement', 'render']);
  plain.order.length = 0;
  plain.focusState.active = null;
  plain.card._setTemperature(22, null);
  assert.deepEqual(plain.order, ['activeElement', 'render']);
  plain.order.length = 0;
  assert.equal(plain.card._focusedDelta(), null);
  plain.card._restoreDeltaFocus(null);
  assert.deepEqual(plain.order, ['activeElement']);
});

test('errorLabel translates backend error codes with context placeholders', () => {
  const t = {
    errors: {
      entity_unavailable: 'The climate entity is unavailable; the target stays pending.',
      slots_overlap: 'Slots {a} and {b} overlap.',
      service_call_failed: 'The climate service call failed: {message}',
      target_outside_limits: 'Target {value} is outside the climate limits.',
    },
  };
  assert.equal(
    errorLabel(t, { code: 'slots_overlap', context: { a: 'morning', b: 'night' }, message: 'raw' }),
    'Slots morning and night overlap.',
  );
  assert.equal(
    errorLabel(t, { code: 'entity_unavailable', context: {}, message: 'Climate entity is unavailable; target is pending' }),
    'The climate entity is unavailable; the target stays pending.',
  );
  assert.equal(
    errorLabel(t, { code: 'service_call_failed', context: {}, message: 'boom' }),
    'The climate service call failed: boom',
  );
  assert.equal(
    errorLabel(t, { code: 'target_outside_limits', context: { value: null }, message: 'raw' }),
    'Target {value} is outside the climate limits.',
  );
  // Unknown code, plain legacy strings, and empty inputs fall back safely.
  assert.equal(errorLabel(t, { code: 'future_code', message: 'kept raw' }), 'kept raw');
  assert.equal(errorLabel(t, 'Legacy English text'), 'Legacy English text');
  assert.equal(errorLabel(t, ''), '');
  assert.equal(errorLabel(t, null), '');
  assert.equal(errorLabel({}, { code: 'slots_overlap', message: 'raw' }), 'raw');
});

test('card surfaces route backend errors through errorLabel for translation', () => {
  const source = readFileSync(new URL('./custom_components/bubble_climate_scheduler/www/bubble-climate-card.js', import.meta.url), 'utf8');
  assert.ok(source.includes("p.textContent = errorLabel(t, program.last_error)"), 'schedule dialog must translate last_error');
  const routed = source.match(/errorLabel\(t, err\?\.message \|\| err\)/g);
  assert.ok(routed && routed.length >= 2, 'delete and save failures must be routed through errorLabel');
  // English and Italian both enumerate every known backend code.
  const maps = String(source).match(/errors: \{/g);
  assert.equal(maps.length, 2, 'both language blocks must carry an errors map');
  for (const code of ['entity_unavailable', 'service_call_failed', 'slots_overlap', 'target_outside_limits', 'no_program', 'unsupported_hvac_mode']) {
    const occurrences = source.split(` ${code}: `).length - 1;
    assert.ok(occurrences >= 2, `code ${code} must be localized in both languages`);
  }
});
