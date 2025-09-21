// src/buildings/KrystalHvezdnehoJadra.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';

export class KrystalHvezdnehoJadra extends BaseBuilding {
  constructor(){
    // parametry z tvého zadání
    const BASE_LOW_RATE_PER_HOUR  = 0.5;   // výchozí 0.5/h (vzácné)
    const BASE_HIGH_RATE_PER_HOUR = 1.0;   // volitelný „high“ režim
    const BASE_UPG_TIME_SEC       = 900;   // 15 min
    const TIME_MULT               = 1.22;

    // rychlost: fixní podle režimu (level nemění rychlost)
    const ratePerHour = (_lvl, mode='low') =>
      mode === 'high' ? BASE_HIGH_RATE_PER_HOUR : BASE_LOW_RATE_PER_HOUR;

    // čas upgradu z levelu L na L+1
    const upgradeTime = (lvl) =>
      Math.ceil(BASE_UPG_TIME_SEC * Math.pow(TIME_MULT, Math.max(0, (lvl||1) - 1)));

    super({
      id: 'krystalhvezdnehojadra',
      name: 'Krystal hvězdného jádra',
      output: 'krystal',
      imageKey: 'krystalhvezdnehojadra',

      // UI pro lvl1 (0.5/h – low)
      baseRate: BASE_LOW_RATE_PER_HOUR,

      level: 1,
      isBuilt: false,

      // Stavba (BaseCost + 15 min)
      buildTime: 900,
      buildCost: { dřevo: 2000, kámen: 1600, železo: 1000, zlato: 30 },

      // Upgrady – čas se bere z getUpgradeTime
      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 1200, kámen: 900, železo: 600, zlato: 10 },
      upgradeCostLinearInc: 0,
      upgradeCostFactor: 1.25,

      // Požadavky na odemknutí
      requirements: { zlatydul: 4 },
      researchRequirements: { zariciFragmenty: 2 },

      // výpočetní funkce
      getRatePerHour: (lvl)=> ratePerHour(lvl, 'low'),
      getUpgradeTime: upgradeTime,

      timeIncrement: 1,
    });

    // interní přepínač režimu produkce
    this._prodMode = 'low';
    this._ratePerHour = (lvl)=> ratePerHour(lvl ?? this.level, this._prodMode);
    this._upgradeTime = (lvl)=> upgradeTime(lvl ?? this.level);
  }

  canStartBuild(buildings = {}){
    const goldLvl =
      buildings?.zlatydul?.level ??
      state?.buildings?.zlatydul?.level ?? 0;

    const researchLvl =
      state?.research?.zariciFragmenty?.level ??
      state?.research?.ZariciFragmenty?.level ?? 0;

    if (goldLvl < 4) return false;
    if (researchLvl < 2) return false;
    return super.canStartBuild(buildings);
  }

  onBuilt(){
    try {
      state.unlocks = state.unlocks || {};
      state.unlocks.resources = state.unlocks.resources || {};
      state.unlocks.buildings = state.unlocks.buildings || {};
      state.unlocks.resources.krystal = true;
      state.unlocks.buildings.datovyArtefakt = true;
      state.unlocks.buildings.energetickeJadro = true;
    } catch {}
    super.onBuilt?.();
  }

  setProductionMode(mode = 'low'){ this._prodMode = (mode === 'high') ? 'high' : 'low'; }
  ratePerHour(level = this.level){ return this._ratePerHour(level); }
  upgradeTime(level = this.level){ return this._upgradeTime(level); }
}
