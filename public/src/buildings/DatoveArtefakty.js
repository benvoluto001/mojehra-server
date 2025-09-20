// src/buildings/DatoveArtefakty.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js'; // ⬅ přidat import stavu

export class DatoveArtefakty extends BaseBuilding {
  constructor(){
    super({
      id: 'DatoveArtefakty',
      name: 'Datové Artefakty',
      output: 'artefakty',
      baseRate: 1,

      isBuilt: false,
      buildTime: 12,
      buildCost: { 'energie': 110, 'kámen': 200, 'železo': 120 },

      upgradeTime: 6,
      upgradeCostBase: { 'kámen': 180, 'železo': 150 },
      upgradeCostLinearInc: 40,
      upgradeCostFactor: 1.1,
      timeIncrement: 3,

      

requirements: {
        KrystalHvezdnehoJadra: 1,       // potřebuje Zlatý důl lvl 2
             // a Železný důl lvl 3
      },
      researchReq: { VArtefakty: 5 },
     
     

    });
  }



  // (ponecháš) – dál to reálně zamkne stavbu, dokud není lvl 5
     canStartBuild(buildings = []){
    const lvl = state.research?.VZariciFragmenty?.level || 0;
    if (lvl < 5) return false;
    return super.canStartBuild(buildings);
  }
}
