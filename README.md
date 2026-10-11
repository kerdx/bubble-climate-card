# Bubble Climate Card + Scheduler — 0.1.0

Card Lovelace autonoma in stile Bubble, con controlli per climate e programmazione settimanale gestita da un'integrazione Home Assistant indipendente. L'agenda continua a funzionare con la dashboard chiusa e dopo il riavvio di Home Assistant. Non include codice Nodalia.

## Installazione con HACS

1. In HACS apri **⋮ → Repository personalizzati** e aggiungi `https://github.com/kerdx/bubble-climate-card` scegliendo la categoria **Integration**. La categoria viene scelta in HACS, non nel file `hacs.json`.
2. Installa **Bubble Climate Scheduler** da HACS e riavvia Home Assistant.
3. Vai in **Impostazioni → Dispositivi e servizi → Aggiungi integrazione** e aggiungi **Bubble Climate Scheduler**.
4. Aggiungi una risorsa da **Impostazioni → Dashboard → Risorse**:

   ```text
   URL: /bubble_climate_scheduler/bubble-climate-card.js
   Tipo: JavaScript module
   ```

5. Nella dashboard aggiungi una scheda manuale usando il YAML d'esempio nella sezione **Installazione manuale**.

## Installazione manuale

1. Copia `custom_components/bubble_climate_scheduler` in `config/custom_components/`.
2. Riavvia Home Assistant e aggiungi **Bubble Climate Scheduler** da **Impostazioni → Dispositivi e servizi → Aggiungi integrazione**.
3. Aggiungi la risorsa Lovelace indicata sopra e crea una scheda manuale:

   ```yaml
   type: custom:bubble-climate-card
   entity: climate.termostato_camera
   name: Termostato Camera
   icon: mdi:bed-king-outline
   layout: compact
   show_state_chip: false
   show_current_temperature_chip: true
   show_humidity_chip: false
   show_unavailable_badge: false
   show_mode_buttons: true
   show_step_controls: true
   show_schedule_button: true
   ```

La risorsa JavaScript è servita dall'integrazione. Non serve creare un helper `schedule.*` né configurare webhook.

## Programmazione e limiti

Tocca il calendario nella scheda per aprire l'editor. Puoi impostare fasce, giorni, orari e temperatura; la programmazione è attiva solo se salvata con **Enabled** selezionato.

- È supportato un solo programma (singleton) per una singola entità climate.
- Si può programmare un singolo target di temperatura. La modalità `heat_cool` non è supportata per la programmazione e viene rifiutata.
- Le fasce sovrapposte vengono rifiutate; una fascia che termina prima dell'inizio attraversa la mezzanotte. Gli intervalli sono `[inizio, fine)` e usano il fuso orario di Home Assistant.
- Fuori dalle fasce l'integrazione non imposta una modalità né spegne il climate: la temperatura corrente resta invariata. Disabilitare o eliminare un programma non cambia il target già impostato.
- I dati sono conservati nello storage di Home Assistant e il backend continua in background anche senza dashboard. Dopo riavvio, salvataggio e cambio fascia applica il target, se diverso da quello impostato. Una variazione manuale durante la fascia non viene sovrascritta ogni minuto; la programmazione riprende alla fascia successiva.
- Se il climate è indisponibile, il target resta in attesa e viene ritentato al ripristino. Limiti e passo devono essere validi; i target non validi non vengono arrotondati silenziosamente.
- L'integrazione espone il sensore diagnostico dei programmi e le azioni `bubble_climate_scheduler.save_program`, `set_enabled` e `delete_program`.

## Test e verifica

Comandi di test disponibili nel progetto:

```sh
python3 -m unittest discover -s tests_backend -v
python3 -m compileall -q custom_components/bubble_climate_scheduler
node --test
```

I test non verificano il funzionamento in una vera istanza Home Assistant né in un browser; questi ambienti non sono stati verificati. Prima dell'uso quotidiano prova un programma disabilitato, uno slot attivo, un riavvio e un climate indisponibile/ripristinato. Le etichette dell'interfaccia sono attualmente in inglese.
