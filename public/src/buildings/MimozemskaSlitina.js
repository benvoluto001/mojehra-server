// src/buildings/MimozemskaSlitina.js
import { BaseBuilding } from './BaseBuilding.js';

export class MimozemskaSlitina extends BaseBuilding {
  constructor(){
    super({
      id: 'MimozemskaSlitina',
      name: 'Mimozemská slitina',
      output: 'slitina',
      baseRate: 1,

      // stavba: okamžitě spotřebuje 110 energie
      isBuilt: false,
      buildTime: 1,
      buildCost: { 'energie': 110, 'kámen': 200, 'železo': 120 },

      // upgrady (ceny si můžeš doladit)
      upgradeTime: 1,
      upgradeCostBase: { 'kámen': 180, 'železo': 150 },
      upgradeCostLinearInc: 40,
      upgradeCostFactor: 1.1,
      timeIncrement: 1,
requirements: {
  
},
researchReq: { VSyntezaSlitiny: 5 },
 // ⬅ odemkne se na 5. úrovni výzkumu

      
    });
  }
}
