// src/buildings/FarmaNaObili.js
import { BaseBuilding } from './BaseBuilding.js';

/**
 * Farma na obilí – pravidla:
 *  - BaseProd (lvl1) = 40 obilí / hod
 *  - ProdPerLvl = +10 % / lvl  => ×1.10^(lvl-1)
 *  - BaseTime = 90 s, TimeMult = 1.13  => čas z lvl N na N+1 = 90 * 1.13^(N-1)
 *  - BaseCost (stavba) = dřevo 80, kámen 30
 */
export class FarmaNaObili extends BaseBuilding {
  constructor(){
    const BASE_PROD_PER_HOUR = 40;   // 40/h na lvl1
    const GROWTH_PER_LEVEL   = 1.10;  // +10 % / lvl
    const BASE_UPG_TIME_SEC  = 90;    // 90 s
    const TIME_MULT          = 1.13;  // ×1.13 za každý další lvl

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
      id: 'FarmaNaObili',
      name: 'Farma na obilí',
      output: 'obilí',
      imageKey: 'farmanaobili',


      // pro UI: zobrazení lvl1
      baseRate: BASE_PROD_PER_HOUR,

      // výchozí stav
      level: 1,
      isBuilt: false,

      // stavba
      buildTime: 5,
      buildCost: { dřevo: 80, kámen: 30 },

      // upgrade – čas a jednoduché placeholder náklady (můžeš později doladit)
      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 60, kámen: 25 },
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
