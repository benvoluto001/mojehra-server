// src/buildings/ZeleznyDul.js
import { BaseBuilding } from './BaseBuilding.js';

/**
 * Železný důl – produkce železa podle zadaných pravidel:
 *  - BaseProd (lvl1) = 30 / hod
 *  - Lvl 1–5:   +20 % / lvl  => ×1.20
 *  - Lvl 6–10:  +12 % / lvl  => ×1.12
 *  - Lvl 11+:   +8  % / lvl  => ×1.08
 *
 * Časy upgradu:
 *  - BaseTime = 40 s (z lvl N na N+1, konstantní pro každý krok)
 *
 * Požadavky na stavbu:
 *  - Pila lvl2 a Kamenolom lvl2
 */
export class ZeleznyDul extends BaseBuilding {
  constructor(){
    const BASE_PROD_PER_HOUR = 30; // lvl1 = 30/h
    const BASE_UPG_TIME_SEC  = 40; // 40 s na každý upgrade (konstantně)

    // Výpočet produkce/hod podle levelu
    const prodPerHour = (lvl) => {
      const L = Math.max(1, Number(lvl) || 1);
      if (L === 1) return BASE_PROD_PER_HOUR;

      let rate = BASE_PROD_PER_HOUR;
      for (let i = 2; i <= L; i++){
        if (i <= 5)       rate *= 1.20; // 1–5: +20 % za level
        else if (i <= 10) rate *= 1.12; // 6–10: +12 % za level
        else              rate *= 1.08; // 11+: +8 % za level
      }
      return rate;
    };

    // Čas upgradu z aktuálního levelu N na N+1 (konstantních 40 s)
    const upgradeTime = (_lvl) => BASE_UPG_TIME_SEC;

    super({
      id: 'zeleznydul',
      name: 'Železný důl',
      output: 'železo',

      // pro zobrazení lvl1; reálnou produkci vrací prodPerHour
      baseRate: BASE_PROD_PER_HOUR,

      // výchozí stav
      level: 1,
      isBuilt: false,

      // čas/náklady prvotní stavby – volné k pozdější úpravě
      buildTime: 5,
      buildCost: { dřevo: 70, kámen: 30 },

      // upgrade cost – placeholder, ať lze testovat
      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 60, kámen: 40, železo: 15 },
      upgradeCostLinearInc: 10,
      upgradeCostFactor: 1.3,

      // požadavky na odemknutí budovy
      requirements: {
        pila: 2,
        kamenolom: 2,
      },

      // poskytneme výpočetní funkce
      getRatePerHour: prodPerHour,
      getUpgradeTime: upgradeTime,

      // tick (sekundy) – pokud hra přičítá 1×/s
      timeIncrement: 1,
    });

    // pro případ, že BaseBuilding volá instance metody
    this._prodPerHour = (lvl)=> (lvl ? prodPerHour(lvl) : prodPerHour(this.level));
    this._upgradeTime = (lvl)=> (lvl ? upgradeTime(lvl) : upgradeTime(this.level));
  }

  ratePerHour(level = this.level){
    return this._prodPerHour(level);
  }

  upgradeTime(level = this.level){
    return this._upgradeTime(level);
  }
}
