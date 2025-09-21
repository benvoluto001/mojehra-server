// src/buildings/Kamenolom.js
import { BaseBuilding } from './BaseBuilding.js';

/**
 * Kamenolom – produkce kamene podle zadaných pravidel:
 *  - BaseProd (lvl1) = 80 / hod
 *  - Lvl 1–5:   +22 % / lvl  => multiplikátor 1.22
 *  - Lvl 6–10:  +12 % / lvl  => multiplikátor 1.12
 *  - Lvl 11+:   +7  % / lvl  => multiplikátor 1.07
 *
 * Časy upgradu:
 *  - BaseTime = 25 s (čas z lvl N na N+1). Protože jsi neuvedl násobič, nechávám KONSTANTNÍ 25 s pro každý krok.
 */
export class Kamenolom extends BaseBuilding {
  constructor(){
    const BASE_PROD_PER_HOUR = 300; // lvl1 = 80/h
    const BASE_UPG_TIME_SEC  = 25; // 25 s na upgrade (konstantně)

    // Výpočet produkce/hod podle levelu
    const prodPerHour = (lvl) => {
      if (lvl <= 1) return BASE_PROD_PER_HOUR;

      let rate = BASE_PROD_PER_HOUR;
      for (let i = 2; i <= lvl; i++){
        if (i <= 5)       rate *= 1.22; // 1–5: +22 % za level
        else if (i <= 10) rate *= 1.12; // 6–10: +12 % za level
        else              rate *= 1.07; // 11+: +7 % za level
      }
      return rate;
    };

    // Čas upgradu z aktuálního levelu N na N+1 (konstantních 25 s)
    const upgradeTime = (_lvl) => BASE_UPG_TIME_SEC;

    super({
      id: 'kamenolom',
      name: 'Kamenolom',
      output: 'kámen',

      // základní zobrazení pro lvl1
      baseRate: BASE_PROD_PER_HOUR,

      // výchozí stav
      level: 1,
      isBuilt: false,

      // čas/náklady prvotní stavby – volné k pozdější úpravě
      buildTime: 5,
      buildCost: { dřevo: 50 },

      // upgrade cost – placeholder, aby šla budova hned testovat
      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 40, kámen: 10 },
      upgradeCostLinearInc: 10,
      upgradeCostFactor: 1.25,

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
