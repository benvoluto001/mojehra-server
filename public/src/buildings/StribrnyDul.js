// src/buildings/StribrnyDul.js
import { BaseBuilding } from './BaseBuilding.js';
import { state } from '../state.js';

/**
 * Stříbrný důl – produkce a odemykání:
 *  - Unlock: výzkum "Pokročilé nástroje" lvl1 + Kamenolom lvl4 + Železný důl lvl4
 *  - BaseProd (lvl1) = 5 / hod
 *  - Lvl 1–5:   +18 % / lvl  => ×1.18
 *  - Lvl 6–10:  +10 % / lvl  => ×1.10
 *  - 11+:       pokračuje +10 % / lvl (pokud se hráč dostane výš)
 *  - BaseTime (upgrade) = 2 min = 120 s na každý krok (konstantní)
 *
 * Cíl: ~50–60 min hraní → hráč poprvé odemkne a postaví Stříbrný důl.
 */
export class StribrnyDul extends BaseBuilding {
  constructor(){
    const BASE_PROD_PER_HOUR = 5;    // lvl1 = 5/h
    const BASE_UPG_TIME_SEC  = 120;  // 2 min na každý upgrade (konstantně)

    // Výpočet produkce/hod podle levelu
    const prodPerHour = (lvl) => {
      const L = Math.max(1, Number(lvl) || 1);
      if (L === 1) return BASE_PROD_PER_HOUR;

      let rate = BASE_PROD_PER_HOUR;
      for (let i = 2; i <= L; i++){
        if (i <= 5)       rate *= 1.18; // 1–5: +18 % / lvl
        else              rate *= 1.10; // 6+:  +10 % / lvl (platí i pro 11+)
      }
      return rate;
    };

    // Čas upgradu z aktuálního levelu N na N+1 (konstantních 120 s)
    const upgradeTime = (_lvl) => BASE_UPG_TIME_SEC;

    super({
      id: 'stribrnydul',
      name: 'Stříbrný důl',
      output: 'stříbro',
      


      // zobrazení pro lvl1; reálnou produkci počítá prodPerHour
      baseRate: BASE_PROD_PER_HOUR,

      // výchozí stav
      level: 1,
      isBuilt: false,

      // prvotní stavba – placeholder hodnoty (lze později doladit ekonomií hry)
      buildTime: 10,
      buildCost: { dřevo: 120, kámen: 220, železo: 80 },

      // upgrade cost – jednoduché, ať lze testovat
      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 150, kámen: 300, železo: 120 },
      upgradeCostLinearInc: 15,
      upgradeCostFactor: 1.35,

      // pro UI/tooltip – informativní (vlastní logika odemykání je níž v canStartBuild)
      requirements: {
        kamenolom: 4,
        zeleznydul: 4,
      },
      researchRequirements: {
        VPokrocileNastroje: 2,
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

  // Ověření odemykacích podmínek: výzkum + levely ostatních budov
  canStartBuild(buildings = {}){
    const researchLvl =
      state?.research?.VPokrocileNastroje?.level ??
      state?.research?.VPokrocileNastroje?.level ?? 0;

    // zjisti levely budov z argumentu, případně ze state
    const kamLvl =
      buildings?.kamenolom?.level ??
      state?.buildings?.kamenolom?.level ?? 0;

    const zelLvl =
      buildings?.zeleznydul?.level ??
      state?.buildings?.zeleznydul?.level ?? 0;

    if (researchLvl < 1) return false; // požadavek: Pokročilé nástroje lvl1
    if (kamLvl < 4 || zelLvl < 4) return false; // Kamenolom4 + Železný důl4

    return super.canStartBuild(buildings);
  }

  ratePerHour(level = this.level){
    return this._prodPerHour(level);
  }

  upgradeTime(level = this.level){
    return this._upgradeTime(level);
  }
}
