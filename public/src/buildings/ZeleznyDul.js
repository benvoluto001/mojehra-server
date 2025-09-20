// src/buildings/ZeleznyDul.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';

export class ZeleznyDul extends BaseBuilding {
  constructor(){
    super({
      id: 'zeleznydul',
      name: 'Železný důl',
      output: 'železo',
      // baseRate = produkce ZA HODINU na Lvl 1 (100 %)
      // L1 = 125 / hod (před výzkumy)
      baseRate: 0.42,

      // výchozí level
      level: 1,

      // růst podle levelu: p_n = 18 + 102 * φ^{-(n-2)}, L1 = 100 %, L2 = +120 %
      growthType: 'phi',

      // stavba / upgrade
      isBuilt: false,
      buildTime: 2,
      buildCost: { dřevo: 60 },

      // náklady upgradu
      upgradeCostBase: { dřevo: 65, kámen: 40, železo: 18},   // základ
      upgradeCostLinearInc: 10,         // každý další level +10 dřeva
      upgradeCostFactor: 1.5,          // multiplikativní faktor

      // tick (sekundy) – hra přičítá 1×/s
      timeIncrement: 1.5,
      
      requirements: {
        
        pila: 6,
        kamenolom: 3, // můžeš si nastavit požadavky
      
     },

    
    });
  }

  // čas upgradu: 2^level sekund (Lvl1→2 s, Lvl2→4 s, Lvl3→8 s…)
  getUpgradeTime(level = this.level){
    const L = Math.max(1, Number(level) || 1);
    return Math.pow(2, L);
  }
}
