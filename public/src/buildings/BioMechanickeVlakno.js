// src/buildings/BioMechanickeVlakno.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';

export class BioMechanickeVlakno extends BaseBuilding {
  constructor(){
    super({
      id: 'BioMechanickeVlakno',
      name: 'Bio-Mechanické Vlákno',
      output: 'vlakno',          // ⬅️ nová surovina (přidáme ji do state)
      baseRate: 1,

      // první stavba
      isBuilt: false,
      buildTime: 1,
      buildCost: { 'stříbro': 200, 'zlato': 120, 'krystal': 120 },

      // upgrady
      upgradeTime: 1,
      upgradeCostBase: { 'stříbro': 180, 'zlato': 150, 'krystal': 120 },
      upgradeCostLinearInc: 40,
      upgradeCostFactor: 1.1,
      timeIncrement: 1,

      // volitelně: odemčení až po určitém progresu
       requirements: {
        KrystalHvezdnehoJadra: 10,       // potřebuje Zlatý důl lvl 2
             // a Železný důl lvl 3
        
      
            },
     
      researchReq: { VZariciFragmenty: 10 },
    });
  }
  canStartBuild(buildings = []){
      const lvl = state.research?.VZariciFragmenty?.level || 0;
      if (lvl < 10) return false;
      return super.canStartBuild(buildings);
    }
}
