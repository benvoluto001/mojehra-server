// src/buildings/ZlatyDul.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';

/**
 * Zlatý důl – pravidla:
 *  - Unlock: výzkum "Pokročilé nástroje" lvl2 + Stříbrný důl lvl3
 *  - BaseProd (lvl1) = 1 / hod
 *  - Lvl 1–5:   +15 % / lvl  => ×1.15
 *  - Lvl 6–10:  +8  % / lvl  => ×1.08
 *  - BaseTime (upgrade) = 5 min = 300 s na každý krok (konstantní)
 */
export class ZlatyDul extends BaseBuilding {
  constructor(){
    const BASE_PROD_PER_HOUR = 1;    // lvl1 = 1/h
    const BASE_UPG_TIME_SEC  = 300;  // 5 min na upgrade (konstantně)

    // Výpočet produkce/hod podle levelu
    const prodPerHour = (lvl) => {
      const L = Math.max(1, Number(lvl) || 1);
      if (L === 1) return BASE_PROD_PER_HOUR;

      let rate = BASE_PROD_PER_HOUR;
      for (let i = 2; i <= L; i++){
        if (i <= 5)       rate *= 1.15; // 1–5: +15 % / lvl
        else if (i <= 10) rate *= 1.08; // 6–10: +8 % / lvl
        else              rate *= 1.08; // 11+: držíme +8 % / lvl (není zadáno jinak)
      }
      return rate;
    };

    // Čas upgradu z aktuálního levelu N na N+1 (konstantních 300 s)
    const upgradeTime = (_lvl) => BASE_UPG_TIME_SEC;

    super({
      id: 'zlatydul',
      name: 'Zlatý důl',
      output: 'zlato',
      imageKey: 'zlatydul',

      // zobrazení pro lvl1; reálnou produkci počítá prodPerHour
      baseRate: BASE_PROD_PER_HOUR,

      // výchozí stav
      level: 1,
      isBuilt: false,

      // prvotní stavba – placeholder hodnoty (doladíme podle ekonomiky hry)
      buildTime: 15,
      buildCost: { dřevo: 180, kámen: 320, železo: 140, stříbro: 20 },

      // upgrade cost – jednoduché pro testování
      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 220, kámen: 380, železo: 180, stříbro: 40 },
      upgradeCostLinearInc: 20,
      upgradeCostFactor: 1.35,

      // požadavky pro UI/tooltip
      requirements: {
        stribrnydul: 3,
      },
      researchRequirements: {
        pokrocileNastroje: 2,
      },

      // výpočetní funkce (pokud je BaseBuilding umí použít)
      getRatePerHour: prodPerHour,
      getUpgradeTime: upgradeTime,

      // tick (sekundy) – pokud hra přičítá 1×/s
      timeIncrement: 1,
    });

    // pro případ, že BaseBuilding volá instance metody
    this._prodPerHour = (lvl)=> (lvl ? prodPerHour(lvl) : prodPerHour(this.level));
    this._upgradeTime = (lvl)=> (lvl ? upgradeTime(lvl) : upgradeTime(this.level));
  }

  // Ověření odemykacích podmínek: výzkum + level Stříbrného dolu
  canStartBuild(buildings = {}){
    const researchLvl =
      state?.research?.pokrocileNastroje?.level ??
      state?.research?.PokrocileNastroje?.level ?? 0;

    const stribroLvl =
      buildings?.stribrnydul?.level ??
      state?.buildings?.stribrnydul?.level ?? 0;

    if (researchLvl < 2) return false; // Pokročilé nástroje lvl2
    if (stribroLvl < 3) return false;  // Stříbrný důl lvl3

    return super.canStartBuild(buildings);
  }

  ratePerHour(level = this.level){
    return this._prodPerHour(level);
  }

  upgradeTime(level = this.level){
    return this._upgradeTime(level);
  }
}
