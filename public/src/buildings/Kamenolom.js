// src/buildings/Kamenolom.js
import { BaseBuilding } from './BaseBuilding.js';

export class Kamenolom extends BaseBuilding {
  constructor(){
    super({
      id: 'kamenolom',
      name: 'Kamenolom',
      output: 'kámen',
       baseRate: 0.45,

      // výchozí level
      level: 1,

      // růst podle levelu: p_n = 18 + 102 * φ^{-(n-2)}, L1 = 100 %, L2 = +120 %
      growthType: 'phi',

      // stavba / upgrade
      isBuilt: false,
      buildTime: 2.2,
      buildCost: { dřevo: 60 },

      // náklady upgradu
      upgradeCostBase: { dřevo: 65, kámen: 15 },   // základ
      upgradeCostLinearInc: 10,         // každý další level +10 dřeva
      upgradeCostFactor: 1.45,          // multiplikativní faktor

      // tick (sekundy) – hra přičítá 1×/s
      timeIncrement: 1,
    });
  }
}
