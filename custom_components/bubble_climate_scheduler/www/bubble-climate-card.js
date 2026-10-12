export const numeric = (v) => {
  if (v === null || v === undefined || (typeof v === 'string' && (!v.trim() || ['unknown', 'unavailable'].includes(v.trim().toLowerCase())))) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
export const modeLabel = (mode) => ({ heat: 'Heat', cool: 'Cool', off: 'Off', auto: 'Auto', heat_cool: 'Heat / cool', dry: 'Dry', fan_only: 'Fan only' }[mode] || String(mode ?? '').replaceAll('_', ' '));
export const effectiveStep = (entity, fallback = 0.5) => {
  const attributes = entity?.attributes || {};
  const raw = attributes.target_temp_step;
  if (raw !== undefined && raw !== null && !(typeof raw === 'string' && ['unknown', 'unavailable'].includes(raw.trim().toLowerCase()))) {
    const declared = numeric(raw);
    return declared !== null && declared > 0 ? declared : null;
  }
  return numeric(fallback);
};

export const scheduleDraft = (program) => ({ enabled: Boolean(program?.enabled), slots: (Array.isArray(program?.slots) ? program.slots : []).map((slot) => ({
  id: String(slot.id ?? ''), days: Array.isArray(slot.days) ? slot.days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7) : [],
  start: String(slot.start ?? '08:00'), end: String(slot.end ?? '09:00'), temperature: slot.temperature,
})) });
export const validateScheduleDraft = (draft) => {
  if (!draft || typeof draft.enabled !== 'boolean' || !Array.isArray(draft.slots)) return 'Invalid schedule.';
  if (draft.enabled && draft.slots.length === 0) return 'An enabled schedule needs at least one slot.';
  for (const slot of draft.slots) {
    if (!slot.id || !Array.isArray(slot.days) || !slot.days.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) || slot.start === slot.end || slot.temperature === '' || numeric(slot.temperature) === null) return 'Each slot needs days, valid times, and a target; start and end must differ.';
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

export const clampTarget = (value, entity, fallbackStep) => {
  const n = numeric(value), a = entity?.attributes || {}, min = numeric(a.min_temp), max = numeric(a.max_temp);
  const increment = effectiveStep(entity, fallbackStep);
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

export const temperaturePayload = (entity, value, step) => {
  const requested = numeric(value);
  if (requested === null || !entity || !validState(entity.state)) return null;
  const attrs = entity?.attributes || {};
  if (entity.state === 'heat_cool') {
    if (numeric(attrs.target_temp_low) === null || numeric(attrs.target_temp_high) === null || numeric(attrs.target_temp_low) > numeric(attrs.target_temp_high)) return null;
    const low = numeric(attrs.target_temp_low), high = numeric(attrs.target_temp_high);
    const min = numeric(attrs.min_temp), max = numeric(attrs.max_temp);
    if (min === null || max === null || min > max || high - low > max - min) return null;
    const increment = effectiveStep(entity, step);
    if (increment === null || increment <= 0) return null;
    const delta = requested - (low + high) / 2;
    const minShiftIndex = Math.ceil((min - low) / increment - 1e-10);
    const maxShiftIndex = Math.floor((max - high) / increment + 1e-10);
    if (minShiftIndex > maxShiftIndex) return null;
    const shiftIndex = Math.max(minShiftIndex, Math.min(maxShiftIndex, Math.round(delta / increment)));
    const shift = Number((shiftIndex * increment).toFixed(8));
    return { target_temp_low: Number((low + shift).toFixed(8)), target_temp_high: Number((high + shift).toFixed(8)) };
  }
  const target = clampTarget(requested, entity, step);
  return target === null ? null : { temperature: target };
};

const valid = (v) => v !== undefined && v !== null && v !== '' && v !== 'unknown' && v !== 'unavailable';
const modes = (entity) => Array.isArray(entity?.attributes?.hvac_modes) ? entity.attributes.hvac_modes : [];
const HTMLElementBase = globalThis.HTMLElement ?? class {};

export const defaultCardConfig = (entity = 'climate.example') => ({
  entity, layout: 'compact', step: 0.5,
  show_state_chip: true, show_current_temperature_chip: true, show_humidity_chip: false,
  show_unavailable_badge: true, show_mode_buttons: true, show_step_controls: true, show_schedule_button: true,
});
export const getEntitySuggestion = (_hass, entityId) => typeof entityId === 'string' && entityId.startsWith('climate.')
  ? { type: 'custom:bubble-climate-card', ...defaultCardConfig(entityId) }
  : null;

export const configSchema = [
  { name: 'entity', required: true, selector: { entity: { filter: { domain: ['climate'] } } } },
  { name: 'name', selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  ...['show_state_chip', 'show_current_temperature_chip', 'show_humidity_chip', 'show_unavailable_badge', 'show_mode_buttons', 'show_step_controls', 'show_schedule_button'].map((name) => ({ name, selector: { boolean: {} } })),
  { name: 'step', selector: { number: { min: 0.01, max: 10, step: 0.01, mode: 'box' } } },
];

export class BubbleClimateCardEditor extends HTMLElementBase {
  set hass(value) { this._hass = value; const form = this.shadowRoot?.querySelector('ha-form'); if (form) form.hass = value; }
  setConfig(config) {
    this._config = { ...defaultCardConfig(config?.entity || 'climate.example'), ...config };
    this._render();
  }
  _render() {
    if (!this.attachShadow) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = '<ha-form></ha-form>';
    const form = this.shadowRoot.querySelector('ha-form');
    form.hass = this._hass;
    form.data = { ...this._config };
    form.schema = configSchema;
    form.computeLabel = (schema) => ({ entity: 'Climate entity', name: 'Name', icon: 'Icon', step: 'Step' }[schema.name] || schema.name.replaceAll('_', ' '));
    form.addEventListener('value-changed', (event) => {
      event.stopPropagation();
      this._config = { ...this._config, ...(event.detail?.value || {}) };
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: { ...this._config } }, bubbles: true, composed: true }));
    });
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
    if ((config.layout ?? 'compact') !== 'compact') throw new Error('Supported layout is "compact".');
    if (config.step !== undefined && (numeric(config.step) === null || numeric(config.step) <= 0)) throw new Error('step must be a number greater than zero.');
    this.config = { layout: 'compact', show_state_chip: true, show_current_temperature_chip: true, show_humidity_chip: false,
      show_unavailable_badge: true, show_mode_buttons: true, show_step_controls: true, show_schedule_button: true, step: 0.5, ...config };
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._render();
  }
  set hass(hass) { this._hass = hass; this._render(); }
  getCardSize() { return 2; }
  _service(domain, service, data) { if (this._hass) this._hass.callService(domain, service, data); }
  _render() {
    if (!this.shadowRoot || !this.config) return;
    if (this._scheduleOpen && this.shadowRoot.querySelector('dialog[open]')) return;
    const c = this.config, e = this._hass?.states?.[c.entity], a = e?.attributes || {};
    const unavailable = !e || !valid(e.state);
    const currentValue = numeric(a.current_temperature);
    const model = targetModel(e);
    const unit = this._hass?.config?.unit_system?.temperature || '°C';
    const current = currentValue !== null ? `${currentValue}${unit}` : '—';
    const target = model.value;
    const title = c.name || a.friendly_name || c.entity;
    const modeList = modes(e).filter((m) => valid(m));
    const hasTarget = !unavailable && model.available;
    const step = effectiveStep(e, c.step);
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,inherit)}
      ha-card{border-radius:var(--bubble-border-radius,20px);background:var(--ha-card-background,var(--card-background-color));padding:8px 12px;box-sizing:border-box;min-height:88px;display:grid;grid-template-rows:36px 36px;gap:4px;overflow:hidden}
      .head,.body{display:flex;align-items:center;gap:8px;min-width:0;white-space:nowrap;overflow:hidden}
      .body{overflow-x:auto;overflow-y:hidden}
      .icon{width:32px;height:32px;flex:0 0 32px;border-radius:50%;display:grid;place-items:center;background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff)}
      .icon ha-icon{--mdc-icon-size:20px}.title{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.chips{display:flex;gap:4px;flex:0 1 auto;min-width:0;overflow:hidden}.chip{font-size:11px;padding:4px 7px;border-radius:999px;background:var(--secondary-background-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;flex:0 1 auto}
      .target{font-size:20px;color:var(--primary-text-color);font-weight:600;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}.target strong{font:inherit}
      input[type=range]{width:auto;flex:1 0 45px;min-width:45px;accent-color:var(--primary-color);margin:0}
      .body button{padding:5px 6px;min-width:28px;flex:0 0 auto}.body select{width:clamp(54px,22vw,104px);max-width:104px;min-width:54px;flex:0 0 clamp(54px,22vw,104px);overflow:hidden;text-overflow:ellipsis;font:inherit;color:var(--primary-text-color);background:var(--secondary-background-color);border:0;border-radius:999px;padding:7px 5px}
      button{font:inherit;color:var(--primary-text-color);background:var(--secondary-background-color);border:0;border-radius:999px;padding:7px 11px;cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.selected{background:var(--primary-color);color:var(--text-primary-color,#fff)}
      select:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.badge{color:var(--error-color);font-size:11px;white-space:nowrap}.empty{color:var(--secondary-text-color);overflow:hidden;text-overflow:ellipsis}
      @media(max-width:420px){ha-card{padding:7px 9px}.head,.body{gap:4px}.target{font-size:16px}.body button{padding:4px 5px;min-width:24px}.chip{max-width:62px}}
      dialog{color:var(--primary-text-color);background:var(--card-background-color,var(--ha-card-background));border:1px solid var(--divider-color);border-radius:16px;width:min(560px,calc(100vw - 40px));max-height:85vh;overflow:auto}dialog::backdrop{background:#0008}.slot{border-top:1px solid var(--divider-color);padding:12px 0}.field{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}.days{display:flex;gap:8px;flex-wrap:wrap}.error{color:var(--error-color)}
    </style><ha-card><div class="head"><span class="icon"><ha-icon></ha-icon></span><span class="title"></span><span class="chips"></span><button class="schedule" aria-label="Open schedule details" title="Open schedule details"><ha-icon icon="mdi:calendar-clock"></ha-icon></button></div>
       <div class="body"></div></ha-card>`;
    const root = this.shadowRoot;
    root.querySelector('.icon ha-icon').setAttribute('icon', String(c.icon || a.icon || 'mdi:thermostat'));
    root.querySelector('.title').textContent = String(title);
    const chips = root.querySelector('.chips');
    const addChip = (show, text) => { if (show && text) { const span = document.createElement('span'); span.className = 'chip'; span.textContent = String(text); chips.append(span); } };
    addChip(c.show_state_chip && !unavailable, modeLabel(e?.state));
    addChip(c.show_current_temperature_chip && !unavailable, currentValue !== null ? `${currentValue}${unit}` : '');
    addChip(c.show_humidity_chip && !unavailable, numeric(a.current_humidity) !== null ? `${numeric(a.current_humidity)}%` : '');
    if (c.show_unavailable_badge && unavailable) { const b=document.createElement('span'); b.className='badge'; b.textContent='Unavailable'; chips.append(b); }
    const schedule = root.querySelector('.schedule');
    schedule.hidden = !c.show_schedule_button;
    const body = root.querySelector('.body');
    if (unavailable) { const message=document.createElement('span'); message.className='empty'; message.textContent='Entity unavailable'; body.append(message); }
    else {
      const targetText=document.createElement('span'); targetText.className='target'; targetText.textContent=hasTarget ? '' : 'Target unavailable';
      if (hasTarget) {
        targetText.title = model.dual ? `Target temperature range ${model.low} to ${model.high}${unit}` : `Target ${target}${unit}`;
        const value=document.createElement('strong');
        if (model.dual) {
          value.textContent=`${model.low}–${model.high}${unit}`;
          targetText.setAttribute('aria-label', `Target temperature range ${model.low} to ${model.high}${unit}`);
        } else {
          value.textContent=`${target}${unit}`;
          targetText.setAttribute('aria-label', `Target ${target}${unit}`);
        }
        targetText.append(value);
      }
      body.append(targetText);
      if (hasTarget && model.controllable && step !== null && step > 0) {
         if (c.show_step_controls) for (const [d,label,text] of [[-step,'Decrease target temperature','−'],[step,'Increase target temperature','+']]) { const button=document.createElement('button'); button.dataset.delta=String(d); button.setAttribute('aria-label',label); button.textContent=text; body.append(button); }
         const slider=document.createElement('input'); slider.className='slider'; slider.type='range'; slider.setAttribute('aria-label',model.dual?'Target temperature range midpoint':'Target temperature');
         slider.min=String(model.sliderMin); slider.max=String(model.sliderMax); slider.step=String(step); slider.value=String(target); body.append(slider);
      }
      if (c.show_mode_buttons && modeList.length) { const select=document.createElement('select'); select.setAttribute('aria-label','HVAC mode'); for(const m of modeList){const option=document.createElement('option');option.value=String(m);option.textContent=modeLabel(m);select.append(option)} select.value=modeList.includes(e.state)?e.state:modeList[0]; body.append(select); }
    }
    this.shadowRoot.querySelector('.slider')?.addEventListener('change', (ev) => this._setTemperature(ev.target.value, e));
    root.querySelectorAll('[data-delta]').forEach((b) => b.addEventListener('click', () => this._setTemperature(target + Number(b.dataset.delta), e)));
    root.querySelector('select[aria-label="HVAC mode"]')?.addEventListener('change', (ev) => { if (!unavailable && modes(e).includes(ev.target.value)) this._service('climate', 'set_hvac_mode', { entity_id: c.entity, hvac_mode: ev.target.value }); });
    schedule.addEventListener('click', () => this._openSchedule());
  }
  _scheduleSensor() {
    return Object.values(this._hass?.states || {}).find((state) => state?.attributes?.scheduler_domain === 'bubble_climate_scheduler') || null;
  }
  _openSchedule() {
    const program = this._scheduleSensor()?.attributes?.programs?.[this.config.entity];
    this._scheduleOpen = true; this._scheduleDraft = scheduleDraft(program); this._scheduleError = ''; this._renderScheduleDialog();
  }
  _closeSchedule(dialog) {
    this._scheduleOpen = false;
    if (dialog?.open) dialog.close();
    dialog?.remove();
    this._render();
  }
  _renderScheduleDialog() {
    const old = this.shadowRoot.querySelector('dialog'); old?.remove();
    const dialog = document.createElement('dialog'); dialog.setAttribute('aria-label', 'Weekly climate schedule');
    const heading = document.createElement('h2'); heading.textContent = 'Weekly schedule'; dialog.append(heading);
    const sensor = this._scheduleSensor(), program = sensor?.attributes?.programs?.[this.config.entity];
    if (!sensor) {
      const p = document.createElement('p'); p.textContent = 'Scheduler backend is not installed. Install and configure bubble_climate_scheduler to edit a program.'; dialog.append(p);
      if (typeof this.config.schedule_entity === 'string' && /^schedule\.[\w-]+$/.test(this.config.schedule_entity)) { const link = document.createElement('button'); link.textContent = 'Open legacy schedule'; link.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this.config.schedule_entity }, bubbles: true, composed: true }))); dialog.append(link); }
    } else {
      const status = document.createElement('p'); status.textContent = `Active slot: ${program?.active_slot_id || 'none'} · Next change: ${program?.next_change || 'none'}`; dialog.append(status);
      if (program?.last_error) { const p=document.createElement('p'); p.className='error'; p.textContent=String(program.last_error); dialog.append(p); }
      const enabledLabel=document.createElement('label'), enabled=document.createElement('input'); enabled.type='checkbox'; enabled.checked=Boolean(this._scheduleDraft.enabled); enabledLabel.append(enabled, document.createTextNode(' Enabled')); enabled.addEventListener('change',()=>this._scheduleDraft.enabled=enabled.checked); dialog.append(enabledLabel);
      const slots=document.createElement('div');
      const renderSlots=()=>{ slots.replaceChildren(); this._scheduleDraft.slots.forEach((slot,index)=>{
        const box=document.createElement('section'); box.className='slot'; const title=document.createElement('h3'); title.textContent=`Slot ${index+1}`; box.append(title);
        const days=document.createElement('div'); days.className='days'; ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((day,i)=>{const label=document.createElement('label'),cb=document.createElement('input');cb.type='checkbox';cb.checked=slot.days.includes(i+1);cb.setAttribute('aria-label',day);cb.addEventListener('change',()=>{slot.days=cb.checked?[...new Set([...slot.days,i+1])]:slot.days.filter(x=>x!==i+1)});label.append(cb,document.createTextNode(day));days.append(label)});box.append(days);
        const field=document.createElement('div');field.className='field'; for(const [key,labelText,type] of [['start','Start','time'],['end','End','time'],['temperature','Target','number']]){const label=document.createElement('label');label.textContent=labelText+' ';const input=document.createElement('input');input.type=type;input.value=String(slot[key]);if(key==='temperature')input.step='any';input.setAttribute('aria-label',labelText);input.addEventListener('input',()=>slot[key]=type==='number'?input.value:input.value);label.append(input);field.append(label)}
        const remove=document.createElement('button');remove.textContent='Remove slot';remove.setAttribute('aria-label',`Remove slot ${index+1}`);remove.addEventListener('click',()=>{this._scheduleDraft.slots.splice(index,1);renderSlots()});field.append(remove);box.append(field);slots.append(box);
      })}; renderSlots();dialog.append(slots);
      const add=document.createElement('button');add.textContent='Add slot';add.addEventListener('click',()=>{this._scheduleDraft.slots.push({id:globalThis.crypto?.randomUUID?.()||`slot-${Date.now()}-${Math.random().toString(36).slice(2)}`,days:[1],start:'08:00',end:'09:00',temperature:20});renderSlots()});dialog.append(add);
      const error=document.createElement('p');error.className='error';error.textContent=this._scheduleError||'';dialog.append(error);
      const save=document.createElement('button');save.textContent='Save';save.addEventListener('click',async()=>{const issue=validateScheduleDraft(this._scheduleDraft);if(issue){error.textContent=issue;return}try{await this._hass.callService('bubble_climate_scheduler','save_program',{climate_entity:this.config.entity,enabled:this._scheduleDraft.enabled,slots:this._scheduleDraft.slots.map(s=>({id:s.id,days:[...s.days].sort((a,b)=>a-b),start:s.start,end:s.end,temperature:Number(s.temperature)}))});this._closeSchedule(dialog)}catch(err){error.textContent=String(err?.message||err)}});dialog.append(save);
      const del=document.createElement('button');del.textContent='Delete program';del.addEventListener('click',async()=>{try{await this._hass.callService('bubble_climate_scheduler','delete_program',{climate_entity:this.config.entity});this._closeSchedule(dialog)}catch(err){error.textContent=String(err?.message||err)}});dialog.append(del);
    }
    const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.addEventListener('click',()=>this._closeSchedule(dialog));dialog.append(cancel);
    dialog.addEventListener('cancel',(event)=>{event.preventDefault();this._closeSchedule(dialog)}); this.shadowRoot.append(dialog);
    if (this._scheduleOpen) dialog.showModal();
  }
  _setTemperature(value, entity) {
    const payload = temperaturePayload(entity, value, this.config.step);
    if (payload) this._service('climate', 'set_temperature', { entity_id: this.config.entity, ...payload });
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
