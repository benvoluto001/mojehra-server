// src/buildings/Sklad.js
import { BaseBuilding } from './BaseBuilding.js';
import { addCapacity, state } from '../state.js';
const KEYS = ['dřevo','kámen','železo','stříbro','zlato','krystal','vlakno','artefakty','slitina'];

export class Sklad extends BaseBuilding {
  constructor(){
    super({
      id: 'sklad',
      name: 'Sklad',
      output: null,          // neprodukuje suroviny
      baseRate: 0,           // jen pro formu
      isBuilt: false,
      buildTime: 5,
      buildCost: { dřevo: 120, kámen: 80 },
      upgradeTime: 5,
      upgradeCostBase: { dřevo: 140, kámen: 120 },
      upgradeCostLinearInc: 30,
      upgradeCostFactor: 1.35,
      timeIncrement: 1,
    });
  }
// přepočet kapacit: 8000 základ + 40% za každý level
   // přepočet kapacit: level 1 = 8000, každý další level +40% (×1.4)
  recalcCapacity(){
    const base = 8000;
    const factor = 1.4; // správně +40 %
    const cap = Math.round(base * Math.pow(factor, (this.level - 1)));
    // přepiš všechny kapacity kromě "energie" a "artefakty"
    Object.keys(state.capacity || {}).forEach(k => {
      if (k === 'energie' || k === 'artefakty') return;
      state.capacity[k] = cap;
    });
  }

  startBuild(buildings){
    const ok = super.startBuild(buildings);
    
    return ok;
  }

  startUpgrade(){
    const ok = super.startUpgrade();
    
    return ok;
  }
  // po dokončení stavby/upgrade navýší kapacitu
    tick(){
    const beforeBuilt = this.isBuilt;
    const beforeLevel = this.level;
    super.tick(); // dokončí akci (build/upgrade), případně zvedne level
    const finishedBuild   = this.isBuilt && !beforeBuilt;
    const finishedUpgrade = this.level > beforeLevel;
    if (finishedBuild || finishedUpgrade){
      this.recalcCapacity(); // nastaví kapacitu podle vzorce (žádné +300 navíc)
    }
  }

}
// --- NOVĚ: po prvním postavení nastav jednotnou kapacitu 8000 pro všechny suroviny
