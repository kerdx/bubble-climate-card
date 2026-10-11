export const numeric = (v) => {
  if (v === null || v === undefined || (typeof v === 'string' && (!v.trim() || ['unknown', 'unavailable'].includes(v.trim().toLowerCase())))) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
export const modeLabel = (mode) => ({ heat: 'Heat', cool: 'Cool', off: 'Off', auto: 'Auto', heat_cool: 'Heat / cool', dry: 'Dry', fan_only: 'Fan only' }[mode] || String(mode ?? '').replaceAll('_', ' '));

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
  const increment = numeric(a.target_temp_step) ?? numeric(fallbackStep);
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
    const increment = numeric(attrs.target_temp_step) ?? numeric(step);
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
    const step = numeric(a.target_temp_step) ?? numeric(c.step);
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,inherit)}
      ha-card{border-radius:var(--bubble-border-radius,20px);background:var(--ha-card-background,var(--card-background-color));padding:14px 16px;box-sizing:border-box}
      .head{display:flex;align-items:center;gap:10px}.icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--bubble-accent-color,var(--primary-color));color:var(--text-primary-color,#fff)}
      .icon ha-icon{--mdc-icon-size:22px}.title{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.chips{display:flex;gap:5px;flex-wrap:wrap}.chip{font-size:12px;padding:4px 8px;border-radius:999px;background:var(--secondary-background-color);white-space:nowrap}
      .temps{display:flex;align-items:baseline;gap:12px;margin:12px 0 4px}.current{font-size:22px;font-weight:600}.target{font-size:15px;color:var(--secondary-text-color)}.target strong{font-size:24px;color:var(--primary-text-color)}
      input[type=range]{width:100%;accent-color:var(--primary-color);margin:8px 0}.controls,.modes{display:flex;align-items:center;gap:7px}.controls{justify-content:center}.modes{overflow:auto;margin-top:9px}
      button{font:inherit;color:var(--primary-text-color);background:var(--secondary-background-color);border:0;border-radius:999px;padding:7px 11px;cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.selected{background:var(--primary-color);color:var(--text-primary-color,#fff)}
      .badge{color:var(--error-color);font-size:13px}.empty{color:var(--secondary-text-color);padding-top:10px}
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
    if (unavailable) body.textContent = 'Entity unavailable';
    else {
      const temps=document.createElement('div'); temps.className='temps';
      const now=document.createElement('span'); now.className='current'; now.textContent=current;
      const targetText=document.createElement('span'); targetText.className='target'; targetText.textContent=hasTarget ? '' : 'Target unavailable';
      if (hasTarget) {
        if (model.dual) targetText.textContent=`Target ${model.low}${unit}–${model.high}${unit}`;
        else { targetText.append('Target '); const strong=document.createElement('strong'); strong.textContent=`${target}${unit}`; targetText.append(strong); }
      }
      temps.append(now,targetText); body.append(temps);
      if (hasTarget && model.controllable && step !== null && step > 0) {
        const slider=document.createElement('input'); slider.className='slider'; slider.type='range'; slider.setAttribute('aria-label',model.dual?'Target temperature range midpoint':'Target temperature');
        slider.min=String(model.sliderMin); slider.max=String(model.sliderMax); slider.step=String(step); slider.value=String(target); body.append(slider);
        if (c.show_step_controls) { const controls=document.createElement('div'); controls.className='controls'; for (const [d,label,text] of [[-step,'Decrease target temperature','−'],[step,'Increase target temperature','+']]) { const button=document.createElement('button'); button.dataset.delta=String(d); button.setAttribute('aria-label',label); button.textContent=text; controls.append(button); } body.append(controls); }
      }
      if (c.show_mode_buttons && modeList.length) { const group=document.createElement('div'); group.className='modes'; group.setAttribute('role','group'); group.setAttribute('aria-label','HVAC mode'); for (const m of modeList) { const button=document.createElement('button'); button.dataset.mode=String(m); button.classList.toggle('selected',e.state===m); button.setAttribute('aria-pressed',String(e.state===m)); button.setAttribute('aria-label',`Set ${modeLabel(m)} mode`); button.textContent=modeLabel(m); group.append(button); } body.append(group); }
    }
    this.shadowRoot.querySelector('.slider')?.addEventListener('change', (ev) => this._setTemperature(ev.target.value, e));
    root.querySelectorAll('[data-delta]').forEach((b) => b.addEventListener('click', () => this._setTemperature(target + Number(b.dataset.delta), e)));
    root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { if (!unavailable && modes(e).includes(b.dataset.mode)) this._service('climate', 'set_hvac_mode', { entity_id: c.entity, hvac_mode: b.dataset.mode }); }));
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

if (globalThis.customElements && globalThis.HTMLElement && !customElements.get('bubble-climate-card')) customElements.define('bubble-climate-card', BubbleClimateCard);
if (globalThis.customElements && globalThis.HTMLElement && !customElements.get('bubble-climate-card-editor')) customElements.define('bubble-climate-card-editor', BubbleClimateCardEditor);
if (globalThis.window) {
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === 'bubble-climate-card')) window.customCards.push({ type: 'bubble-climate-card', name: 'Bubble Climate Card', description: 'Compact standalone climate card', getEntitySuggestion });
}
