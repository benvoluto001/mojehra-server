// src/buildings/FarmaNaMaso.js
import { BaseBuilding } from './BaseBuilding.js';

/**
 * Farma na maso – pravidla:
 *  - BaseProd (lvl1) = 30 masa / hod
 *  - ProdPerLvl = +10 % / lvl  => ×1.10^(lvl-1)
 *  - BaseTime = 100 s, TimeMult = 1.13  => čas z lvl N na N+1 = 100 * 1.13^(N-1)
 *  - BaseCost (stavba) = dřevo 90, kámen 35
 */
export class FarmaNaMaso extends BaseBuilding {
  constructor(){
    const BASE_PROD_PER_HOUR = 30;   // 30/h na lvl1
    const GROWTH_PER_LEVEL   = 1.10; // +10 % / lvl
    const BASE_UPG_TIME_SEC  = 100;  // 100 s
    const TIME_MULT          = 1.13; // ×1.13 za každý další lvl

    // Produkce/hod podle levelu (geometrická řada)
    const prodPerHour = (lvl) => {
      const L = Math.max(1, Number(lvl) || 1);
      return BASE_PROD_PER_HOUR * Math.pow(GROWTH_PER_LEVEL, L - 1);
    };

    // Čas upgradu z aktuálního levelu N na N+1
    const upgradeTime = (lvl) => {
      const L = Math.max(1, Number(lvl) || 1);
      return BASE_UPG_TIME_SEC * Math.pow(TIME_MULT, L - 1);
    };

    super({
      id: 'FarmaNaMaso',
      name: 'Farma na maso',
      output: 'maso',
      imageKey: 'farmanamaso',


      // pro UI: zobrazení lvl1
      baseRate: BASE_PROD_PER_HOUR,

      // výchozí stav
      level: 1,
      isBuilt: false,

      // stavba
      buildTime: 5,
      buildCost: { dřevo: 90, kámen: 35 },

      // upgrade – čas a jednoduché placeholder náklady (doladíme dle ekonomiky)
      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 70, kámen: 30 },
      upgradeCostLinearInc: 12,
      upgradeCostFactor: 1.25,

      // výpočetní funkce
      getRatePerHour: prodPerHour,
      getUpgradeTime: upgradeTime,

      // simulace ticku (sekundy)
      timeIncrement: 1,
    });

    // Pro případ, že BaseBuilding volá instance metody
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
