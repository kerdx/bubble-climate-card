export const numeric = (v) => {
  if (v === null || v === undefined || (typeof v === 'string' && (!v.trim() || ['unknown', 'unavailable'].includes(v.trim().toLowerCase())))) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
// Card UI strings. The active language follows hass.locale.language; languages
// other than Italian fall back to English.
const STRINGS = {
  en: {
    unavailable: 'Unavailable',
    entityUnavailable: 'Entity unavailable',
    currentTemperature: (value) => `Current temperature ${value}`,
    decrease: 'Decrease target temperature',
    increase: 'Increase target temperature',
    target: (value, unit) => `Target ${value}${unit}`,
    targetRange: (low, high, unit) => `Target temperature range ${low} to ${high}${unit}`,
    targetUnavailable: 'Target unavailable',
    openDetails: (label) => `${label}. Open details`,
    toggleHeating: 'Tap card background to toggle heating',
    temperatureControls: 'Temperature controls',
    openSchedule: 'Open schedule details',
    midpoint: 'Target temperature range midpoint',
    targetLabel: 'Target temperature',
    hvacMode: 'HVAC mode',
    dontChange: 'Do not change',
    badMode: 'Unsupported HVAC mode.',
    weeklySchedule: 'Weekly schedule',
    scheduleAria: 'Weekly climate schedule',
    close: 'Close',
    closeSchedule: 'Close schedule editor',
    backendMissing: 'Scheduler backend is not installed. Install and configure bubble_climate_scheduler to edit a program.',
    openLegacy: 'Open legacy schedule',
    nextChange: 'Next change: ',
    none: 'none',
    active: (id) => ` · Active: ${id}`,
    enabled: 'Enabled',
    outsideSchedule: 'Outside schedule',
    outsideScheduleAria: 'Outside schedule temperature',
    outsideScheduleTitle: 'Applied outside the scheduled slots; leave empty to keep the last target.',
    slot: (index) => `Slot ${index}`,
    remove: 'Remove',
    removeSlot: (index) => `Remove slot ${index}`,
    start: 'Start',
    end: 'End',
    targetField: 'Target',
    addSlot: '+ Add slot',
    deleteProgram: 'Delete program',
    saveProgram: 'Save program',
    // Full day names feed the accessible labels; the visible pill text comes
    // from dayPills, whose two-letter labels stay unique in this language.
    dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    dayPills: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    invalidSchedule: 'Invalid schedule.',
    needSlot: 'An enabled schedule needs at least one slot.',
    awayNumber: 'The outside-schedule temperature must be a number.',
    slotInvalid: 'Each slot needs days, valid times, and a target; start and end must differ.',
    fields: {
      entity: 'Climate entity', name: 'Name', icon: 'Icon', layout: 'Layout', step: 'Step',
      show_state_chip: 'Show state and relative time', show_current_temperature_chip: 'Show current temperature',
      show_humidity_chip: 'Show humidity', show_unavailable_badge: 'Show unavailable badge',
      show_mode_buttons: 'Show HVAC mode selector', show_step_controls: 'Show +/- controls', show_schedule_button: 'Show schedule button',
    },
    modes: { heat: 'Heat', cool: 'Cool', off: 'Off', auto: 'Auto', heat_cool: 'Heat / cool', dry: 'Dry', fan_only: 'Fan only' },
    statuses: { heating: 'Heating', cooling: 'Cooling', drying: 'Drying', fan: 'Fan', idle: 'Idle', off: 'Off', preheating: 'Preheating', defrosting: 'Defrosting', heat: 'Heat', cool: 'Cool', auto: 'Auto', heat_cool: 'Heat / cool', dry: 'Dry', fan_only: 'Fan only' },
    // Backend last_error carries {code, context, message}; keys are the
    // machine-readable codes from the scheduler backend, {placeholders}
    // are substituted from the error context (plus its message).
    errors: {
      invalid_program: '{message}',
      invalid_time: 'Times must use the HH:MM 24-hour format.',
      invalid_temperature: 'Temperatures must be finite numbers.',
      invalid_hvac_mode: "hvac_mode must be one of off, heat, cool, auto, dry, or fan_only.",
      unsupported_hvac_mode: 'HVAC mode {mode} is not available for this climate entity.',
      entity_validation_failed: 'The climate entity does not accept this program: {message}',
      entity_unavailable: 'The climate entity is unavailable; the target stays pending.',
      service_call_failed: 'The climate service call failed: {message}',
      no_program: 'No schedule exists for this climate entity.',
      unexpected_failure: 'Scheduler error: {message}',
      invalid_enabled: 'enabled must be boolean.',
      invalid_slots: 'slots must be a list.',
      too_many_slots: 'A program may contain at most {max} slots.',
      empty_enabled_program: 'An enabled program needs at least one slot.',
      invalid_away_temperature: 'The outside-schedule temperature must be a finite number.',
      invalid_slot_schema: 'Each slot needs id, days, start, end, and temperature.',
      invalid_slot_id: 'Slot id must start alphanumeric and use letters, digits, dots, underscores, or hyphens.',
      duplicate_slot_id: 'Duplicate slot id: {id}.',
      invalid_days: 'days must be a non-empty list of ISO weekdays 1..7.',
      duplicate_days: 'days cannot contain duplicates.',
      same_start_end: 'Start and end must differ.',
      slots_overlap: 'Slots {a} and {b} overlap.',
      climate_range_unavailable: 'The climate temperature range or step is unavailable.',
      climate_range_invalid: 'The climate temperature range or step is invalid.',
      target_outside_limits: 'Target {value} is outside the climate limits.',
      target_off_step: 'Target {value} is not aligned to the climate temperature step.',
      heat_cool_unsupported: 'Schedules do not support the heat_cool mode.',
    },
    sections: {
      identity: 'Identity and appearance',
      chips: 'Visible elements',
      controls: 'Controls and steps',
    },
    help: {
      entity: 'Climate entity controlled by this card.',
      name: 'Card title; defaults to the entity name.',
      icon: 'Overrides the circular status icon.',
      layout: 'bubble is the horizontal pill card; compact is the previous two-row layout. row remains a deprecated alias.',
      step: 'Increment used by the +/- controls. Leave empty to follow the thermostat target_temp_step (0.5 as fallback).',
      show_state_chip: 'HVAC state and relative time in the status line.',
      show_current_temperature_chip: 'Measured temperature chip.',
      show_humidity_chip: 'Room humidity in the status line when the entity provides it.',
      show_unavailable_badge: 'Indicator when the entity is unavailable.',
      show_mode_buttons: 'HVAC mode dropdown; in the bubble layout modes change from the entity details.',
      show_step_controls: 'Show the decrease/increase arrows around the setpoint.',
      show_schedule_button: 'Show the standalone calendar pill that opens the weekly scheduler.',
    },
  },
  it: {
    unavailable: 'Non disponibile',
    entityUnavailable: 'Entità non disponibile',
    currentTemperature: (value) => `Temperatura attuale ${value}`,
    decrease: 'Abbassa la temperatura target',
    increase: 'Alza la temperatura target',
    target: (value, unit) => `Target ${value}${unit}`,
    targetRange: (low, high, unit) => `Intervallo temperatura target da ${low} a ${high}${unit}`,
    targetUnavailable: 'Target non disponibile',
    openDetails: (label) => `${label}. Apri dettagli`,
    toggleHeating: 'Tocca lo sfondo della scheda per alternare riscaldamento e spento',
    temperatureControls: 'Controlli temperatura',
    openSchedule: 'Apri la pianificazione',
    midpoint: 'Punto medio intervallo temperatura target',
    targetLabel: 'Temperatura target',
    hvacMode: 'Modalità HVAC',
    dontChange: 'Non cambiare',
    badMode: 'Modalità HVAC non supportata.',
    weeklySchedule: 'Pianificazione settimanale',
    scheduleAria: 'Pianificazione climate settimanale',
    close: 'Chiudi',
    closeSchedule: 'Chiudi editor pianificazione',
    backendMissing: 'Backend dello scheduler non installato. Installa e configura bubble_climate_scheduler per modificare un programma.',
    openLegacy: 'Apri pianificazione legacy',
    nextChange: 'Prossimo cambio: ',
    none: 'nessuno',
    active: (id) => ` · Attiva: ${id}`,
    enabled: 'Abilitata',
    outsideSchedule: 'Fuori orario',
    outsideScheduleAria: 'Temperatura fuori orario',
    outsideScheduleTitle: 'Applicata fuori dagli orari programmati; lascia vuoto per mantenere l\u2019ultimo target.',
    slot: (index) => `Fascia ${index}`,
    remove: 'Rimuovi',
    removeSlot: (index) => `Rimuovi fascia ${index}`,
    start: 'Inizio',
    end: 'Fine',
    targetField: 'Target',
    addSlot: '+ Aggiungi fascia',
    deleteProgram: 'Elimina programma',
    saveProgram: 'Salva programma',
    // I nomi completi alimentano gli aria-label; il testo visivo del pill
    // viene da dayPills, le cui etichette di due lettere restano univoche.
    dayNames: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
    dayPills: ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'],
    invalidSchedule: 'Pianificazione non valida.',
    needSlot: 'Una pianificazione abilitata richiede almeno una fascia.',
    awayNumber: 'La temperatura fuori orario deve essere un numero.',
    slotInvalid: 'Ogni fascia richiede giorni, orari validi e un target; inizio e fine devono essere diversi.',
    fields: {
      entity: 'Entità climate', name: 'Nome', icon: 'Icona', layout: 'Layout', step: 'Step (incremento)',
      show_state_chip: 'Mostra stato e tempo relativo', show_current_temperature_chip: 'Mostra temperatura attuale',
      show_humidity_chip: 'Mostra umidità', show_unavailable_badge: 'Mostra badge non disponibile',
      show_mode_buttons: 'Mostra selettore modalità HVAC', show_step_controls: 'Mostra controlli +/−', show_schedule_button: 'Mostra pulsante pianificazione',
    },
    modes: { heat: 'Caldo', cool: 'Freddo', off: 'Spento', auto: 'Automatico', heat_cool: 'Caldo / freddo', dry: 'Deumidificazione', fan_only: 'Solo ventilazione' },
    statuses: { heating: 'Riscaldamento', cooling: 'Raffreddamento', drying: 'Deumidificazione', fan: 'Ventilazione', idle: 'Inattivo', off: 'Spento', preheating: 'Preriscaldamento', defrosting: 'Sbrinamento', heat: 'Caldo', cool: 'Freddo', auto: 'Automatico', heat_cool: 'Caldo / freddo', dry: 'Deumidificazione', fan_only: 'Solo ventilazione' },
    errors: {
      invalid_program: '{message}',
      invalid_time: 'Gli orari devono usare il formato 24 ore HH:MM.',
      invalid_temperature: 'Le temperature devono essere numeri finiti.',
      invalid_hvac_mode: "hvac_mode deve essere uno di off, heat, cool, auto, dry o fan_only.",
      unsupported_hvac_mode: 'La modalità HVAC {mode} non è disponibile per questa entità climate.',
      entity_validation_failed: 'L\u2019entità climate non accetta questo programma: {message}',
      entity_unavailable: 'L\u2019entità climate non è disponibile; il target resta in attesa.',
      service_call_failed: 'La chiamata al servizio climate è fallita: {message}',
      no_program: 'Non esiste una pianificazione per questa entità climate.',
      unexpected_failure: 'Errore dello scheduler: {message}',
      invalid_enabled: 'enabled deve essere booleano.',
      invalid_slots: 'slots deve essere una lista.',
      too_many_slots: 'Un programma può contenere al massimo {max} fasce.',
      empty_enabled_program: 'Un programma abilitato richiede almeno una fascia.',
      invalid_away_temperature: 'La temperatura fuori orario deve essere un numero finito.',
      invalid_slot_schema: 'Ogni fascia richiede id, days, start, end e temperature.',
      invalid_slot_id: 'L\u2019id della fascia deve iniziare con un carattere alfanumerico e usare lettere, cifre, punti, underscore o trattini.',
      duplicate_slot_id: 'Id fascia duplicato: {id}.',
      invalid_days: 'days deve essere una lista non vuota di giorni ISO 1..7.',
      duplicate_days: 'days non può contenere duplicati.',
      same_start_end: 'Inizio e fine devono differire.',
      slots_overlap: 'Le fasce {a} e {b} si sovrappongono.',
      climate_range_unavailable: 'L\u2019intervallo o il passo temperatura del climate non è disponibile.',
      climate_range_invalid: 'L\u2019intervallo o il passo temperatura del climate non è valido.',
      target_outside_limits: 'Il target {value} è fuori dai limiti del climate.',
      target_off_step: 'Il target {value} non è allineato al passo temperatura del climate.',
      heat_cool_unsupported: 'Le pianificazioni non supportano la modalità heat_cool.',
    },
    sections: {
      identity: 'Identità e aspetto',
      chips: 'Elementi visibili',
      controls: 'Controlli e passi',
    },
    help: {
      entity: 'Entità climate controllata da questa card.',
      name: 'Titolo della card; se vuoto usa il nome dell\u2019entità.',
      icon: 'Sostituisce l\u2019icona circolare di stato.',
      layout: 'bubble è la card a pillole orizzontale; compact è il layout precedente a due righe. row resta un alias deprecato.',
      step: 'Passo dei pulsanti +/-. Vuoto per seguire il target_temp_step del termostato (0.5 come fallback).',
      show_state_chip: 'Stato HVAC e tempo relativo nella riga di stato.',
      show_current_temperature_chip: 'Chip della temperatura misurata.',
      show_humidity_chip: 'Umidità nella riga di stato quando l\u2019entità la fornisce.',
      show_unavailable_badge: 'Indicatore quando l\u2019entità non è disponibile.',
      show_mode_buttons: 'Menu a tendina delle modalità HVAC; nel layout bubble si cambiano dai dettagli dell\u2019entità.',
      show_step_controls: 'Mostra le frecce diminuisci/aumenta attorno al setpoint.',
      show_schedule_button: 'Mostra la pillola calendario che apre la pianificazione settimanale.',
    },
  },
};
// Modes a program may set; heat_cool is excluded because a program uses a
// single target temperature, which heat_cool cannot accept.
const SCHEDULABLE_MODES = ['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'];
export const resolveLanguage = (language) => (typeof language === 'string' && language.trim().toLowerCase().startsWith('it') ? 'it' : 'en');
export const cardStrings = (language) => STRINGS[resolveLanguage(language)];
export const fieldLabel = (strings, name) => strings.fields[name] || String(name ?? '').replaceAll('_', ' ');
export const errorLabel = (strings, error) => {
  if (error == null || error === '') return '';
  const dict = typeof error === 'object' ? error : null;
  const code = dict?.code != null ? String(dict.code) : null;
  const message = dict?.message ?? String(error);
  const template = code ? strings?.errors?.[code] : null;
  if (!template) return message || String(error);
  // Placeholders resolve from the error context first, then fall back to the
  // stored raw message so a template with {message} always has a value.
  const values = { ...(dict?.context || {}), message };
  return String(template).replace(/\{(\w+)\}/g, (token, key) => (values[key] != null ? String(values[key]) : token));
};
export const modeLabel = (mode, strings = STRINGS.en) => strings.modes[mode] || String(mode ?? '').replaceAll('_', ' ');
export const effectiveStep = (entity, fallback = 0.5, override = null) => {
  // An explicitly configured step wins over the entity's declared step, so a
  // card can offer 0.5 increments on an entity that declares 1.
  const overrideValue = numeric(override);
  if (overrideValue !== null) return overrideValue > 0 ? overrideValue : null;
  const attributes = entity?.attributes || {};
  const raw = attributes.target_temp_step;
  if (raw !== undefined && raw !== null && !(typeof raw === 'string' && ['unknown', 'unavailable'].includes(raw.trim().toLowerCase()))) {
    const declared = numeric(raw);
    return declared !== null && declared > 0 ? declared : null;
  }
  return numeric(fallback);
};

export const scheduleDraft = (program) => ({ enabled: Boolean(program?.enabled), awayTemperature: program?.away_temperature ?? null, hvacMode: program?.hvac_mode ?? null, slots: (Array.isArray(program?.slots) ? program.slots : []).map((slot) => ({
  id: String(slot.id ?? ''), days: Array.isArray(slot.days) ? slot.days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7) : [],
  start: String(slot.start ?? '08:00'), end: String(slot.end ?? '09:00'), temperature: slot.temperature,
})) });
export const validateScheduleDraft = (draft, strings = STRINGS.en) => {
  if (!draft || typeof draft.enabled !== 'boolean' || !Array.isArray(draft.slots)) return strings.invalidSchedule;
  if (draft.enabled && draft.slots.length === 0) return strings.needSlot;
  const away = draft.awayTemperature;
  if (away !== null && away !== undefined && String(away).trim() !== '' && numeric(away) === null) return strings.awayNumber;
  const mode = draft.hvacMode;
  if (mode !== null && mode !== undefined && mode !== '' && !SCHEDULABLE_MODES.includes(mode)) return strings.badMode;
  for (const slot of draft.slots) {
    if (!slot.id || !Array.isArray(slot.days) || !slot.days.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) || slot.start === slot.end || slot.temperature === '' || numeric(slot.temperature) === null) return strings.slotInvalid;
  }
  return null;
};

export const targetModel = (entity) => {
  const a = entity?.attributes || {}, min = numeric(a.min_temp), max = numeric(a.max_temp);
  const low = numeric(a.target_temp_low), high = numeric(a.target_temp_high);
  const dual = entity?.state === 'heat_cool' && low !== null && high !== null && low <= high;
  const single = entity?.state === 'heat_cool' ? null : numeric(a.temperature);
  const value = dual ? (low + high) / 2 : single;
  const stateAvailable = typeof entity?.state === 'string' && validState(entity.state);
  const limitsValid = min !== null && max !== null && min <= max;
  const gap = dual ? high - low : 0;
  const controllable = stateAvailable && value !== null && limitsValid && (!dual || (gap <= max - min && low >= min && high <= max));
  return { dual, low, high, value, min, max, available: stateAvailable && value !== null, controllable,
    sliderMin: controllable ? (dual ? min + gap / 2 : min) : null,
    sliderMax: controllable ? (dual ? max - gap / 2 : max) : null };
};
const validState = (state) => Boolean(state && !['unknown', 'unavailable'].includes(state));

export const clampTarget = (value, entity, fallbackStep, overrideStep = null) => {
  const n = numeric(value), a = entity?.attributes || {}, min = numeric(a.min_temp), max = numeric(a.max_temp);
  const increment = effectiveStep(entity, fallbackStep, overrideStep);
  if (n === null || min === null || max === null || min > max || increment === null || increment <= 0) return null;
  const scale = Math.max(1, Math.abs(min), Math.abs(max), Math.abs(increment));
  const tolerance = Number.EPSILON * scale * 8;
  const ratio = (max - min) / increment;
  const ratioTolerance = tolerance / increment;
  const adjustedRatio = ratio + ratioTolerance;
  if (!Number.isFinite(ratio) || !Number.isFinite(ratioTolerance) || !Number.isFinite(adjustedRatio) || adjustedRatio > Number.MAX_SAFE_INTEGER) return null;
  let maxIndex = Math.floor(adjustedRatio);
  const gridValue = (i) => Number((min + i * increment).toPrecision(15));
  let corrections = 0;
  while (maxIndex >= 0 && gridValue(maxIndex) > max) {
    if (++corrections > 2) return null;
    maxIndex -= 1;
  }
  if (maxIndex < 0) return null;
  const index = Math.max(0, Math.min(maxIndex, Math.round((n - min) / increment)));
  const snapped = gridValue(index);
  return snapped >= min && snapped <= max ? snapped : null;
};

export const temperaturePayload = (entity, value, step, overrideStep = null) => {
  const requested = numeric(value);
  if (requested === null || !entity || !validState(entity.state)) return null;
  const attrs = entity?.attributes || {};
  if (entity.state === 'heat_cool') {
    if (numeric(attrs.target_temp_low) === null || numeric(attrs.target_temp_high) === null || numeric(attrs.target_temp_low) > numeric(attrs.target_temp_high)) return null;
    const low = numeric(attrs.target_temp_low), high = numeric(attrs.target_temp_high);
    const min = numeric(attrs.min_temp), max = numeric(attrs.max_temp);
    if (min === null || max === null || min > max || high - low > max - min) return null;
    const increment = effectiveStep(entity, step, overrideStep);
    if (increment === null || increment <= 0) return null;
    const delta = requested - (low + high) / 2;
    const minShiftIndex = Math.ceil((min - low) / increment - 1e-10);
    const maxShiftIndex = Math.floor((max - high) / increment + 1e-10);
    if (minShiftIndex > maxShiftIndex) return null;
    const shiftIndex = Math.max(minShiftIndex, Math.min(maxShiftIndex, Math.round(delta / increment)));
    const shift = Number((shiftIndex * increment).toFixed(8));
    return { target_temp_low: Number((low + shift).toFixed(8)), target_temp_high: Number((high + shift).toFixed(8)) };
  }
  const target = clampTarget(requested, entity, step, overrideStep);
  return target === null ? null : { temperature: target };
};

export const hvacToggleMode = (entity) => { if (!entity || !validState(entity.state)) return null; const mode = entity.state === 'off' ? 'heat' : 'off'; return modes(entity).includes(mode) ? mode : null; };

const valid = (v) => v !== undefined && v !== null && v !== '' && v !== 'unknown' && v !== 'unavailable';
export const normalizeLayout = (value) => {
  if (value === undefined || value === null || value === '') return 'bubble';
  return value === 'row' || value === 'bubble' ? 'bubble' : value === 'compact' ? 'compact' : null;
};
export const isClimateActive = (entityOrState) => {
  const state = typeof entityOrState === 'string' ? entityOrState : entityOrState?.state;
  if (typeof state !== 'string') return false;
  const trimmed = state.trim();
  if (!trimmed || trimmed === 'unknown' || trimmed === 'unavailable' || trimmed === 'off') return false;
  return true;
};
export const isScheduleEnabled = (program) => Boolean(program?.enabled);
export const awayTemperaturePayload = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return numeric(value);
};
export const climateStatusKey = (entity) => {
  const action = entity?.attributes?.hvac_action;
  if (typeof action === 'string' && action.trim() && valid(action.trim())) return action.trim();
  return typeof entity?.state === 'string' ? entity.state : '';
};
export const statusLabel = (status, strings = STRINGS.en) => {
  if (typeof status !== 'string') return '';
  const key = status.trim();
  if (!key) return '';
  if (strings.statuses[key]) return strings.statuses[key];
  const human = key.replaceAll('_', ' ').trim();
  return human ? human.charAt(0).toUpperCase() + human.slice(1) : '';
};
export const pickEntityTimestamp = (entity) => {
  for (const candidate of [entity?.last_changed, entity?.last_updated]) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    if (Number.isFinite(Date.parse(candidate))) return candidate;
  }
  return null;
};
export const formatNumber = (value, locale) => {
  const n = typeof value === 'number' ? value : numeric(value);
  if (n === null || !Number.isFinite(n)) return '';
  try {
    const tag = typeof locale === 'string' && locale.trim() ? locale.trim() : undefined;
    if (typeof globalThis.Intl?.NumberFormat === 'function') {
      return new globalThis.Intl.NumberFormat(tag, { maximumFractionDigits: 2 }).format(n);
    }
  } catch {}
  return String(n);
};
export const formatRelativeTime = (timestamp, nowMs = Date.now(), locale) => {
  const time = typeof timestamp === 'number' ? timestamp : typeof timestamp === 'string' ? Date.parse(timestamp) : NaN;
  const now = typeof nowMs === 'number' && Number.isFinite(nowMs) ? nowMs : Date.now();
  if (!Number.isFinite(time) || !Number.isFinite(now)) return '';
  let diffSeconds = Math.round((now - time) / 1000);
  if (diffSeconds < 0) diffSeconds = 0;
  const tag = typeof locale === 'string' && locale.trim() ? locale.trim() : null;
  if (tag) {
    try {
      const RelativeTimeFormat = globalThis.Intl?.RelativeTimeFormat;
      if (typeof RelativeTimeFormat === 'function') {
        const rtf = new RelativeTimeFormat(tag, { numeric: 'auto' });
        if (diffSeconds < 5) return rtf.format(0, 'second');
        if (diffSeconds < 60) return rtf.format(-diffSeconds, 'second');
        const minutes = Math.floor(diffSeconds / 60);
        if (minutes < 60) return rtf.format(-minutes, 'minute');
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return rtf.format(-hours, 'hour');
        return rtf.format(-Math.floor(hours / 24), 'day');
      }
    } catch {}
  }
  if (diffSeconds < 45) return 'just now';
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
};
export const rowStatusParts = (options = {}) => {
  const { statusText = '', humidityValue = null, relativeText = '', showStateChip = true, showHumidityChip = false, locale } = options;
  const parts = [];
  if (showStateChip && typeof statusText === 'string' && statusText) parts.push(String(statusText));
  if (showHumidityChip && numeric(humidityValue) !== null) parts.push(`${formatNumber(numeric(humidityValue), locale)}%`);
  if (showStateChip && relativeText) parts.push(String(relativeText));
  return parts;
};
export const currentTemperatureDisplay = (value, unit, locale) => {
  const formatted = formatNumber(value, locale);
  return formatted ? `${formatted} ${unit}` : '';
};
const modes = (entity) => Array.isArray(entity?.attributes?.hvac_modes) ? entity.attributes.hvac_modes : [];
export const schedulableModes = (entity) => {
  const available = modes(entity);
  const supported = available.length ? available : SCHEDULABLE_MODES;
  return SCHEDULABLE_MODES.filter((mode) => supported.includes(mode));
};
const HTMLElementBase = globalThis.HTMLElement ?? class {};

// Preset for freshly created cards: it deliberately omits `step`, because a
// configured step is an explicit override. Without it the card follows the
// entity's target_temp_step and keeps 0.5 only as the runtime fallback for an
// entity that declares no step.
export const defaultCardConfig = (entity = 'climate.example') => ({
  entity, layout: 'bubble',
  show_state_chip: true, show_current_temperature_chip: true, show_humidity_chip: false,
  show_unavailable_badge: true, show_mode_buttons: true, show_step_controls: true, show_schedule_button: true,
});
export const getEntitySuggestion = (_hass, entityId) => typeof entityId === 'string' && entityId.startsWith('climate.')
  ? { type: 'custom:bubble-climate-card', ...defaultCardConfig(entityId) }
  : null;

const field = (name, selector) => ({ name, selector });
const grid = (name, schema) => ({ type: 'grid', name, schema });
const expandable = (name, schema, collapsed = true) => ({ type: 'expandable', name, collapsed, schema });
export const configSchema = [
  grid('identity', [
    field('entity', { entity: { filter: { domain: ['climate'] } } }),
    field('name', { text: {} }),
    field('icon', { icon: {} }),
    field('layout', { select: { mode: 'dropdown', options: ['bubble', 'compact'] } }),
  ]),
  grid('chips', ['show_state_chip', 'show_current_temperature_chip', 'show_humidity_chip', 'show_unavailable_badge'].map((name) => field(name, { boolean: {} }))),
  // Advanced controls start collapsed: new presets omit step so the entity's
  // declared target_temp_step is respected by default.
  expandable('controls', [
    ...['show_mode_buttons', 'show_step_controls', 'show_schedule_button'].map((name) => field(name, { boolean: {} })),
    field('step', { number: { min: 0.01, max: 10, step: 0.01, mode: 'box' } }),
  ]),
];
export const configSchemaFields = () => {
  const flatten = (items) => items.flatMap((item) => (Array.isArray(item?.schema) ? flatten(item.schema) : [item]));
  return flatten(configSchema).filter((item) => item.name);
};

export const sameCardConfig = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[key] !== b[key]) return false;
  return true;
};

export class BubbleClimateCardEditor extends HTMLElementBase {
  set hass(value) {
    this._hass = value;
    // Forward to the existing form instead of rebuilding it: recreating the
    // form on every hass tick (or config echo) dropped keyboard focus, so
    // typing a name required one click per letter.
    if (this._form) this._form.hass = value;
    if (this._preview) this._preview.hass = value;
  }
  setConfig(config) {
    this._config = { ...defaultCardConfig(config?.entity || 'climate.example'), ...config, layout: normalizeLayout(config?.layout) || 'bubble' };
    this._formData = null;
    this._previewData = null;
    this._render();
  }
  _strings() { return cardStrings(this._hass?.locale?.language); }
  _render() {
    if (!this.attachShadow) return;
    if (!this._form) {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      // The grouped schema (grid/expandable) is served by hui-form when the
      // dashboard frontend is loaded; ha-form is the standalone fallback.
      const form = document.createElement(globalThis.customElements?.get?.('hui-form') ? 'hui-form' : 'ha-form');
      form.schema = configSchema;
      form.computeLabel = (schema) => this._strings().sections[schema.name] || fieldLabel(this._strings(), schema.name);
      // Field descriptions come from the localized help guide; form versions
      // without computeHelper support simply ignore the property.
      form.computeHelper = (schema) => this._strings().help[schema.name] || '';
      form.addEventListener('value-changed', (event) => {
        event.stopPropagation();
        this._config = { ...this._config, ...(event.detail?.value || {}) };
        this._formData = { ...this._config };
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: { ...this._config } }, bubbles: true, composed: true }));
        if (this._preview) { this._preview.setConfig({ ...this._config }); this._previewData = { ...this._config }; }
      });
      // Live preview: the same card component fed with the edited config and
      // the real hass object, inert because clicks are disabled on the box.
      const previewBox = document.createElement('div');
      previewBox.className = 'preview';
      const style = document.createElement('style');
      style.textContent = '.preview{pointer-events:none}';
      const preview = document.createElement('bubble-climate-card');
      preview.setConfig({ ...this._config });
      this._previewData = { ...this._config };
      previewBox.append(preview);
      this.shadowRoot.append(form, previewBox);
      this._form = form;
      this._preview = preview;
    }
    this._form.hass = this._hass;
    // Only push a changed config back into the form; echoing our own edit would
    // reset the form (and the caret) while the user is typing.
    if (!sameCardConfig(this._formData, this._config)) {
      this._form.data = { ...this._config };
      this._formData = { ...this._config };
    }
    if (this._preview && !sameCardConfig(this._previewData, this._config)) {
      this._preview.setConfig({ ...this._config });
      this._previewData = { ...this._config };
    }
    if (this._preview && this._hass) this._preview.hass = this._hass;
  }
}

export class BubbleClimateCard extends HTMLElementBase {
  static getConfigElement() { return document.createElement('bubble-climate-card-editor'); }
  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find((id) => id.startsWith('climate.')) || 'climate.example';
    return defaultCardConfig(entity);
  }
  setConfig(config) {
    if (!config?.entity || !/^climate\./.test(config.entity)) throw new Error('Specify a climate entity (climate.*).');
    const layout = normalizeLayout(config.layout);
    if (!layout) throw new Error('Supported layouts are "bubble" and "compact" (legacy alias: "row").');
    if (config.step !== undefined && (numeric(config.step) === null || numeric(config.step) <= 0)) throw new Error('step must be a number greater than zero.');
    this._stepOverride = config.step === undefined ? null : numeric(config.step);
    this.config = { layout: 'bubble', show_state_chip: true, show_current_temperature_chip: true, show_humidity_chip: false,
      show_unavailable_badge: true, show_mode_buttons: true, show_step_controls: true, show_schedule_button: true, step: 0.5, ...config, layout };
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._renderPreservingDeltaFocus();
  }
  set hass(hass) { this._hass = hass; this._reconcileOptimistic(); this._renderPreservingDeltaFocus(); }
  disconnectedCallback() { clearTimeout(this._optimisticTimer); this._optimisticTimer = null; this._optimistic = null; }
  getCardSize() { return this.config?.layout === 'compact' ? 2 : 1; }
  _service(domain, service, data) { if (this._hass) this._hass.callService(domain, service, data); }
  _statusDisplay(entity, strings = STRINGS.en) {
    const key = climateStatusKey(entity);
    const hass = this._hass;
    try {
      const action = entity?.attributes?.hvac_action;
      if (typeof action === 'string' && action.trim() && valid(action.trim()) && typeof hass?.formatEntityAttributeValue === 'function') {
        const formatted = hass.formatEntityAttributeValue(entity, 'hvac_action');
        if (typeof formatted === 'string' && formatted.trim()) return formatted;
      }
    } catch {}
    try {
      if (typeof hass?.formatEntityState === 'function' && entity) {
        const formatted = hass.formatEntityState({ ...entity, state: String(key || entity.state || '') });
        if (typeof formatted === 'string' && formatted.trim()) return formatted;
      }
    } catch {}
    return statusLabel(key || entity?.state, strings);
  }
  _relativeDisplay(entity) {
    const timestamp = pickEntityTimestamp(entity);
    if (!timestamp) return '';
    try {
      return formatRelativeTime(timestamp, Date.now(), this._hass?.locale?.language);
    } catch { return ''; }
  }
  _render() {
    if (!this.shadowRoot || !this.config) return;
    if (this._scheduleOpen && this.shadowRoot.querySelector('dialog[open]')) return;
    if ((this.config.layout ?? 'bubble') === 'compact') this._renderCompact();
    else this._renderRow();
  }
  _renderRow() {
    const c = this.config, e = this._displayEntity(this._hass?.states?.[c.entity]), a = e?.attributes || {};
    const unavailable = !e || !valid(e.state);
    const active = !unavailable && isClimateActive(e);
    const currentValue = numeric(a.current_temperature);
    const model = targetModel(e);
    const unit = this._hass?.config?.unit_system?.temperature || '°C';
    const target = model.value;
    const title = c.name || a.friendly_name || c.entity;
    const hasTarget = !unavailable && model.available;
    const step = effectiveStep(e, c.step, this._stepOverride);
    const adjustable = hasTarget && model.controllable && step !== null && step > 0;
    const locale = this._hass?.locale?.language;
    const t = cardStrings(locale);
    const statusText = unavailable ? '' : this._statusDisplay(e, t);
    const relativeText = unavailable ? '' : this._relativeDisplay(e);
    const humidityValue = numeric(a.current_humidity);
    const scheduleActive = isScheduleEnabled(this._scheduleProgram());
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,inherit)}
       ha-card{border:1px solid var(--divider-color);border-radius:var(--bubble-border-radius,18px);background:var(--ha-card-background,var(--card-background-color));padding:8px 10px;box-sizing:border-box;min-height:64px;display:block;overflow:hidden;cursor:pointer}ha-card:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
       .row{display:flex;align-items:center;gap:10px;min-width:0}
      .icon{width:40px;height:40px;flex:0 0 40px;border-radius:50%;display:grid;place-items:center;background:var(--secondary-background-color);color:var(--secondary-text-color);border:1px solid var(--divider-color)}
      .icon[data-active="true"]{background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff);border-color:transparent}
      .icon ha-icon{--mdc-icon-size:22px}
      .meta{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:2px;overflow:hidden}
      .title{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
       .status{font-size:12px;color:var(--secondary-text-color);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
       .status-line{display:flex;min-width:0;gap:0;white-space:nowrap;overflow:hidden}
       .status-line span{min-width:0;overflow:hidden;text-overflow:ellipsis}
       .status-line span+span:before{content:' · ';white-space:pre;color:var(--secondary-text-color)}
       .status-line .relative{flex:0 0 auto;overflow:visible}
      .current{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:600;padding:9px 13px;border-radius:999px;background:var(--secondary-background-color);color:var(--primary-text-color);white-space:nowrap}
      .current[data-active="true"]{background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff)}
      .current ha-icon{--mdc-icon-size:15px;display:block;color:currentColor;opacity:.85}
      .current span{white-space:nowrap}
      .row [hidden]{display:none!important}
       .controls{flex:0 1 auto;min-width:0;display:flex;align-items:center;gap:0;background:var(--secondary-background-color);border-radius:999px;padding:2px;max-width:42%;overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain;scrollbar-width:thin}
       .controls button{font:inherit;font-size:14px;color:var(--primary-text-color);background:transparent;border:0;border-radius:999px;padding:7px 10px;cursor:pointer;white-space:nowrap;flex:0 0 auto}
      .controls button:hover{background:var(--divider-color)}
      .controls button:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
      .controls button:disabled{opacity:.45;cursor:default;background:var(--secondary-background-color)}
       .controls .setpoint{font-weight:600;min-width:58px;text-align:center;background:transparent;font-size:14px;padding:7px 2px}
      .controls .setpoint:hover{background:transparent}
      .controls .setpoint:focus-visible{outline-offset:0;border-radius:10px}
       .schedule{display:grid;place-items:center;flex:0 0 auto;padding:8px 11px;font:inherit;color:var(--primary-text-color);background:var(--secondary-background-color);border:0;border-radius:999px;cursor:pointer}
       .schedule[data-active="true"]{background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff)}
       .schedule:hover:not([data-active="true"]){background:var(--divider-color)}.schedule[data-active="true"]:hover{background:var(--bubble-accent-color,var(--primary-color))}.schedule:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.schedule ha-icon{--mdc-icon-size:18px;display:block}
        @media(max-width:420px){ha-card{padding:7px 8px}.row{gap:7px}.icon{width:34px;height:34px;flex-basis:34px}.icon ha-icon{--mdc-icon-size:19px}.current{font-size:12px;padding:6px 8px}.controls button{padding:6px 7px;font-size:13px}.controls .setpoint{min-width:48px}.schedule{padding:6px 8px}}
     </style><ha-card tabindex="0" role="group" aria-label="Tap card background to toggle heating"><div class="row"><span class="icon"><ha-icon></ha-icon></span><div class="meta"><span class="title"></span><span class="status"></span></div><span class="current"><ha-icon></ha-icon><span></span></span><div class="controls"></div><button class="schedule" aria-label="Open schedule details" title="Open schedule details"><ha-icon icon="mdi:calendar-clock"></ha-icon></button></div></ha-card>`;
    const root = this.shadowRoot;
    this._bindCardToggle(root.querySelector('ha-card'));
    root.querySelector('ha-card').setAttribute('aria-label', t.toggleHeating);
    const icon = root.querySelector('.icon');
    icon.dataset.active = active ? 'true' : 'false';
    root.querySelector('.icon ha-icon').setAttribute('icon', String(c.icon || a.icon || 'mdi:thermostat'));
    root.querySelector('.icon ha-icon').setAttribute('aria-hidden', 'true');
    root.querySelector('.title').textContent = String(title);
    const statusEl = root.querySelector('.status');
    if (unavailable) {
      if (c.show_unavailable_badge) statusEl.textContent = t.unavailable;
      else statusEl.hidden = true;
    } else {
      const parts = rowStatusParts({ statusText, humidityValue, relativeText, showStateChip: c.show_state_chip, showHumidityChip: c.show_humidity_chip, locale });
       if (parts.length) {
         const statusLine = document.createElement('span'); statusLine.className = 'status-line';
         parts.forEach((part) => { const item = document.createElement('span'); item.textContent = part; if (part === relativeText && c.show_state_chip) item.className = 'relative'; statusLine.append(item); });
         statusEl.append(statusLine);
       }
      else statusEl.hidden = true;
    }
    const currentEl = root.querySelector('.current');
    const currentIcon = currentEl.querySelector('ha-icon');
    currentIcon.setAttribute('icon', 'mdi:home-thermometer');
    currentIcon.setAttribute('aria-hidden', 'true');
    currentEl.dataset.active = String(active && !unavailable);
    const currentText = currentEl.querySelector('span');
    if (c.show_current_temperature_chip && !unavailable && currentValue !== null) {
      const currentDisplay = currentTemperatureDisplay(currentValue, unit, locale);
      currentText.textContent = currentDisplay;
      currentEl.setAttribute('role', 'img');
      currentEl.setAttribute('aria-label', t.currentTemperature(currentDisplay));
    } else currentEl.hidden = true;
    const controls = root.querySelector('.controls');
    const schedule = root.querySelector('.schedule');
    schedule.dataset.active = scheduleActive ? 'true' : 'false';
    schedule.setAttribute('aria-label', t.openSchedule);
    schedule.title = t.openSchedule;
    schedule.hidden = !c.show_schedule_button || unavailable;
    schedule.addEventListener('click', () => this._openSchedule());
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', t.temperatureControls);
    controls.tabIndex = 0;
    if (unavailable) controls.hidden = true;
    else {
      if (c.show_step_controls && adjustable) { const minus = document.createElement('button'); minus.dataset.delta = String(-step); minus.setAttribute('aria-label', t.decrease); minus.textContent = '−'; controls.append(minus); }
      const setpoint = document.createElement('button');
      setpoint.className = 'setpoint';
      if (hasTarget) {
        const targetDisplay = formatNumber(target, locale);
        const lowDisplay = formatNumber(model.low, locale);
        const highDisplay = formatNumber(model.high, locale);
        const label = model.dual ? `${lowDisplay}–${highDisplay} ${unit}` : `${targetDisplay} ${unit}`;
        const accessible = model.dual ? t.targetRange(lowDisplay, highDisplay, unit) : t.target(targetDisplay, unit);
        setpoint.textContent = label;
        setpoint.title = accessible;
        setpoint.setAttribute('aria-label', t.openDetails(accessible));
      } else {
        setpoint.textContent = '—';
        setpoint.setAttribute('aria-label', t.targetUnavailable);
        setpoint.disabled = true;
      }
      controls.append(setpoint);
      if (c.show_step_controls && adjustable) { const plus = document.createElement('button'); plus.dataset.delta = String(step); plus.setAttribute('aria-label', t.increase); plus.textContent = '+'; controls.append(plus); }
      if (!controls.children.length) controls.hidden = true;
      setpoint.addEventListener('click', () => {
        if (setpoint.disabled) return;
        this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: c.entity }, bubbles: true, composed: true }));
      });
      controls.querySelectorAll('[data-delta]').forEach((b) => b.addEventListener('click', () => this._setTemperature(target + Number(b.dataset.delta), e)));
    }
  }
  _renderCompact() {
    const c = this.config, e = this._displayEntity(this._hass?.states?.[c.entity]), a = e?.attributes || {};
    const unavailable = !e || !valid(e.state);
    const currentValue = numeric(a.current_temperature);
    const model = targetModel(e);
    const unit = this._hass?.config?.unit_system?.temperature || '°C';
    const current = currentValue !== null ? `${currentValue}${unit}` : '—';
    const target = model.value;
    const title = c.name || a.friendly_name || c.entity;
    const modeList = modes(e).filter((m) => valid(m));
    const hasTarget = !unavailable && model.available;
    const step = effectiveStep(e, c.step, this._stepOverride);
    const t = cardStrings(this._hass?.locale?.language);
    const scheduleActive = isScheduleEnabled(this._scheduleProgram());
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,inherit)}
      ha-card{border-radius:var(--bubble-border-radius,20px);background:var(--ha-card-background,var(--card-background-color));padding:8px 12px;box-sizing:border-box;min-height:88px;display:grid;grid-template-rows:36px 36px;gap:4px;overflow:hidden;cursor:pointer}ha-card:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
      .head,.body{display:flex;align-items:center;gap:8px;min-width:0;white-space:nowrap;overflow:hidden}
      .body{overflow-x:auto;overflow-y:hidden}
      .icon{width:32px;height:32px;flex:0 0 32px;border-radius:50%;display:grid;place-items:center;background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff)}
      .icon ha-icon{--mdc-icon-size:20px}.title{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.chips{display:flex;gap:4px;flex:0 1 auto;min-width:0;overflow:hidden}.chip{font-size:11px;padding:4px 7px;border-radius:999px;background:var(--secondary-background-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;flex:0 1 auto}
      .target{font-size:20px;color:var(--primary-text-color);font-weight:600;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}.target strong{font:inherit}
      input[type=range]{width:auto;flex:1 0 45px;min-width:45px;accent-color:var(--primary-color);margin:0}
      .body button{padding:5px 6px;min-width:28px;flex:0 0 auto}.body select{width:clamp(54px,22vw,104px);max-width:104px;min-width:54px;flex:0 0 clamp(54px,22vw,104px);overflow:hidden;text-overflow:ellipsis;font:inherit;color:var(--primary-text-color);background:var(--secondary-background-color);border:0;border-radius:999px;padding:7px 5px}
      button{font:inherit;color:var(--primary-text-color);background:var(--secondary-background-color);border:0;border-radius:999px;padding:7px 11px;cursor:pointer}.head .schedule[data-active="true"]{background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff)}button:focus-visible,input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.selected{background:var(--primary-color);color:var(--text-primary-color,#fff)}
      select:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.badge{color:var(--error-color);font-size:11px;white-space:nowrap}.empty{color:var(--secondary-text-color);overflow:hidden;text-overflow:ellipsis}
      @media(max-width:420px){ha-card{padding:7px 9px}.head,.body{gap:4px}.target{font-size:16px}.body button{padding:4px 5px;min-width:24px}.chip{max-width:62px}}
    </style><ha-card tabindex="0" role="group" aria-label="Tap card background to toggle heating"><div class="head"><span class="icon"><ha-icon></ha-icon></span><span class="title"></span><span class="chips"></span><button class="schedule" aria-label="Open schedule details" title="Open schedule details"><ha-icon icon="mdi:calendar-clock"></ha-icon></button></div>
       <div class="body"></div></ha-card>`;
    const root = this.shadowRoot;
    this._bindCardToggle(root.querySelector('ha-card'));
    root.querySelector('ha-card').setAttribute('aria-label', t.toggleHeating);
    root.querySelector('.icon ha-icon').setAttribute('icon', String(c.icon || a.icon || 'mdi:thermostat'));
    root.querySelector('.title').textContent = String(title);
    const chips = root.querySelector('.chips');
    const addChip = (show, text) => { if (show && text) { const span = document.createElement('span'); span.className = 'chip'; span.textContent = String(text); chips.append(span); } };
    addChip(c.show_state_chip && !unavailable, modeLabel(e?.state, t));
    addChip(c.show_current_temperature_chip && !unavailable, currentValue !== null ? `${currentValue}${unit}` : '');
    addChip(c.show_humidity_chip && !unavailable, numeric(a.current_humidity) !== null ? `${numeric(a.current_humidity)}%` : '');
    if (c.show_unavailable_badge && unavailable) { const b=document.createElement('span'); b.className='badge'; b.textContent=t.unavailable; chips.append(b); }
    const schedule = root.querySelector('.schedule');
    schedule.setAttribute('aria-label', t.openSchedule);
    schedule.title = t.openSchedule;
    schedule.dataset.active = scheduleActive ? 'true' : 'false';
    schedule.hidden = !c.show_schedule_button;
    const body = root.querySelector('.body');
    if (unavailable) { const message=document.createElement('span'); message.className='empty'; message.textContent=t.entityUnavailable; body.append(message); }
    else {
      const targetText=document.createElement('span'); targetText.className='target'; targetText.textContent=hasTarget ? '' : t.targetUnavailable;
      if (hasTarget) {
        targetText.title = model.dual ? t.targetRange(model.low, model.high, unit) : t.target(target, unit);
        const value=document.createElement('strong');
        if (model.dual) {
          value.textContent=`${model.low}–${model.high}${unit}`;
          targetText.setAttribute('aria-label', t.targetRange(model.low, model.high, unit));
        } else {
          value.textContent=`${target}${unit}`;
          targetText.setAttribute('aria-label', t.target(target, unit));
        }
        targetText.append(value);
      }
      body.append(targetText);
      if (hasTarget && model.controllable && step !== null && step > 0) {
         if (c.show_step_controls) for (const [d,label,text] of [[-step,t.decrease,'−'],[step,t.increase,'+']]) { const button=document.createElement('button'); button.dataset.delta=String(d); button.setAttribute('aria-label',label); button.textContent=text; body.append(button); }
         const slider=document.createElement('input'); slider.className='slider'; slider.type='range'; slider.setAttribute('aria-label',model.dual?t.midpoint:t.targetLabel);
         slider.min=String(model.sliderMin); slider.max=String(model.sliderMax); slider.step=String(step); slider.value=String(target); body.append(slider);
      }
      if (c.show_mode_buttons && modeList.length) { const select=document.createElement('select'); select.className='hvac-mode'; select.setAttribute('aria-label',t.hvacMode); for(const m of modeList){const option=document.createElement('option');option.value=String(m);option.textContent=modeLabel(m,t);select.append(option)} select.value=modeList.includes(e.state)?e.state:modeList[0]; body.append(select); }
    }
    this.shadowRoot.querySelector('.slider')?.addEventListener('change', (ev) => this._setTemperature(ev.target.value, e));
    root.querySelectorAll('[data-delta]').forEach((b) => b.addEventListener('click', () => this._setTemperature(target + Number(b.dataset.delta), e)));
    root.querySelector('select.hvac-mode')?.addEventListener('change', (ev) => { if (!unavailable && modes(e).includes(ev.target.value)) this._service('climate', 'set_hvac_mode', { entity_id: c.entity, hvac_mode: ev.target.value }); });
    schedule.addEventListener('click', () => this._openSchedule());
  }
  _scheduleSensor() {
    return Object.values(this._hass?.states || {}).find((state) => state?.attributes?.scheduler_domain === 'bubble_climate_scheduler') || null;
  }
  _scheduleProgram() {
    return this._scheduleSensor()?.attributes?.programs?.[this.config.entity] || null;
  }
  _openSchedule() {
    const program = this._scheduleProgram();
    this._scheduleOpen = true; this._scheduleDraft = scheduleDraft(program); this._scheduleError = ''; this._renderScheduleDialog();
  }
  _closeSchedule(dialog) {
    this._scheduleOpen = false;
    if (dialog?.open) dialog.close();
    dialog?.remove();
    this._render();
  }
  _scheduleDialogStyle() {
    return `<style>
      dialog{color:var(--primary-text-color);background:var(--card-background-color,var(--ha-card-background));border:0;border-radius:24px;width:min(640px,calc(100vw - 40px));max-height:85vh;overflow:auto;padding:0;box-shadow:0 12px 40px rgba(0,0,0,.35)}
      dialog::backdrop{background:rgba(0,0,0,.55);backdrop-filter:blur(3px)}
      .dlg-head{display:flex;align-items:center;gap:12px;padding:18px 22px 14px;border-bottom:1px solid var(--divider-color);position:sticky;top:0;background:var(--card-background-color,var(--ha-card-background));z-index:1}
      .dlg-head .dlg-icon{width:40px;height:40px;flex:0 0 40px;border-radius:50%;display:grid;place-items:center;background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff)}
      .dlg-head .dlg-icon ha-icon{--mdc-icon-size:22px;display:block}
      .dlg-head .dlg-titles{flex:1 1 auto;min-width:0}
      .dlg-head h2{margin:0;font-size:17px;font-weight:600}
      .dlg-head .dlg-sub{font-size:12px;color:var(--secondary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dlg-head .close{flex:0 0 auto;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;border:0;background:var(--secondary-background-color);color:var(--primary-text-color);cursor:pointer}
      .dlg-head .close:hover{background:var(--divider-color)}
      .dlg-head .close ha-icon{--mdc-icon-size:18px;display:block}
      .dlg-body{padding:16px 22px 20px}
      .statusline{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;background:var(--secondary-background-color);font-size:13px;color:var(--secondary-text-color);margin-bottom:14px}
      .statusline .chip{font-weight:600;color:var(--primary-text-color)}
      .error{color:var(--error-color);font-size:13px;margin:8px 0}
      .switch{display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:600;cursor:pointer;user-select:none;margin-bottom:14px}
      .switch input{appearance:none;width:42px;height:24px;border-radius:999px;background:var(--divider-color);position:relative;cursor:pointer;transition:background .2s;margin:0}
      .switch input::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--text-primary-color,#fff);transition:transform .2s}
      .switch input:checked{background:var(--bubble-accent-color,var(--primary-color))}
      .switch input:checked::after{transform:translateX(18px)}
      .switch input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
      .slot{border:1px solid var(--divider-color);border-radius:16px;padding:14px;margin:0 0 12px;background:var(--secondary-background-color)}
      .slot .slot-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
      .slot h3{margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--secondary-text-color)}
      .slot .remove{border:0;background:transparent;color:var(--error-color);font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:5px 9px;border-radius:999px}
      .slot .remove:hover{background:color-mix(in srgb,var(--error-color) 12%,transparent)}
      .days{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}
      .days label{position:relative;cursor:pointer}
      .days input{position:absolute;opacity:0;width:1px;height:1px;margin:0;inset:auto}
      .days .day{display:grid;place-items:center;min-width:38px;height:32px;padding:0 6px;border-radius:999px;background:var(--card-background-color,var(--ha-card-background));font-size:12px;font-weight:600;color:var(--secondary-text-color);transition:background .15s,color .15s}
      .days input:checked ~ .day{background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff)}
      .days input:focus-visible ~ .day{outline:2px solid var(--primary-color);outline-offset:2px}
      .field{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .field label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--secondary-text-color)}
      .field input{font:inherit;font-size:14px;color:var(--primary-text-color);background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:10px;padding:7px 10px}
      .field input:focus-visible{outline:2px solid var(--primary-color);outline-offset:1px;border-color:transparent}
      .field select{font:inherit;font-size:14px;color:var(--primary-text-color);background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:10px;padding:7px 10px}
      .field select:focus-visible{outline:2px solid var(--primary-color);outline-offset:1px;border-color:transparent}
      .field.mode{margin:0 0 14px}
      .field.outside{margin:0 0 14px}
      .field.outside label{color:var(--primary-text-color);font-weight:600}
      .dlg-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
      .btn{font:inherit;font-size:14px;font-weight:600;color:var(--primary-text-color);background:var(--secondary-background-color);border:0;border-radius:999px;padding:9px 16px;cursor:pointer;white-space:nowrap}
      .btn:hover{background:var(--divider-color)}
      .btn:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
      .btn.primary{background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff)}
      .btn.danger{color:var(--error-color)}
      .btn.ghost{background:transparent}
      .btn.ghost:hover{background:var(--secondary-background-color)}
    </style>`;
  }
  _renderScheduleDialog() {
    const t = cardStrings(this._hass?.locale?.language);
    const old = this.shadowRoot.querySelector('dialog'); old?.remove();
    const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', t.scheduleAria);
    dialog.innerHTML = `${this._scheduleDialogStyle()}<div class="dlg-head"><span class="dlg-icon"><ha-icon icon="mdi:calendar-clock"></ha-icon></span><div class="dlg-titles"><h2>${t.weeklySchedule}</h2><div class="dlg-sub"></div></div><button class="close" aria-label="${t.closeSchedule}" title="${t.close}"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="dlg-body"></div>`;
    const body = dialog.querySelector('.dlg-body');
    dialog.querySelector('.close').addEventListener('click', () => this._closeSchedule(dialog));
    dialog.querySelector('.dlg-sub').textContent = this.config.name || this.config.entity;
    const sensor = this._scheduleSensor(), program = sensor?.attributes?.programs?.[this.config.entity];
    const entity = this._hass?.states?.[this.config.entity];
    if (!sensor) {
      const p = document.createElement('p'); p.className = 'error'; p.textContent = t.backendMissing; body.append(p);
      if (typeof this.config.schedule_entity === 'string' && /^schedule\.[\w-]+$/.test(this.config.schedule_entity)) { const link = document.createElement('button'); link.className = 'btn'; link.textContent = t.openLegacy; link.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this.config.schedule_entity }, bubbles: true, composed: true }))); body.append(link); }
    } else {
      const statusline = document.createElement('div'); statusline.className = 'statusline';
      const stLabel = document.createElement('span'); stLabel.textContent = t.nextChange;
      const stValue = document.createElement('span'); stValue.className = 'chip'; stValue.textContent = program?.next_change || t.none;
      statusline.append(stLabel, stValue);
      if (program?.active_slot_id) { const act = document.createElement('span'); act.textContent = t.active(program.active_slot_id); statusline.append(act); }
      body.append(statusline);
      if (program?.last_error) { const p = document.createElement('p'); p.className = 'error'; p.textContent = errorLabel(t, program.last_error); body.append(p); }
      const enabledLabel = document.createElement('label'), enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = Boolean(this._scheduleDraft.enabled); enabledLabel.className = 'switch'; enabledLabel.append(enabled, document.createTextNode(t.enabled)); enabled.addEventListener('change', () => this._scheduleDraft.enabled = enabled.checked);      body.append(enabledLabel);
      const modeField = document.createElement('div'); modeField.className = 'field mode';
      const modeFieldLabel = document.createElement('label'); modeFieldLabel.textContent = t.hvacMode;
      const modeSelect = document.createElement('select'); modeSelect.setAttribute('aria-label', t.hvacMode);
      const modeNone = document.createElement('option'); modeNone.value = ''; modeNone.textContent = t.dontChange; modeSelect.append(modeNone);
      for (const m of schedulableModes(entity)) { const option = document.createElement('option'); option.value = m; option.textContent = modeLabel(m, t); modeSelect.append(option); }
      modeSelect.value = this._scheduleDraft.hvacMode ?? '';
      modeSelect.addEventListener('change', () => { this._scheduleDraft.hvacMode = modeSelect.value || null; });
      modeFieldLabel.append(modeSelect); modeField.append(modeFieldLabel); body.append(modeField);
      const awayField = document.createElement('div'); awayField.className = 'field outside';
      const awayLabel = document.createElement('label'); awayLabel.textContent = t.outsideSchedule;
      const awayInput = document.createElement('input'); awayInput.type = 'number'; awayInput.step = 'any'; awayInput.value = this._scheduleDraft.awayTemperature ?? ''; awayInput.setAttribute('aria-label', t.outsideScheduleAria); awayInput.title = t.outsideScheduleTitle;
      awayInput.addEventListener('input', () => this._scheduleDraft.awayTemperature = awayInput.value);
      awayLabel.append(awayInput); awayField.append(awayLabel); body.append(awayField);
      const slots = document.createElement('div');
      const renderSlots = () => { slots.replaceChildren(); this._scheduleDraft.slots.forEach((slot, index) => {
        const box = document.createElement('section'); box.className = 'slot';
        const slotHead = document.createElement('div'); slotHead.className = 'slot-head';
        const title = document.createElement('h3'); title.textContent = t.slot(index + 1);
        const remove = document.createElement('button'); remove.className = 'remove'; remove.textContent = t.remove; remove.setAttribute('aria-label', t.removeSlot(index + 1)); remove.addEventListener('click', () => { this._scheduleDraft.slots.splice(index, 1); renderSlots(); });
        slotHead.append(title, remove); box.append(slotHead);
        const days = document.createElement('div'); days.className = 'days'; t.dayNames.forEach((name, i) => {
          // Pill text comes from the day index (unique two-letter label); the
          // checkbox keeps the full accessible name and its ISO weekday i + 1.
          const label = document.createElement('label'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = slot.days.includes(i + 1); cb.setAttribute('aria-label', name); cb.addEventListener('change', () => { slot.days = cb.checked ? [...new Set([...slot.days, i + 1])] : slot.days.filter((x) => x !== i + 1); });
          const pill = document.createElement('span'); pill.className = 'day'; pill.textContent = t.dayPills[i]; label.append(cb, pill); days.append(label);
        }); box.append(days);
        const field = document.createElement('div'); field.className = 'field';
        for (const [key, labelText, type] of [['start', t.start, 'time'], ['end', t.end, 'time'], ['temperature', t.targetField, 'number']]) {
          const label = document.createElement('label'); label.textContent = labelText;
          const input = document.createElement('input'); input.type = type; input.value = String(slot[key]); if (key === 'temperature') input.step = 'any'; input.setAttribute('aria-label', labelText); input.addEventListener('input', () => slot[key] = input.value);
          label.append(input); field.append(label);
        }
        box.append(field); slots.append(box);
      })}; renderSlots(); body.append(slots);
      const error = document.createElement('p'); error.className = 'error'; error.textContent = this._scheduleError || '';
      const add = document.createElement('button'); add.className = 'btn ghost'; add.textContent = t.addSlot; add.addEventListener('click', () => { this._scheduleDraft.slots.push({ id: globalThis.crypto?.randomUUID?.() || `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`, days: [1], start: '08:00', end: '09:00', temperature: 20 }); renderSlots(); });
      body.append(add); body.append(error);
      const actions = document.createElement('div'); actions.className = 'dlg-actions';
      const del = document.createElement('button'); del.className = 'btn danger'; del.textContent = t.deleteProgram; del.addEventListener('click', async () => { try { await this._hass.callService('bubble_climate_scheduler', 'delete_program', { climate_entity: this.config.entity }); this._closeSchedule(dialog); } catch (err) { error.textContent = errorLabel(t, err?.message || err); } }); actions.append(del);
      const save = document.createElement('button'); save.className = 'btn primary'; save.textContent = t.saveProgram; save.addEventListener('click', async () => { const issue = validateScheduleDraft(this._scheduleDraft, t); if (issue) { error.textContent = issue; return; } try { await this._hass.callService('bubble_climate_scheduler', 'save_program', { climate_entity: this.config.entity, enabled: this._scheduleDraft.enabled, slots: this._scheduleDraft.slots.map((s) => ({ id: s.id, days: [...s.days].sort((a, b) => a - b), start: s.start, end: s.end, temperature: Number(s.temperature) })), away_temperature: awayTemperaturePayload(this._scheduleDraft.awayTemperature), hvac_mode: this._scheduleDraft.hvacMode || null }); this._closeSchedule(dialog); } catch (err) { error.textContent = errorLabel(t, err?.message || err); } }); actions.append(save);
      body.append(actions);
    }
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); this._closeSchedule(dialog); }); this.shadowRoot.append(dialog);
    if (this._scheduleOpen) dialog.showModal();
  }
  _displayEntity(entity) {
    const o=this._optimistic; if (!entity || !o || o.entityId!==this.config?.entity) return entity;
    return {...entity, attributes:{...entity.attributes,...o.payload}};
  }
  _reconcileOptimistic() {
    const o=this._optimistic, actual=this._hass?.states?.[this.config?.entity]; if (!o || !actual) return;
    const keys=Object.keys(o.payload), confirmed=keys.every(k=>numeric(actual.attributes?.[k])===numeric(o.payload[k]));
    if (confirmed || actual.state==='unknown' || actual.state==='unavailable') { clearTimeout(this._optimisticTimer); this._optimisticTimer=null; this._optimistic=null; }
  }
  _bindCardToggle(card) {
    card.addEventListener('click', ev=>{ const path=ev.composedPath?.() || [ev.target]; if(path.some(node=>node!==card && node?.matches?.('button,input,select,textarea,a,[role="slider"],[role="button"],[role="group"]'))) return; const e=this._hass?.states?.[this.config.entity], mode=hvacToggleMode(e); if(mode) this._service('climate','set_hvac_mode',{entity_id:this.config.entity,hvac_mode:mode}); });
    card.addEventListener('keydown', ev=>{ if((ev.key==='Enter'||ev.key===' ') && ev.target===card){ev.preventDefault();card.click();} });
  }
  _focusedDelta() {
    // Which +/- control owns focus right now. The optimistic re-render replaces
    // the whole shadow tree, which silently drops focus otherwise.
    try {
      const delta = this.shadowRoot?.activeElement?.dataset?.delta;
      return delta === undefined || delta === null || delta === '' ? null : String(delta);
    } catch { return null; }
  }
  _restoreDeltaFocus(delta) {
    // Give focus back to the same +/- control after the re-render; a slider or
    // anything else (no data-delta) keeps its own focus handling. Focus the
    // user already moved away is never pulled back: nothing to do without a
    // captured delta, and nothing to steal when a live control still owns it.
    if (delta === null || delta === undefined) return;
    try {
      const root = this.shadowRoot;
      if (!root?.querySelector) return;
      const active = root.activeElement;
      // A live control still holds focus (the render was a no-op, e.g. the
      // schedule dialog is open): leave it exactly where the user put it.
      if (active && active !== root && active.isConnected) return;
      // Focus already sits on another element outside the card: not ours.
      const doc = typeof document === 'undefined' ? null : document;
      const docActive = doc?.activeElement;
      if (docActive && docActive !== doc.body && docActive !== (root.host || this)) return;
      root.querySelector(`[data-delta="${delta}"]`)?.focus?.();
    } catch {}
  }
  _renderPreservingDeltaFocus() {
    // Wrapper around _render() for every path that rebuilds the whole card
    // (config/hass updates, the optimistic update, its 8s timeout and service
    // rollback): capture the focused +/- before the swap, rebuild, and give
    // focus back only if the rebuild dropped it.
    const delta = this._focusedDelta();
    this._render();
    this._restoreDeltaFocus(delta);
  }
  _setTemperature(value, entity) {
    const base=this._displayEntity(this._hass?.states?.[this.config.entity] || entity);
    const payload = temperaturePayload(base, value, this.config.step, this._stepOverride);
    if (payload) { clearTimeout(this._optimisticTimer); this._optimistic={entityId:this.config.entity,payload}; this._renderPreservingDeltaFocus(); this._optimisticTimer=setTimeout(()=>{this._optimistic=null;this._optimisticTimer=null;this._renderPreservingDeltaFocus();},8000); const seq=this._optimistic; Promise.resolve().then(()=>this._hass?.callService('climate','set_temperature',{entity_id:this.config.entity,...payload})).catch(()=>{if(this._optimistic===seq){clearTimeout(this._optimisticTimer);this._optimistic=null;this._renderPreservingDeltaFocus();}}); }
  }
}

export const BUBBLE_CLIMATE_CARD_TAG = 'bubble-climate-card';
export const BUBBLE_CLIMATE_CARD_EDITOR_TAG = 'bubble-climate-card-editor';
// Element defined by the HA frontend app bundle itself. Its presence in the
// *live* registry proves the scoped customElements registry/polyfill has been
// installed, i.e. extra-module race from home-assistant/frontend#53890 is over.
const FRONTEND_READY_TAG = 'home-assistant';
const REREGISTER_POLL_MS = 100;
const REREGISTER_MAX_ATTEMPTS = 300;

const ensureBubbleClimateCardList = () => {
  if (!globalThis.window) return;
  const scope = globalThis.window;
  scope.customCards = scope.customCards || [];
  if (!scope.customCards.some((card) => card?.type === BUBBLE_CLIMATE_CARD_TAG)) scope.customCards.push({ type: BUBBLE_CLIMATE_CARD_TAG, name: 'Bubble Climate Card', description: 'Compact standalone climate card', getEntitySuggestion });
};

export const isBubbleClimateElementsRegistered = () => {
  try {
    const registry = globalThis.customElements;
    return registry?.get?.(BUBBLE_CLIMATE_CARD_TAG) === BubbleClimateCard
      && registry?.get?.(BUBBLE_CLIMATE_CARD_EDITOR_TAG) === BubbleClimateCardEditor;
  } catch {
    return false;
  }
};

export const registerBubbleClimateElements = () => {
  // Keep the original card-picker entry independent of element registration:
  // it must be added idempotently even when customElements/HTMLElement is
  // (temporarily) unavailable.
  ensureBubbleClimateCardList();
  // Read the registry afresh on every call: HA replaces window.customElements
  // when the scoped polyfill takes over, so a captured reference could point
  // to the stale native registry where the first define() was lost.
  const registry = globalThis.customElements;
  if (!registry?.define || !registry?.get || !globalThis.HTMLElement) return false;
  for (const [tag, ctor] of [[BUBBLE_CLIMATE_CARD_TAG, BubbleClimateCard], [BUBBLE_CLIMATE_CARD_EDITOR_TAG, BubbleClimateCardEditor]]) {
    if (!registry.get(tag)) {
      try {
        registry.define(tag, ctor);
      } catch (error) {
        // Benign only when another copy raced us and the tag is now defined.
        // Any other define() failure (invalid name/constructor) must surface.
        if (!registry.get(tag)) throw error;
      }
    }
  }
  return isBubbleClimateElementsRegistered();
};

export const isHomeAssistantFrontendReady = () => {
  try {
    return Boolean(globalThis.customElements?.get?.(FRONTEND_READY_TAG));
  } catch {
    return false;
  }
};

export const scheduleBubbleClimateReregistration = ({ intervalMs = REREGISTER_POLL_MS, maxAttempts = REREGISTER_MAX_ATTEMPTS, schedule = (fn, ms) => setTimeout(fn, ms), clear = (timerId) => clearTimeout(timerId), warn = (message) => globalThis.console?.warn?.(message) } = {}) => {
  let attempts = 0;
  let timer = null;
  const cancel = () => {
    if (timer !== null) {
      clear(timer);
      timer = null;
    }
  };
  const giveUp = () => {
    try {
      warn?.(`bubble-climate-card: frontend not ready or card missing from the active registry after ${attempts} attempt(s).`);
    } catch {}
  };
  const poll = () => {
    timer = null;
    if (isHomeAssistantFrontendReady()) {
      try {
        registerBubbleClimateElements();
      } catch (error) {
        // Deterministic failure path: a real define() error would otherwise
        // escape this timer callback as an uncaught exception, aborting the
        // poll without the bounded exhaustion diagnosis. Surface the error
        // once and stop: retrying a deterministic constructor failure would
        // only spam. The bounded exhaustion warning below stays a single
        // event for the retry-exhausted path.
        try {
          warn?.(`bubble-climate-card: failed to register custom elements: ${error?.message || error}`);
        } catch {}
        return;
      }
      // Do not stop just because home-assistant is ready: the scoped swap may
      // still have dropped our tags, so verify both tags map to our ctors.
      if (isBubbleClimateElementsRegistered()) return;
    }
    attempts += 1;
    if (attempts >= maxAttempts) {
      giveUp();
      return;
    }
    timer = schedule(poll, intervalMs);
  };
  registerBubbleClimateElements();
  if (isHomeAssistantFrontendReady() && isBubbleClimateElementsRegistered()) return cancel;
  if (maxAttempts <= 0) {
    giveUp();
    return cancel;
  }
  timer = schedule(poll, intervalMs);
  return cancel;
};

if (globalThis.window && typeof setTimeout === 'function') {
  scheduleBubbleClimateReregistration();
} else {
  registerBubbleClimateElements();
}
