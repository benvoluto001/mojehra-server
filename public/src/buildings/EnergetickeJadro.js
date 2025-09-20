// src/buildings/EnergetickeJadro.js
import { BaseBuilding } from './BaseBuilding.js';
import { state, addResource } from '../state.js';


export class EnergetickeJadro extends BaseBuilding {
  constructor(){
    super({
      id: 'EnergetickeJadro',
      name: 'Energetické jádro',
      output: null,         // neprodukuje průběžně
      baseRate: 0,

      isBuilt: false,
      buildTime: 1,
      buildCost: { 'kámen': 150, 'železo': 100 },

      upgradeTime: 1,
      upgradeCostBase: { 'kámen': 120, 'železo': 90 },
      upgradeCostLinearInc: 30,
      upgradeCostFactor: 1.1,
      timeIncrement: 1,

      requirements: {
      KrystalHvezdnehoJadra: 6,       
        
      },
      researchReq: { VKrystalografie: 6 },
    });

  

    // do jaké úrovně už jsme přidělili energii (uloží se v save)
    this.grantedUpTo = 0;
  }

  // MimozemskeJadro / EnergetickeJadro
// příděl energie po postavení/zvýšení levelu
grantForLevel(level){ return level === 1 ? 100 : 115; }
grantIfNeeded(){
  if (!this.isBuilt) return;
  const already = this.grantedUpTo || 0;
  if (this.level <= already) return;
  for (let L = already + 1; L <= this.level; L++) addResource('energie', this.grantForLevel(L));
  this.grantedUpTo = this.level;
}

// jednotná tick metoda
tick(){
  const prevLevel = this.level;
  const prevBuilt = this.isBuilt;
  super.tick(); // dokončí build/upgrade
  if ((this.isBuilt && !prevBuilt) || (this.level > prevLevel)){
    this.grantIfNeeded();
  }
}

// odemčení stavby: KHJ lvl 6 + výzkum Krystalografie lvl 6
canStartBuild(buildings = []){
  const researchLvl = state.research?.VKrystalografie?.level || 0;
  if (researchLvl < 6) return false;

  // zjisti level a zda stojí KrystalHvezdnehoJadra
  const khj = (window.__allBuildings || []).find(b => b.id === 'KrystalHvezdnehoJadra');
  const khjLevel = khj?.level || 0;
  const khjBuilt = !!khj?.isBuilt;
  if (!(khjBuilt && khjLevel >= 6)) return false;

  return super.canStartBuild(buildings);
}

}
