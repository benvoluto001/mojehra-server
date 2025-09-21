// src/state.js
import { START_RESOURCES } from './data/sklad.js';
import { buildingMultiplier, applyAllEffects, getResearchCost } from './research/index.js';
import { getCurrentUser } from './auth.js';




// zap/vyp mechaniky kapacit
export const USE_CAP = true;

// ===== Výchozí hodnoty surovin/kapacit =====
const DEFAULT_RESOURCES = {
  'dřevo': 20,
  'kámen': 0,
  'železo': 0,
  'stříbro': 0,
  'zlato': 0,
  'krystal': 0,
  'vlakno': 0,
  'slitina': 0,
  'artefakty': 0, // jen z výprav
  'energie': 0,
  'obilí': 0,
  'maso': 0,
};


const DEFAULT_CAPACITY = {
  'dřevo': 1000,
  'kámen': 1000,
  'železo': 1000,
  'stříbro': 1000,
  'zlato': 1000,
  'krystal': 1000,
  'vlakno': 1000,
  'slitina': 1000,
   'obilí': 1000,
  'maso': 1000,
};

// ===== Výchozí počty strojů =====
// ===== Výchozí počty strojů (zapisují se do state.machines) =====
const DEFAULT_MACHINES = {
  // energie
  ankarit: 0,
  pulzar: 0,
// zbraně
drevene_kopi: 0,
zelezny_mec: 0,
luk: 0,
kuse: 0,
zelezna_sekera: 0,
kopi_ze_slitiny: 0,
mec_bohu: 0,
krystalova_hul: 0,
pulzarove_delo: 0,

  // jídlo (nové recepty)
  chleb_bojovniku: 0,
  masova_kase: 0,
  susene_maso: 0,
  lovci_zasoby: 0,
  ritualni_hostina: 0,
  slavnostni_pecivo: 0,
  hostina_vitezu: 0,

  // obrana
vez_lucistnik: 0,
hradba_kopinici: 0,
balista_stribro: 0,
elitni_strelec: 0,
krystalova_vez: 0,
strazce_pulzaru: 0,

};


// ===== Migrace starých klíčů (bez diakritiky → s diakritikou apod.) =====
const KEY_MAP = {
  'vlákno': 'vlakno',
  'kamen': 'kámen',
  'zelezo': 'železo',
  'stribro': 'stříbro',
  'drevo': 'dřevo'
};
function migrateKeys(obj){
  if (!obj) return;
  for (const [oldKey, newKey] of Object.entries(KEY_MAP)){
    if (oldKey in obj){
      obj[newKey] = (obj[newKey] || 0) + (obj[oldKey] || 0);
      delete obj[oldKey];
    }
  }
}
// ---- Výzkumy: jistota, že klíč existuje ----
function ensureResearchKey(key, baseTime = 10, timeFactor = 1.45){
  if (!state.research) state.research = {};
  if (!state.research[key]){
    state.research[key] = { level: 0, action: null, remaining: 0, baseTime, timeFactor };
  }else{
    // doplň chybějící pole (když jsou ve starém save)
    const r = state.research[key];
    if (typeof r.level !== 'number')     r.level = 0;
    if (typeof r.remaining !== 'number') r.remaining = 0;
    if (!('action' in r))                r.action = null;
    if (typeof r.baseTime !== 'number')  r.baseTime = baseTime;
    if (typeof r.timeFactor !== 'number')r.timeFactor = timeFactor;
  }
}

// ===== Postava – defaulty =====
const EMPTY_INV = Array.from({ length: 50 }, () => null); // 5 řádků × 10 sloupců
const EMPTY_EQUIP = {
  head: null, chest: null, legs: null, boots: null,
  weapon: null, offhand: null, ring1: null, ring2: null, amulet: null
};

// ===== Hlavní stav hry =====
export const state = {
  resources: { ...DEFAULT_RESOURCES, ...(START_RESOURCES || {}) },
  capacity: { ...DEFAULT_CAPACITY },
  tick: 0,
  // VÝPRAVA (jednoduchý stav)
  expedition: { status: 'idle', phaseIndex: -1, remaining: 0, log: [] },

  // POSTAVA
  player: {
    level: 1,
    stats: { health: 100, mana: 100, vitality: 100, attack: 10, defense: 5 },
    max:   { health: 100, mana: 100, vitality: 100 },
    regen: { interval: 10, health: 10, mana: 10, vitality: 15 }, // každých 10 s
    inventory: [...EMPTY_INV],
    equipment: { ...EMPTY_EQUIP }
  },

  // VÝZKUMY
research: {
VDrevo: { level: 0, action: null, remaining: 0, baseTime: 10, timeFactor: 1.45 },
VKamen: { level: 0, action: null, remaining: 0, baseTime: 10, timeFactor: 1.45 },
VArtefakty: { level: 0, action: null, remaining: 0, baseTime: 10, timeFactor: 1.45 },
VOkoPoutnika: { level: 0, action: null, remaining: 0, baseTime: 10, timeFactor: 1.45 },


  
},
  // …


  // === STROJE (vyrobené kusy) ===
   // === STROJE (vyrobené kusy) ===
  machines: { ...DEFAULT_MACHINES },


};

// === NORMALIZACE KAPACIT ===
// 1) výchozí kapacita pro všechny běžné suroviny = 1000
['dřevo','kámen','železo','stříbro','zlato','krystal','vlakno','slitina','obilí','maso']
  .forEach(k => { state.capacity[k] = 1000; });

// 2) "energie" a "artefakty" nemají kapacitu → smaž klíč (zobrazí se jen číslo)
delete state.capacity.energie;
delete state.capacity.artefakty;

// ihned po vytvoření sjednoť případné staré klíče
migrateKeys(state.resources);
migrateKeys(state.capacity);

// ===== Helpers pro suroviny =====
// --- Výzkumy: časování ---
export function getResearchDuration(r){
  const base   = r.baseTime ?? 10;
  const factor = r.timeFactor ?? 1.45;

  // kombinace: elixíry (effectsBuff) + písaři (effects)
  const eBuff = Number(state?.effectsBuff?.researchTime || 0); // např. -0.50
  const ePis  = Number(state?.effects?.researchTime    || 0);  // malé kumulované záporné %
  const mul   = Math.max(0.05, 1 + eBuff + ePis);

  return Math.ceil(base * Math.pow(factor, r.level || 0) * mul);
}



export function startResearch(id){
  ensureResearchKey(id);
  const r = state.research[id];
  if (!r) return false;
  if (r.action) return false; // už běží

  // najdi konfiguraci výzkumu
  const list = window.__RESEARCH_LIST__ || window.RESEARCHES || [];
  const cfg = list.find(x => x.id === id) || null;

  // spočti cenu dalšího levelu a zkontroluj suroviny
  const curLevel = r.level || 0;
  const cost = getResearchCost(cfg, curLevel);
  if (!canPay(cost)) return false;

  // zaplať a spusť
    // zaplať a spusť
  pay(cost);
  r.action = 'upgrade';

  // použij parametry z konfigurace (pokud existují)
  if (cfg && typeof cfg.baseTime === 'number')   r.baseTime   = cfg.baseTime;
  if (cfg && typeof cfg.timeFactor === 'number') r.timeFactor = cfg.timeFactor;

  r.remaining = getResearchDuration(r);
  return true;

}



export function tickResearch(){
  // 1 tick = 1 s (stejně jako u budov)
  for (const [id, r] of Object.entries(state.research || {})){
    if (r?.action === 'upgrade' && r.remaining > 0){
      r.remaining = Math.max(0, r.remaining - 1);
      if (r.remaining === 0){
        r.action = null;
        r.level = (r.level||0) + 1;
        // navázané efekty (HP apod.)
        applyResearchEffects?.();
      }
    }
  }
}

// Použijeme při offline dopočtu v load()
export function applyOfflineResearch(seconds){
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  for (const r of Object.values(state.research || {})){
    if (r?.action === 'upgrade' && r.remaining > 0){
      if (seconds >= r.remaining){
        // dokonči běžící výzkum (NEzahajuj automaticky další)
        seconds -= r.remaining;
        r.remaining = 0;
        r.action = null;
        r.level = (r.level||0) + 1;
      }else{
        r.remaining -= seconds;
      }
    }
  }
  // po případném dokončení přepočti efekty
  applyResearchEffects?.();
}

// NAHRAĎ celou funkci addResource touto verzí
export function addResource(key, delta = 0){
  if (!state.resources) state.resources = {};
  if (!state.stats) state.stats = {};
  if (!state.stats.spent) state.stats.spent = {};
  if (typeof state.stats.nickname !== 'string') state.stats.nickname = 'host';

  const current = Number(state.resources[key] || 0);
  const next = current + Number(delta || 0);
  state.resources[key] = Math.max(0, next);

  // pokud odebíráme (utrácíme), započti do statistiky
  if (Number(delta) < 0){
    const spent = state.stats.spent;
    const add = Math.abs(Number(delta));
    spent[key] = Number(spent[key] || 0) + add;
  }
}
// VLOŽ POD addResource
export function totalSpentPoints(){
  const s = state?.stats?.spent || {};
  return Object.values(s).reduce((a,b)=>a + Number(b||0), 0);
}

export function ensureStats(){
  if (!state.stats) state.stats = {};
  if (!state.stats.spent) state.stats.spent = {};
  if (typeof state.stats.nickname !== 'string') state.stats.nickname = 'host';
}


export function canPay(cost){
  return Object.entries(cost).every(([k, v]) => (state.resources[k] || 0) >= v);
}

export function pay(cost){
  Object.entries(cost).forEach(([k, v]) => { state.resources[k] -= v; });
}

export function addCapacity(delta){
  for (const [k, v] of Object.entries(delta)){
    state.capacity[k] = Math.max(0, (state.capacity[k] || 0) + v);
  }
}

// ===== Výzkumy: efekty =====

// Produkční rychlost budovy s ohledem na výzkumy
export function getBuildingRate(b){
  const base = (b.baseRate || 0) * (b.level || 0);
  const mulResearch = buildingMultiplier(state, b);

  // globální buff (např. Elixír bohů)
  const globalProd = Number(state?.effectsBuff?.prodAll || 0);

  // písařské bonusy na konkrétní surovinu (dřevo/kámen/…)
  const byRes = Number(state?.effects?.prodByRes?.[b.output] || 0);

  // vše se sčítá (aditivní %), pak vynásobí
  return base * mulResearch * (1 + globalProd + byRes);
}




// Aplikuj efekty výzkumů na odvozené hodnoty (max HP postavy apod.)
export function applyResearchEffects(){
  applyAllEffects(state);
  // Výzkum2: +150 HP za level
  const baseMaxHP = 100;
  const lv2 = state.research?.vyzkum2?.level || 0;
  state.player.max.health = baseMaxHP + 150 * lv2;

  // Ořež current HP do maxima
  state.player.stats.health = Math.min(state.player.stats.health, state.player.max.health);
}

// ===== Postava: regenerace =====
export function applyPlayerRegen(){
  const p = state.player;
  if (!p) return;
  const clamp = (val, max) => Math.min(max, Math.max(0, val));
  p.stats.health   = clamp(p.stats.health   + (p.regen.health   || 0), p.max.health);
  p.stats.mana     = clamp(p.stats.mana     + (p.regen.mana     || 0), p.max.mana);
  p.stats.vitality = clamp(p.stats.vitality + (p.regen.vitality || 0), p.max.vitality);
}

// ===== (De)serializace budov pro uložení =====
function serializeBuildings(buildings = []){
  return buildings.map(b => ({
    id: b.id,
    level: b.level,
    isBuilt: b.isBuilt,
    action: b.action,
    remaining: b.remaining,
    upgradeTime: b.upgradeTime,
    // ⬇️ uložíme, pokud existuje (používá Mimozemské jádro)
    grantedUpTo: typeof b.grantedUpTo === 'number' ? b.grantedUpTo : undefined,

  }));
}


function hydrateBuildings(buildings = [], saved = []){
  saved.forEach(sb => {
    const b = buildings.find(x => x.id === sb.id);
    if (!b) return;
    if (typeof sb.level === 'number')     b.level = sb.level;
    if (typeof sb.isBuilt === 'boolean')  b.isBuilt = sb.isBuilt;
    b.action    = sb.action ?? null;
    b.remaining = sb.remaining ?? 0;
    if (typeof sb.upgradeTime === 'number') b.upgradeTime = sb.upgradeTime;
    if (typeof sb.grantedUpTo === 'number') b.grantedUpTo = sb.grantedUpTo;
 // ⬅️
  });
}


// ===== Offline produkce (1 tick = 1 s) =====
function applyOfflineProgress(buildings = [], seconds){
  if (!Number.isFinite(seconds) || seconds <= 0) return;

  // regenerace postavy po blocích intervalů
  const rI = state.player.regen.interval || 10;
  const regenTimes = Math.floor(seconds / rI);
  for (let i = 0; i < regenTimes; i++) applyPlayerRegen();

  state.tick += seconds;

  buildings.forEach(b => {
    let left = seconds;

    // Stavba: neprodukuje
    if (b.action === 'build' && b.remaining > 0){
      const spend = Math.min(left, b.remaining);
      left -= spend;
      b.remaining -= spend;
      if (b.remaining <= 0){
        b.remaining = 0;
        b.action = null;
        b.isBuilt = true;
        if (b.output) addCapacity({ [b.output]: 30 }); // ⬅️ po dokončení stavby
      }
    }

    if (left <= 0) return;
    if (!b.isBuilt) return;

    // Upgrade: část na starém, zbytek na novém levelu
    if (b.action === 'upgrade' && b.remaining > 0){
      const before = Math.min(left, b.remaining);
      if (b.output) addResource(b.output, getBuildingRate(b) * before);
      left -= before;
      b.remaining -= before;

      if (b.remaining <= 0){
        b.remaining = 0;
        b.action = null;
        b.level++;
        b.upgradeTime += b.timeIncrement;
        if (b.output) addCapacity({ [b.output]: 30 }); // ⬅️ po dokončení upgradu
      }

      if (left > 0 && b.output){
        addResource(b.output, getBuildingRate(b) * left);
      }
      return;
    }

    // Bez akce: celou dobu běžná produkce
    if (b.output){
      addResource(b.output, getBuildingRate(b) * left);
    }
  });
}


// ===== Uložení / Načtení =====
function _saveKey(){
  const u = getCurrentUser?.() || 'host';
  return `idle_save:${u}`;
}

export function save(){
    // pokud běží hard reset, na jeden (resp. do reloadu) žádný save
  if (typeof window !== 'undefined' && window.__SKIP_SAVE_ONCE) return;

  const buildings = (typeof window !== 'undefined' && window.__allBuildings) || [];
  const payload = {
    state: {
      resources: state.resources,
      capacity:  state.capacity,
      tick:      state.tick,
      player:    state.player,
      research:  state.research,
      machines:  state.machines,           // ⬅ uložit stroje
      effects:    state.effects,      // ⬅ nově ukládáme kumulované bonusy písařů
  effectsBuff: state.effectsBuff, // ⬅ případné dočasné buffy (elixíry)
  pisari:     state.pisari,       // ⬅ stav rozběhlého zkoumání + log
    },
    buildings: serializeBuildings(buildings), // ⬅ uložit budovy (id, level, akce, remaining…)
    savedAt: Date.now(),
    v: 2
  };
  localStorage.setItem(_saveKey(), JSON.stringify(payload));


}

export function load(buildings){
const raw = localStorage.getItem(_saveKey());


  if (!raw) return;
  try{
    const data = JSON.parse(raw);

    // ===== v1 (historický formát bez "state") =====
    if (!data.state){
      Object.assign(state.resources, data.resources || {});
      Object.assign(state.capacity,  data.capacity  || {});
      if ('energie' in state.capacity) delete state.capacity.energie; // starý klíč
      migrateKeys(state.resources);
      migrateKeys(state.capacity);
      state.tick = data.tick || 0;
      // v1 neznal stroje → defaulty
      state.machines = state.machines || {};
      // nic víc tu není (budovy v1 byly jen v paměti)
      return;
    }

    // ===== v2+ =====
    Object.assign(state.resources, data.state.resources || {});
    Object.assign(state.capacity,  data.state.capacity  || {});
    if ('energie' in state.capacity) delete state.capacity.energie; // jistota
    migrateKeys(state.resources);
    migrateKeys(state.capacity);

    state.tick = data.state.tick || 0;

    // postava / výzkumy / stroje
    if (data.state.player)   state.player   = data.state.player;
    if (data.state.research) state.research = data.state.research;
    if (data.state.effects)     state.effects     = data.state.effects;
if (data.state.effectsBuff) state.effectsBuff = data.state.effectsBuff;
if (data.state.pisari)      state.pisari      = data.state.pisari;

    const ensureResearchKey = (key) => {
  if (!state.research[key]) {
    state.research[key] = { level: 0, action: null, remaining: 0, baseTime: 10, timeFactor: 1.45 };
  }
};
    state.machines = { ...(state.machines || {}), ...(data.state.machines || {}) }; // ⬅ načti stroje

    // budovy: nahrát uložené hodnoty do existujících instancí
    hydrateBuildings(buildings, data.buildings || []);  // ⬅ důležité – bez toho by levely/akce zmizely

    // offline dopočet (volitelné, ale už ho v souboru máš)
    const savedAt = Number(data.savedAt || 0);
    const delta   = savedAt ? Math.max(0, Math.floor((Date.now() - savedAt)/1000)) : 0;
    applyOfflineProgress?.(buildings, delta);   // dopočet stavby/produkce při pauze
    applyOfflineResearch?.(delta);              // dopočet výzkumů

    // přepočty efektů po načtení
    applyResearchEffects?.();
  }catch(e){
    console.warn('Save load failed:', e);
  }
}

