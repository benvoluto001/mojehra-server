// src/ui/vypravy.js
// Nový systém výprav: 4 biomy s obrázky (karty), 2s trvání, loot, log zpráv.
import { state, addResource, save } from '../state.js';
function imgForBiome(key){
  // obrázky dej do: ./src/ui/obrazky/vypravy/<key>.png
  return `./src/ui/obrazky/vypravy/${key}.png`;
}

// TRVÁNÍ FÁZÍ (v sekundách)
const PHASES = {
  out:     5 * 60,   // cesta tam
  explore: 20 * 60,  // průzkum
  back:    5 * 60,   // cesta zpět
};
const PHASE_ORDER = ['out','explore','back'];
const PHASE_LABEL = { out: 'cesta tam', explore: 'průzkum', back: 'cesta zpět' };
function phasePlanned(p){ return PHASES[p] || 0; }
function statusText(ex){
  if (!ex) return 'Připraveno';
  if (ex.status === 'running') return `Běží — ${PHASE_LABEL[ex.phase] || ex.phase}`;
  if (ex.status === 'done')    return 'Dokončeno';
  return 'Připraveno';
}



/* ───────────────────── KONFIGURACE BIOMŮ ───────────────────── */
const BIOMES = {
  poust: {
    key: 'poust',
    label: 'Poušť',
    desc: 'Kamenité pláně a duny. Kámen, zlato, občas krystaly.',
    baseDuration: 2,
    table() {
      return [
        { type: 'common', key: 'kámen',   min: 80,  max: 200, w: 4 },
        { type: 'common', key: 'zlato',   min: 40,  max: 120, w: 3 },
        { type: 'common', key: 'železo',  min: 25,  max: 90,  w: 1.5 },
        { type: 'rare',   key: 'krystal', min: 10,  max: 40,  w: 1.2 },
      ];
    },
  },
  hory: {
    key: 'hory',
    label: 'Hory',
    desc: 'Kámen, železo a skryté artefakty.',
    baseDuration: 2,
    table() {
      return [
        { type: 'common', key: 'kámen',     min: 90,  max: 220, w: 4 },
        { type: 'common', key: 'železo',    min: 60,  max: 160, w: 3.2 },
        { type: 'rare',   key: 'artefakty', min: 15,  max: 60,  w: 1.2 },
      ];
    },
  },
  ruiny: {
    key: 'ruiny',
    label: 'Ruiny',
    desc: 'Artefakty a slitina; málo běžných surovin.',
    baseDuration: 2,
    table() {
      return [
        { type: 'rare',   key: 'artefakty', min: 25,  max: 120, w: 2.2 },
        { type: 'rare',   key: 'slitina',   min: 10,  max: 40,  w: 1.6 },
        { type: 'common', key: 'dřevo',     min: 10,  max: 40,  w: 0.5 },
        { type: 'common', key: 'kámen',     min: 10,  max: 40,  w: 0.5 },
        { type: 'common', key: 'železo',    min: 10,  max: 40,  w: 0.5 },
        { type: 'common', key: 'zlato',     min: 5,   max: 20,  w: 0.25 },
        { type: 'common', key: 'stříbro',   min: 5,   max: 20,  w: 0.25 },
      ];
    },
  },
  dzungle: {
    key: 'dzungle',
    label: 'Džungle',
    desc: 'Jídlo, maso, bio-vlákna.',
    baseDuration: 2,
    table() {
      return [
        // „obilí“ bereme jako základ jídla
        { type: 'common', key: 'obilí',   min: 80,  max: 200, w: 2.8 },
        { type: 'common', key: 'maso',    min: 60,  max: 160, w: 2.4 },
        { type: 'common', key: 'vlakno',  min: 40,  max: 120, w: 2.0 },
      ];
    },
  },
};

/* ───────────────────── STAV EXPEDICE ───────────────────── */
function ensureExpeditionState(){
  if (!state.expedition){
    state.expedition = { status: 'idle', log: [], biom: 'poust' };
  }
  const ex = state.expedition;
  if (!Array.isArray(ex.log)) ex.log = [];
  if (!ex.status) ex.status = 'idle';
  if (!ex.biom) ex.biom = 'poust';
  if (!ex.phase) ex.phase = 'out';                 // nově fáze
  if (typeof ex.updatedAt !== 'number') ex.updatedAt = Date.now();
  if (typeof ex.startedAt !== 'number') ex.startedAt = Date.now();
  if (typeof ex.remaining !== 'number') ex.remaining = 0;
  return ex;
}


/* ───────────────────── POMOCNÉ ───────────────────── */
const NOW = () => Date.now();
const s = (n) => { 
  n = Math.max(0, Math.ceil(n||0)); 
  const m = Math.floor(n/60), sec = n % 60; 
  return m > 0 ? `${m} m ${sec}s` : `${sec}s`; 
};

const fmt = (n) => Number(n ?? 0).toLocaleString('cs-CZ');
const rand = (min,max) => Math.floor(min + Math.random()*(max-min+1));

function pickWeighted(items){
  const sum = items.reduce((a,x)=>a+(x.w||1), 0);
  let r = Math.random() * sum;
  for (const it of items){
    r -= (it.w||1);
    if (r <= 0) return it;
  }
  return items[items.length-1];
}

function pushLog(msg){
  const line = `[${new Date().toLocaleTimeString('cs-CZ')}] ${msg}`;
  const ex = ensureExpeditionState();
  ex.log.unshift(line);
  ex.log = ex.log.slice(0, 40);
}
function advancePhase(){
  const ex = ensureExpeditionState();
  if (ex.phase === 'out'){
    ex.phase = 'explore';
    ex.startedAt = NOW();
    ex.remaining = phasePlanned('explore');
    pushLog('Karavana dorazila na místo. Začíná průzkum (20 min).');
    return;
  }
  if (ex.phase === 'explore'){
    ex.phase = 'back';
    ex.startedAt = NOW();
    ex.remaining = phasePlanned('back');
    pushLog('Průzkum dokončen. Návrat (5 min).');
    return;
  }
  if (ex.phase === 'back'){
    finishExpedition();
  }
}


/* ───────────────────── VÝZKUMY (modifikátory) ───────────────────── */
function researchLevel(id){ return state.research?.[id]?.level || 0; }
function mods(){
  return {
    Oko:    researchLevel('VOkoPoutnika'),   // + běžné suroviny
    Poklady:researchLevel('VPokladyRuin'),  // + šance na artefakt (placeholder)
    Optika: researchLevel('VKrystalovaOptika'), // − riziko (placeholder)
  };
}

/* ───────────────────── ROLL VÝSLEDKU ───────────────────── */
function rollExpeditionResult(biomeKey){
  const biome = BIOMES[biomeKey] || BIOMES.poust;
  const table = biome.table();
  const L = mods();

  let rareChance = 0.15 + 0.01 * L.Poklady;        // +1 % za lvl „Poklady ruin“
  rareChance = Math.min(0.6, rareChance);

  let negativeChance = 0.20 - 0.02 * L.Optika;     // optika snižuje riziko
  negativeChance = Math.max(0.05, negativeChance);

  const commonMul = 1 + 0.05 * L.Oko;              // Oko poutníka: +5 % / lvl

  // minimálně 1 common + 1 další + případně rare
  const commons = table.filter(t => t.type === 'common');
  const rares   = table.filter(t => t.type === 'rare');
  const picks = [];
  picks.push(pickWeighted(commons));
  if (Math.random() < 0.7 || rares.length === 0) picks.push(pickWeighted(commons));
  else picks.push(pickWeighted(rares));
  if (Math.random() < rareChance && rares.length) picks.push(pickWeighted(rares));
  else if (Math.random() < 0.5) picks.push(pickWeighted(commons));

  const loot = {};
  picks.forEach(it => {
    const base = rand(it.min, it.max);
    const mul  = it.type === 'common' ? commonMul : 1;
    const amt  = Math.max(1, Math.round(base * mul));
    loot[it.key] = (loot[it.key] || 0) + amt;
  });

  let negative = false;
  if (Math.random() < negativeChance){
    negative = true;
    Object.keys(loot).forEach(k => loot[k] = Math.max(1, Math.round(loot[k]*0.3))); // −70 %
  }

  const stories = [
    'Karavana narazila na zasutý vchod do jeskyně.',
    'V troskách lodi cosi pulzovalo — vzali jste vzorky.',
    'Písečná bouře zpomalila návrat, ale úlovek máte.',
    'Skrytý oltář v ruinách zahalila záře.',
    'Lovci v džungli vyměnili zásoby za artefakt.',
  ];
  const story = stories[rand(0, stories.length-1)];

  return { loot, negative, story };
}

/* ───────────────────── ŘÍZENÍ BĚHU ───────────────────── */
let _timer = null;
function stopTimer(){ if (_timer){ clearInterval(_timer); _timer = null; } }

function finishExpedition(){
  const ex = ensureExpeditionState();
  if (ex.status !== 'running') return;

  const { loot, negative, story } = rollExpeditionResult(ex.biom);
  Object.entries(loot).forEach(([k,v]) => addResource(k, v));

  const lootTxt = Object.entries(loot).map(([k,v]) => `${fmt(v)} × ${k}`).join(', ');
  if (negative) pushLog(`Potíž na trase (−70 %). Úlovek: ${lootTxt}.`);
  else          pushLog(`Výprava uspěla. Úlovek: ${lootTxt}.`);
  pushLog(story);

  ex.status = 'done';
  ex.remaining = 0;
  ex.updatedAt = NOW();
  save?.();
  renderVypravy();
}

function tick(){
  const ex = ensureExpeditionState();
  if (ex.status !== 'running'){ stopTimer(); return; }

  const planned = phasePlanned(ex.phase);
  const now = NOW();
  const elapsed = Math.floor((now - (ex.startedAt || now)) / 1000);
  ex.remaining = Math.max(0, planned - elapsed);
  ex.updatedAt = now;
  // každých ~5 s ulož stav, ať se při přepnutí účtu nic neztratí
if (!ex.__lastSave || (now - ex.__lastSave) > 5000){
  save?.();
  ex.__lastSave = now;
}


  if (ex.remaining <= 0){
  advancePhase();
  renderVypravy(); // hned ukaž změnu fáze/odpočet
}else{
  const page = document.getElementById('page-vypravy');
  if (page?.classList.contains('active')) renderVypravy();
}

}


/* ───────────────────── PUBLIC API ───────────────────── */
export function startExpedition(){
  const ex = ensureExpeditionState();
  if (ex.status === 'running') return;

  ex.status    = 'running';
  ex.phase     = 'out';
  ex.startedAt = NOW();
  ex.remaining = phasePlanned('out');
  ex.updatedAt = NOW();

  pushLog(`Vypravil jsi karavanu do oblasti: ${BIOMES[ex.biom]?.label || 'Neznámo'}. (cesta tam 5 min)`);
  save?.();

  stopTimer();
  _timer = setInterval(tick, 1000);
  renderVypravy();
}


export function abortExpedition(){
  const ex = ensureExpeditionState();
  if (ex.status !== 'running') return;
  ex.status = 'idle';
  ex.remaining = 0;
  ex.updatedAt = NOW();
  pushLog('Výprava byla přerušena.');
  save?.();
  stopTimer();
  renderVypravy();
}

export function resumeExpeditionOnLoad(){
  const ex = ensureExpeditionState();
  if (ex.status !== 'running'){ 
    stopTimer(); 
    return; 
  }

  const now = NOW();
  let elapsed = Math.floor((now - (ex.startedAt || now)) / 1000);

  // Dožene offline – přeskakuje celé fáze (out → explore → back → finish)
  while (true){
    const planned = phasePlanned(ex.phase);

    // Jsme uprostřed aktuální fáze → jen dopočítej a spusť tikání
    if (elapsed < planned){
      ex.remaining = planned - elapsed;
      ex.updatedAt = now;

      stopTimer();
      _timer = setInterval(tick, 1000);
      return;               // ← uvnitř funkce, OK
    }

    // Fáze doběhla už během nepřítomnosti → odečti a přepni fázi
    elapsed -= planned;

    if (ex.phase === 'out'){
      ex.phase = 'explore';
      ex.startedAt = now - elapsed*1000;
      pushLog('Karavana dorazila na místo. Začíná průzkum (20 min).');
      continue;
    }

    if (ex.phase === 'explore'){
      ex.phase = 'back';
      ex.startedAt = now - elapsed*1000;
      pushLog('Průzkum dokončen. Návrat (5 min).');
      continue;
    }

    if (ex.phase === 'back'){
      // celá výprava doběhla ještě během nepřítomnosti
      finishExpedition();
      stopTimer();
      ex.remaining = 0;
      return;               // ← uvnitř funkce, OK
    }
  }
}



/* ───────────────────── RENDER ───────────────────── */
export function renderVypravy(){
  const page = document.getElementById('page-vypravy');
  if (!page) return;
  const ex = ensureExpeditionState();
  if (!ex.biom) ex.biom = 'poust';

  const cardsHTML = Object.values(BIOMES).map(b => `
    <button class="exp-card ${ex.biom===b.key?'selected':''}" data-biom="${b.key}" title="${b.desc}">
     <div class="exp-img" style="background-image:url('./src/ui/obrazky/vypravy/${b.key}.png');"></div>

      <div class="exp-caption">
        <div class="exp-title">${b.label}</div>
        <div class="exp-desc muted">${b.desc}</div>
      </div>
    </button>
  `).join('');

  page.innerHTML = `
    <section class="card">
      <h2>Výpravy</h2>

      <div class="exp-grid">${cardsHTML}</div>

      <div class="row" style="gap:10px; align-items:flex-end; flex-wrap:wrap; margin-top:10px;">
        <label>Karavana
          <select id="exp-caravan" title="Zatím bez vlivu (připraveno)">
            <option value="mala">Malá</option>
            <option value="stredni">Střední</option>
            <option value="velka">Velká</option>
          </select>
        </label>
        <div class="muted">Doba výpravy: 5 min tam + 20 min průzkum + 5 min zpět. Negativní příhoda sníží loot o 70 %.</div>

      </div>

      <div class="row" style="gap:8px; margin-top:6px;">
        <button class="btn" id="exp-start" ${ex.status==='running' ? 'disabled' : ''}>Vypravit karavanu</button>
        <button class="btn" id="exp-abort" ${ex.status==='running' ? '' : 'disabled'}>Přerušit</button>
      </div>

      <div class="mini" style="margin-top:8px;">
        Stav: ${statusText(ex)}${ex.status==='running' ? ` • zbývá ${s(ex.remaining||0)}` : ''}
      </div>

      <div class="mini-title" style="margin-top:10px;">Zprávy</div>
      <div id="exp-log" class="log">${(ex.log||[]).map(l => `<div>${l}</div>`).join('')}</div>
    </section>
  `;

  // výběr biomu klikem
  page.querySelector('.exp-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.exp-card[data-biom]');
    if (!card) return;
    ex.biom = card.getAttribute('data-biom');
    save?.();
    renderVypravy();
  });

  // uložit volbu karavany (zatím bez vlivu)
  const selCar = page.querySelector('#exp-caravan');
  if (selCar){ selCar.value = ex.caravan || 'mala'; selCar.onchange = () => { ex.caravan = selCar.value; save?.(); }; }

  page.querySelector('#exp-start')?.addEventListener('click', startExpedition);
  page.querySelector('#exp-abort')?.addEventListener('click', abortExpedition);
}
