// src/research/index.js

import { ZpracovaniDreva }   from './ZpracovaniDreva.js';
import { ZpracovaniKamene }  from './ZpracovaniKamene.js';
import { SyntezaMimozemskeSlitiny } from './SyntezaMimozemskeSlitiny.js';

// 5 jednoduchých výzkumů jako plain objekty
const VOkoPoutnika = {
  id: 'VOkoPoutnika',
name: 'Oko poutníka',
  desc: 'Na výpravách najdeš o 5 % více surovin za každý level.',
  baseTime: 10,
  timeFactor: 1.45,
  cost: { 'stříbro': 550 },
  costFactor: 1.4
};

const VArtefakty = {
  id: 'VArtefakty',
  name: 'Archiv písařů',
  desc: 'Lepší identifikace artefaktů. (zatím bez přímého efektu)',
  baseTime: 12,
  timeFactor: 1.45,
  cost: { 'krystal': 480 },
  costFactor: 1.4
};

const VKrystalografie = {
  id: 'VKrystalografie',
  name: 'Krystalografie',
  desc: 'Znalost krystalových struktur. (zatím bez přímého efektu)',
  baseTime: 12,
  timeFactor: 1.45,
  cost: { 'zlato': 400 },
  costFactor: 1.4
};

const VPokrocileNastroje = {
  id: 'VPokrocileNastroje',
  name: 'Pokročilé nástroje',
  desc: 'Lepší nástroje. (zatím bez přímého efektu)',
  baseTime: 10,
  timeFactor: 1.45,
  cost: { 'železo': 200 },
  costFactor: 1.4
};

const VZariciFragmenty = {
  id: 'VZariciFragmenty',
  name: 'Zářící fragmenty',
  desc: 'Tajemné fragmenty plné energie. (zatím bez přímého efektu)',
  baseTime: 14,
  timeFactor: 1.45,
  cost: { 'zlato': 200 },
  costFactor: 1.45
};

// Nový výzkum – Syntéza mimozemské slitiny
const VSyntezaSlitiny = {
  id: 'VSyntezaSlitiny',
  name: 'Syntéza mimozemské slitiny',
  desc: 'Zvyšuje produkci Mimozemské slitiny (Lv1–4 +6 %/lvl, Lv5–10 +3 %/lvl, 11+ +2 %/lvl). Na 5. úrovni odemyká budovu.',
  baseTime: 10,     // 10 s na úroveň
  timeFactor: 1.5,  // každá další úroveň je o 50 % delší

  // základní cena (můžeš později upravit)
  cost: { 'zlato': 200 },
  costFactor: 1.5,

  // Produkční multiplikátor pro budovu Mimozemská slitina
  buildingMultiplier(state, building){
    if (!building || building.id !== 'MimozemskaSlitina') return 1;
    const lv = state?.research?.VSyntezaSlitiny?.level || 0;
    let add = 0;
    for (let i = 1; i <= lv; i++){
      if (i <= 4) add += 0.06;
      else if (i <= 10) add += 0.03;
      else add += 0.02;
    }
    return 1 + add;
  }
};




// Seznam, který čte UI
export const RESEARCHES = [
  new ZpracovaniDreva(),
  new ZpracovaniKamene(),
  VOkoPoutnika,
  VArtefakty,
  VKrystalografie,
  VPokrocileNastroje,
  VZariciFragmenty,
  VSyntezaSlitiny,   // ⬅️ nový výzkum
];


// ===== Efekty a pomocné funkce =====
export function buildingMultiplier(state, building){
  let mul = 1;
  for (const r of RESEARCHES){
    if (typeof r?.buildingMultiplier === 'function'){
      mul *= Number(r.buildingMultiplier(state, building)) || 1;
    }
  }
  return mul;
}
export function applyAllEffects(_state){}

// +5 % lootu surovin z výprav za každý level „Oka poutníka“
export function expeditionLootMultiplier(state){
  const lvl = state?.research?.VOkoPoutnika?.level || 0;
  return 1 + 0.05 * lvl;
}

// Cena dalšího levelu (preferuje metodu cost(lvl) na třídách)
export function getResearchCost(cfg, level){
  if (cfg && typeof cfg.cost === 'function'){
    return cfg.cost(level || 0) || {};
  }
  const base   = cfg?.cost || { 'stříbro': 50 };
  const factor = cfg?.costFactor ?? 1.4;
  const mul = Math.pow(factor, Math.max(0, level || 0));
  const out = {};
  for (const [k, v] of Object.entries(base)) out[k] = Math.ceil(v * mul);
  return out;
}
