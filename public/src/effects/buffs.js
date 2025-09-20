// src/effects/buffs.js
import { state, save } from '../state.js';

export function ensureBuffsRoot(){
  if (!state.effectsBuff) state.effectsBuff = {};
  if (!Array.isArray(state.effectsActive)) state.effectsActive = [];
}

export function addTimedBuff({ key, value, durationSec, label }){
  ensureBuffsRoot();
  const until = Date.now() + Math.max(1, Math.floor(durationSec||0)) * 1000;
  state.effectsActive.push({ key, value: Number(value||0), until, label: label || key });
  recalcBuffTotals();
  save?.();
}

export function tickBuffs(){
  ensureBuffsRoot();
  const now = Date.now();
  state.effectsActive = (state.effectsActive || []).filter(b => b && b.until > now);
  recalcBuffTotals();
}

export function recalcBuffTotals(){
  ensureBuffsRoot();
  const now = Date.now();
  const totals = { prodAll:0, researchTime:0, defenseAtk:0, expArtifact:0, defenseMorale:0, heroAtk:0, heroHP:0 };
  (state.effectsActive || []).forEach(b => {
    if (!b || b.until <= now) return;
    if (b.key in totals) totals[b.key] += Number(b.value || 0);
  });
  state.effectsBuff = totals;
}
