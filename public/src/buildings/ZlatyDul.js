// src/buildings/ZlatyDul.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';

export class ZlatyDul extends BaseBuilding {
  constructor(){
    super({
      id: 'ZlatyDul',
      name: 'Zlatý důl',
      output: 'zlato',
      baseRate: 0.35,

      isBuilt: false,
      buildTime: 2,
      buildCost: { dřevo: 60 },

      upgradeCostBase: { dřevo: 55, kámen: 32, železo: 28 },
      upgradeCostLinearInc: 10,
      upgradeCostFactor: 1.5,

      timeIncrement: 1.8,

      requirements: { stribrnyDul: 3 },
      researchReq: { VPokrocileNastroje: 10 },
    });
  }

  // odemkne se až s výzkumem Pokročilé nástroje (min. lvl 8 – můžeš změnit)
  canStartBuild(buildings = []){
    const lvl = state?.research?.VPokrocileNastroje?.level || 0;
    if (lvl < 8) return false;
    return super.canStartBuild(buildings);
  }
}
