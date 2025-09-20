// src/buildings/FarmaNaMaso.js
import { BaseBuilding } from './BaseBuilding.js';

export class FarmaNaMaso extends BaseBuilding {
  constructor(){
    super({
      id: 'FarmaNaMaso',
      name: 'Farma na maso',
      output: 'maso',
      baseRate: 0.55,

      // výchozí stav
      level: 1,
      isBuilt: false,

      // stavba / upgrade – levné a bez požadavků
      buildTime: 2,
      buildCost: { dřevo: 20 },

      upgradeTime: 2,
      upgradeCostBase: { dřevo: 10 },
      upgradeCostLinearInc: 10,
      upgradeCostFactor: 1.35,

      timeIncrement: 1,
      requirements: {
        
        pila: 5,
        }
    });
  }
}
