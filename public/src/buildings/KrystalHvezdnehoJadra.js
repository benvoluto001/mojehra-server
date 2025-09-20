// src/buildings/KrystalHvezdnehoJadra.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';
export class KrystalHvezdnehoJadra extends BaseBuilding {
  constructor(){
    super({
    
      id: 'KrystalHvezdnehoJadra',
      name: 'Krystal hvězdného jádra',
      output: 'krystal',          // ⬅️ nová surovina (přidáme ji do state)
      baseRate: 0.08,

      // první stavba
      isBuilt: false,
      buildTime: 2,
      buildCost: { dřevo: 150, kámen: 240, železo: 80, stříbro: 185, zlato: 240,},

      // náklady upgradu
      upgradeCostBase: { dřevo: 150, kámen: 240, železo: 80, stříbro: 185, zlato: 240,},   // základ
      upgradeCostLinearInc: 10,         // každý další level +10 dřeva
      upgradeCostFactor: 1.5,          // multiplikativní faktor

      // tick (sekundy) – hra přičítá 1×/s
      timeIncrement: 1,
      // volitelně: odemčení až po určitém progresu
      
      requirements: {
        ZlatyDul: 10,       // potřebuje Zlatý důl lvl 2
             // a Železný důl lvl 3
      },
      researchReq: { VZariciFragmenty: 6 },
    });
  }
    canStartBuild(buildings = []){
    const lvl = state.research?.VZariciFragmenty?.level || 0;
    if (lvl < 6) return false;
    return super.canStartBuild(buildings);
  }

}
