// src/stroje/BaseStroj.js
import { state } from '../state.js';

export class BaseStroj {
  constructor({ id, name, unitTime = 2, unitCost = {} }){
    this.id = id;              // např. 'ankarit'
    this.name = name;          // např. 'Ankarit'
    this.unitTime = unitTime;  // s / kus
    this.unitCost = unitCost;  // { 'vlakno': 5 } apod.

    // běžící výroba
    this.queue = 0;            // kolik kusů právě „ve výrobě“
    this.remaining = 0;        // kolik s zbývá do dokončení AKTUÁLNÍHO kusu
  }

  // Kolik kusů lze maximálně vyrobit z dostupných surovin
  maxCraftable(){
    const arr = Object.entries(this.unitCost);
    if (!arr.length) return Infinity;
    let max = Infinity;
    for (const [k, need] of arr){
      const have = getHave(k);
      max = Math.min(max, Math.floor(have / (need || 1)));
    }
    return Math.max(0, max);
  }

  // Spusť výrobu N kusů (odečte vstupy ihned)
  startCraft(n){
    const qty = Math.max(0, Math.floor(n || 0));
    if (!qty) return false;

    const can = this.maxCraftable();
    const toMake = Math.min(qty, can);
    if (!toMake) return false;

    // zaplať vstupy
    for (const [k, need] of Object.entries(this.unitCost)){
      payIngredient(k, need * toMake);
    }

    // zařaď do fronty
    this.queue += toMake;
    if (this.queue > 0 && this.remaining <= 0){
      this.remaining = this.unitTime; // rozběh prvního kusu
    }
    return true;
  }

  // 1× za sekundu – dokončí kusy a připisuje výstupy
  tick(){
    if (this.queue <= 0) return;
    this.remaining = Math.max(0, this.remaining - 1);
    if (this.remaining === 0){
      // dokončen jeden kus -> připiš do state.machines[this.id]
      addMachine(this.id, 1);
      this.queue -= 1;
      this.remaining = this.queue > 0 ? this.unitTime : 0;
    }
  }
}

/* ===== Pomocné funkce pro zdroje / stroje ===== */

// „Surovina“ může být buď resource (dřevo, krystal, ...) nebo již vyrobený stroj (ankarit, pulzar)
function isMachineKey(key){ return key in (state.machines || {}); }

function getHave(key){
  if (isMachineKey(key)) return Number(state.machines[key] || 0);
  return Number(state.resources[key] || 0);
}

function payIngredient(key, amount){
  if (isMachineKey(key)){
    state.machines[key] = Math.max(0, (state.machines[key] || 0) - amount);
  } else {
    state.resources[key] = Math.max(0, (state.resources[key] || 0) - amount);
  }
}

function addMachine(key, amount){
  state.machines[key] = Math.max(0, (state.machines[key] || 0) + amount);
}
