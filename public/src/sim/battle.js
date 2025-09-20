// src/sim/battle.js
import { UNIT_TYPES } from '../vojsko/units.js';


/** Konzistentní typy poškození */
export const DAMAGE_TYPES = ['azurová','purpurová','smaragdová','karminová'];

/** Výchozí RPS matice (lze přepsat v UI) */
export function defaultMatrix(){
  const m = {};
  for (const a of DAMAGE_TYPES){ m[a] = {}; for (const d of DAMAGE_TYPES){ m[a][d] = 1; } }
  // RPS: +25 % proti „následujícímu“, -10 % proti „předchozímu“
  m['azurová']['purpurová'] = 1.25; m['azurová']['smaragdová'] = 0.90;
  m['purpurová']['karminová'] = 1.25; m['purpurová']['azurová'] = 0.90;
  m['karminová']['smaragdová'] = 1.25; m['karminová']['purpurová'] = 0.90;
  m['smaragdová']['azurová']  = 1.25; m['smaragdová']['karminová'] = 0.90;
  return m;
}

/* ------------------------ Pomocné výpočty / agregace ------------------------ */
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const deep  = (x)=>JSON.parse(JSON.stringify(x));

function summarizeArmy(src){
  const out = {};
  for (const u of UNIT_TYPES){
    const c = Number(src?.[u.id]||0);
    if (c>0) out[u.id] = c;
  }
  return out;
}
function totalUnits(army){ return Object.values(army).reduce((s,n)=>s+Number(n||0),0); }
function totalHP(army){
  let hp=0; for (const u of UNIT_TYPES){ const c=Number(army[u.id]||0); if(!c)continue; hp += c*(u.stats.hp||0); } return hp;
}
function avgArmor(army){
  let num=0, den=0;
  for (const u of UNIT_TYPES){ const c=Number(army[u.id]||0); if(!c)continue; num += c*(u.stats.armor||0); den += c; }
  return den? num/den : 0;
}
function unitType(u){ return u.damageType || 'azurová'; }

function avgTypeMult(attType, defArmy, M){
  let num=0, den=0;
  for (const u of UNIT_TYPES){
    const c=Number(defArmy[u.id]||0); if(!c)continue;
    const defType = unitType(u);
    num += c * Number(M?.[attType]?.[defType] ?? 1);
    den += c;
  }
  return den? (num/den):1;
}

/** Rozdělení dmg podle podílu HP; vrací zabité kusy a zbytkový dmg (ignorován) */
function distributeDamage(army, dmg){
  const casualties = {};
  let left = dmg;
  const hpAll = totalHP(army);
  if (hpAll<=0 || dmg<=0) return { casualties, left:0 };

  for (const u of UNIT_TYPES){
    const id = u.id; const c = Number(army[id]||0); if(!c)continue;
    const unitHP = u.stats.hp||0;
    const share  = (c*unitHP)/hpAll;
    const dmgHere = share * dmg;
    const dead = Math.min(c, Math.floor(dmgHere / Math.max(1, unitHP)));
    if (dead>0){ casualties[id] = dead; army[id] = c - dead; left -= dead*unitHP; }
  }
  return { casualties, left: Math.max(0,left) };
}

/* --------------------------- Schopnosti / statusy --------------------------- */
function weightedFromUnits(army, key){
  // vážený průměr (podle počtu kusů), hodnoty z u.effects[key]
  const tot = totalUnits(army); if (!tot) return 0;
  let sum=0;
  for (const u of UNIT_TYPES){
    const c = Number(army[u.id]||0); if(!c) continue;
    const v = Number(u.effects?.[key] || 0);
    sum += (c / tot) * v;
  }
  return sum;
}

function buildPreBattleStatus(armySelf, armyEnemy){
  // aglomerované statusy vycházející z přítomných typů jednotek
  // průraznost (ignoruj % armoru nepřítele) – vážený průměr
  const pierce = clamp(weightedFromUnits(armySelf,'pierceArmorPct'), 0, 0.9);

  // aura: snížení příchozího dmg
  const red   = clamp(weightedFromUnits(armySelf,'teamDamageReductionPct'), 0, 0.8);

  // burst: dočasné posílení vlastního útoku na počátku
  const burstPct    = clamp(weightedFromUnits(armySelf,'burstAtkPct'), 0, 3);
  const burstRounds = Math.round(weightedFromUnits(armySelf,'burstRounds')); // když nemají všichni, zkrátí se

  // debuff na protivníka: -% k útoku na X kol
  const debuffPct    = clamp(weightedFromUnits(armySelf,'debuffAtkPct'), 0, 0.9);
  const debuffRounds = Math.round(weightedFromUnits(armySelf,'debuffAtkRounds'));

  return {
    pierceArmorPct: pierce,            // trvalé (dokud jednotky žijí)
    dmgTakenMult:   1 - red,           // multiplicativní příjem dmg (<1 znamená redukci)
       effects: [
      ...(burstPct>0 && burstRounds>0 ? [{ kind:'selfAtkMult', mult: 1+burstPct, ttl: burstRounds }] : []),
      ...(debuffPct>0 && debuffRounds>0 ? [{ kind:'oppAtkMult',  mult: 1-debuffPct, ttl: debuffRounds }] : []),
    ]

  };
}

function popMultipliers(status, oppStatus){
  // spočti okamžité násobky z aktivních efektů (a tickni TTL)
  const out = { selfAtk:1, oppAtkOnMe:1 };
  const listSelf = status.effects || [];
  const listOpp  = oppStatus.effects || [];

  for (const e of listSelf){ if (e.ttl>0 && e.kind==='selfAtkMult') out.selfAtk *= e.mult; }
  for (const e of listOpp){  if (e.ttl>0 && e.kind==='oppAtkMult')  out.oppAtkOnMe *= e.mult; }

  // snížení TTL po aplikaci
  for (const e of listSelf){ if (e.ttl>0) e.ttl--; }
  for (const e of listOpp){  if (e.ttl>0) e.ttl--; }

  return out;
}

/* --------------------------------- Výpočet --------------------------------- */
/**
 * @param {Object} armyA {unitId: count}
 * @param {Object} armyB {unitId: count}
 * @param {Object} opts  { matrix, armorEffect (0..1 per 1 armor), maxRounds }
 * @returns {Object} { winner, rounds, armyA, armyB, log }
 */
export function simulateBattle(armyA, armyB, opts={}){
  const M = opts.matrix || defaultMatrix();
  const armorEff = clamp(Number(opts.armorEffect ?? 0.01), 0, 1); // kolik % dmg srazí 1 bod armoru
  const maxRounds = clamp(Number(opts.maxRounds ?? 50), 1, 200);

  const A = deep(summarizeArmy(armyA));
  const B = deep(summarizeArmy(armyB));
  const log = [];

  // FÁZE 1 – předbojové statusy (z přítomných jednotek)
  const statA = buildPreBattleStatus(A,B);
  const statB = buildPreBattleStatus(B,A);

  let round = 0;
  while (round < maxRounds && totalHP(A)>0 && totalHP(B)>0){
    round++;

    // FÁZE 2 – úpravy statistik pro toto kolo (burst/debuff)
    const mulA = popMultipliers(statA, statB); // { selfAtk, oppAtkOnMe }
    const mulB = popMultipliers(statB, statA);

    // průměrný nepřátelský armor po průraznosti
    const effArmorB = Math.max(0, avgArmor(B) * (1 - statA.pierceArmorPct));
    const effArmorA = Math.max(0, avgArmor(A) * (1 - statB.pierceArmorPct));

    // hrubé dmg podle ATK a matic typů
    const rawAB = composeDamage(A, B, M) * mulA.selfAtk * mulB.oppAtkOnMe; // debuff B snižuje A?
    const rawBA = composeDamage(B, A, M) * mulB.selfAtk * mulA.oppAtkOnMe;

    // mitigace z armoru (cap 80 %) + týmové redukce dmg
    const effAB = rawAB * (1 - clamp(effArmorB*armorEff, 0, 0.8)) * (statB.dmgTakenMult);
    const effBA = rawBA * (1 - clamp(effArmorA*armorEff, 0, 0.8)) * (statA.dmgTakenMult);

    // FÁZE 3 – aplikace poškození → padlí
    const resB = distributeDamage(B, effAB);
    const resA = distributeDamage(A, effBA);

    log.push(`Kolo ${round}: A→B ${effAB.toFixed(1)} dmg, B→A ${effBA.toFixed(1)} dmg`);
    if (totalHP(A)<=0 || totalHP(B)<=0) break;
  }

  // FÁZE 4 – konec bitvy
  const w = totalHP(A)>0 && totalHP(B)<=0 ? 'A'
        : totalHP(B)>0 && totalHP(A)<=0 ? 'B'
        : totalHP(A)===totalHP(B) ? 'remíza'
        : (totalHP(A)>totalHP(B) ? 'A' : 'B');

  return { winner: w, rounds: round, armyA: A, armyB: B, log };
}

function composeDamage(attArmy, defArmy, M){
  let dmg=0;
  for (const u of UNIT_TYPES){
    const cnt = Number(attArmy[u.id]||0); if(!cnt) continue;
    const base = cnt * (u.stats.atk||0);
    const mult = avgTypeMult(unitType(u), defArmy, M);
    dmg += base * mult;
  }
  return dmg;
}
