// src/buildings/StribrnyDul.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';

// Pomocná funkce: vezme level výzkumu bez ohledu na klíč
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
 * Stříbrný důl – odemyká se, když:
 *  - výzkum „Pokročilé nástroje“ >= 1
 *  - Kamenolom >= 4
 *  - Železný důl >= 4
 */
export class StribrnyDul extends BaseBuilding {
  constructor(){
    const BASE_PROD_PER_HOUR = 5;     // příklad
    const BASE_UPG_TIME_SEC  = 120;   // 2 min

    const prodPerHour = (lvl) => {
      const L = Math.max(1, Number(lvl) || 1);
      if (L === 1) return BASE_PROD_PER_HOUR;
      let rate = BASE_PROD_PER_HOUR;
      for (let i = 2; i <= L; i++){
        if (i <= 5) rate *= 1.18;   // 1–5: +18 % / lvl
        else        rate *= 1.10;   // 6+:  +10 % / lvl
      }
      return rate;
    };

    const upgradeTime = () => BASE_UPG_TIME_SEC;

    super({
      id: 'stribrnydul',
      name: 'Stříbrný důl',
      output: 'stříbro',

      baseRate: BASE_PROD_PER_HOUR,
      level: 1,
      isBuilt: false,

      buildTime: 10,
      buildCost: { dřevo: 120, kámen: 220, železo: 80 },

      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 150, kámen: 300, železo: 120 },
      upgradeCostLinearInc: 15,
      upgradeCostFactor: 1.35,

      // Info pro UI (nebývá rozhodující, finální kontrola je v canStartBuild)
      requirements: { kamenolom: 4, zeleznydul: 4 },
      researchRequirements: { VPokrocileNastroje: 1 },

      getRatePerHour: prodPerHour,
      getUpgradeTime: upgradeTime,
      timeIncrement: 1,
    });

    this._prodPerHour = (lvl)=> (lvl ? prodPerHour(lvl) : prodPerHour(this.level));
    this._upgradeTime = (lvl)=> (lvl ? upgradeTime(lvl) : upgradeTime(this.level));
  }

  // Finální odemykací logika – používá se při renderu i při kliknutí
  canStartBuild(buildings = {}){
    const researchLvl = getPokrocileNastrojeLevel();

    const kamLvl =
      buildings?.kamenolom?.level ??
      state?.buildings?.kamenolom?.level ?? 0;

    const zelLvl =
      buildings?.zeleznydul?.level ??
      state?.buildings?.zeleznydul?.level ?? 0;

    if (researchLvl < 1) return false;
    if (kamLvl < 4 || zelLvl < 4) return false;

    return super.canStartBuild?.(buildings) ?? true;
  }

  ratePerHour(level = this.level){ return this._prodPerHour(level); }
  upgradeTime(level = this.level){ return this._upgradeTime(level); }
}
