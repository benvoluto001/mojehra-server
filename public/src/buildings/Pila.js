// src/buildings/Pila.js
import { BaseBuilding } from './BaseBuilding.js';

export class Pila extends BaseBuilding {
  constructor(){
    super({
      id: 'pila',
      name: 'Pila',
      output: 'dřevo',
      baseRate: 0.55,
      level: 1,

      isBuilt: false,
      buildTime: 2.6,
      buildCost: { dřevo: 20 },

      upgradeTime: 2.6,
      upgradeCostBase: { dřevo: 10 }, // základ
      upgradeCostLinearInc: 10,        // ⬅️ každý další level +5 dřeva
      upgradeCostFactor: 1.55,           // žádné procenta (můžeš změnit třeba na 1.15)

      timeIncrement: 1.5,
    });
  }
}
