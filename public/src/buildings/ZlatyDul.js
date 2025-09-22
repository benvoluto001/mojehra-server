// src/buildings/ZlatyDul.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';

function getPokrocileNastrojeLevel() {
  const r = state?.research || {};
  return (
    r?.VPokrocileNastroje?.level ??
    r?.pokrocileNastroje?.level ??
    r?.PokrocileNastroje?.level ??
    0
  );
}

/**
 * Zlatý důl – odemyká se, když:
 *  - výzkum „Pokročilé nástroje“ >= 2
 *  - Stříbrný důl >= 3
 */
export class ZlatyDul extends BaseBuilding {
  constructor(){
    const BASE_PROD_PER_HOUR = 1;
    const BASE_UPG_TIME_SEC  = 300;

    const prodPerHour = (lvl) => {
      const L = Math.max(1, Number(lvl) || 1);
      if (L === 1) return BASE_PROD_PER_HOUR;
      let rate = BASE_PROD_PER_HOUR;
      for (let i = 2; i <= L; i++){
        if (i <= 5)       rate *= 1.15;
        else              rate *= 1.08;
      }
      return rate;
    };
    const upgradeTime = () => BASE_UPG_TIME_SEC;

    super({
      id: 'zlatydul',
      name: 'Zlatý důl',
      output: 'zlato',

      baseRate: BASE_PROD_PER_HOUR,
      level: 1,
      isBuilt: false,

      buildTime: 15,
      buildCost: { dřevo: 180, kámen: 320, železo: 140, stříbro: 20 },

      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 220, kámen: 380, železo: 180, stříbro: 40 },
      upgradeCostLinearInc: 20,
      upgradeCostFactor: 1.35,

      requirements: { stribrnydul: 3 },
      researchRequirements: { VPokrocileNastroje: 2 },

      getRatePerHour: prodPerHour,
      getUpgradeTime: upgradeTime,
      timeIncrement: 1,
    });

    this._prodPerHour = (lvl)=> (lvl ? prodPerHour(lvl) : prodPerHour(this.level));
    this._upgradeTime = (lvl)=> (lvl ? upgradeTime(lvl) : upgradeTime(this.level));
  }

  canStartBuild(buildings = {}){
    const researchLvl = getPokrocileNastrojeLevel();

    const stribroLvl =
      buildings?.stribrnydul?.level ??
      state?.buildings?.stribrnydul?.level ?? 0;

    if (researchLvl < 2) return false;
    if (stribroLvl < 3)  return false;

    return super.canStartBuild?.(buildings) ?? true;
  }

  ratePerHour(level = this.level){ return this._prodPerHour(level); }
  upgradeTime(level = this.level){ return this._upgradeTime(level); }
}
