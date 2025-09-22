

// src/buildings/StribrnyDul.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';

export class StribrnyDul extends BaseBuilding {
  constructor(){
    super({
      id: 'stribrnyDul',
      name: 'Stříbrný důl',
      output: 'stříbro', 

      // baseRate = produkce ZA HODINU na Lvl 1 (100 %)
      // L1 = 125 / hod (před výzkumy)
      baseRate: 0.41,

      // výchozí level
      level: 1,

      // růst podle levelu: p_n = 18 + 102 * φ^{-(n-2)}, L1 = 100 %, L2 = +120 %
      growthType: 'phi',

      // stavba / upgrade
      isBuilt: false,
      buildTime: 2,
      buildCost: { dřevo: 60, kámen: 120, železo: 45, },

      // náklady upgradu
      upgradeCostBase: { dřevo: 120, kámen: 360, železo: 135 },   // základ
      upgradeCostLinearInc: 10,         // každý další level +10 dřeva
      upgradeCostFactor: 1.5,          // multiplikativní faktor

      // tick (sekundy) – hra přičítá 1×/s
      timeIncrement: 1.7,
       
    

      requirements: {
        zeleznydul: 3, kamenolom: 8, },
     
      researchReq: { VPokrocileNastroje: 5 },
    });
  }
canStartBuild(buildings = []){
  const lvl = state.research?.VPokrocileNastroje?.level || 0;
  if (lvl < 5) return false; // vyžaduje výzkum Pokročilé nástroje lvl 4
  return super.canStartBuild(buildings);
}

  // čas upgradu: 2^level sekund (Lvl1→2 s, Lvl2→4 s, Lvl3→8 s…)
  getUpgradeTime(level = this.level){
    const L = Math.max(1, Number(level) || 1);
    return Math.pow(2, L);
  }
}
