// src/buildings/Pila.js
import { BaseBuilding } from './BaseBuilding.js';

/**
 * Pila – produkce dřeva podle zadaných pravidel:
 *  - BaseProd (lvl1) = 100 / hod
 *  - Lvl 1–5:   +25 % / lvl  => multiplikátor 1.25
 *  - Lvl 6–10:  +12 % / lvl  => multiplikátor 1.12
 *  - Lvl 11+:   +7  % / lvl  => multiplikátor 1.07
 *
 * Časy upgradu:
 *  - BaseTime = 20 s (čas z lvl N na N+1)
 *  - TimeMult = 1.25 (násobí se pro každý další level)
 *
 * Kód funguje i když BaseBuilding umí číst jen "config" – předáme mu funkce
 * `getRatePerHour(level)` a `getUpgradeTime(level)`; pokud BaseBuilding volá metody
 * na instanci, máme připravené i `ratePerHour(level)` a `upgradeTime(level)`.
 */
export class Pila extends BaseBuilding {
  constructor(){
    // Konstanty pro výpočty (přímo z tvého zadání)
    const BASE_PROD_PER_HOUR = 550; // lvl1
    const BASE_UPG_TIME_SEC  = 20;  // 20 s
    const TIME_MULT          = 1.25;

    // Pomocné výpočtové funkce (nezávislé na BaseBuilding)
    const prodPerHour = (lvl) => {
      if (lvl <= 1) return BASE_PROD_PER_HOUR;

      let rate = BASE_PROD_PER_HOUR;
      for (let i = 2; i <= lvl; i++){
        if (i <= 5)       rate *= 1.45; // 1–5
        else if (i <= 10) rate *= 1.20; // 6–10
        else              rate *= 1.12; // 11+
      }
      return rate;
    };

    const upgradeTime = (lvl) => {
      // čas z lvl N na N+1 (pro aktuální level `lvl`)
      // lvl1 → lvl2 = 20 s, lvl2 → lvl3 = 20 * 1.25 s, atd.
      // pokud někde používáš čas z pohledu "nového" levelu, dej Math.pow(TIME_MULT, lvl-1)
      return BASE_UPG_TIME_SEC * Math.pow(TIME_MULT, Math.max(0, lvl - 1));
    };

    super({
      id: 'pila',
      name: 'Pila',
      output: 'dřevo',
      imageKey: 'pila',

      // Tyto základní hodnoty necháváme minimální – reálnou produkci vrací funkce níže.
      baseRate: BASE_PROD_PER_HOUR, // pro zobrazení lvl1, pokud BaseBuilding něco čte

      level: 1,
      isBuilt: false,

      // Náklady/časy stavby – můžeš si upravit, nejsou součástí pravidel které jsi poslal
      buildTime: 5,                 // první postavení (s)
      buildCost: { dřevo: 20 },

      // Upgrade cost – ponechávám jednoduché, ať teď neřešíme ekonomiku
      upgradeTime: BASE_UPG_TIME_SEC,
      upgradeCostBase: { dřevo: 30 },
      upgradeCostLinearInc: 15,
      upgradeCostFactor: 1.25,

      // Předáváme do BaseBuilding funkce pro výpočet (pokud je BaseBuilding umí použít)
      getRatePerHour: prodPerHour,
      getUpgradeTime: upgradeTime,

      // Pro jistotu – pokud BaseBuilding volá metody na instanci, máme je níže.
      // (viz níž v této třídě)
    });

    // Uložíme si funkce i na instanci, kdyby je BaseBuilding volal přes this.*
    this._prodPerHour = (lvl)=> (lvl ? prodPerHour(lvl) : prodPerHour(this.level));
    this._upgradeTime = (lvl)=> (lvl ? upgradeTime(lvl) : upgradeTime(this.level));
  }

  /**
   * Pokud BaseBuilding volá metody na instanci, obsloužíme je tady.
   * (Neškodí to – když je BaseBuilding nepotřebuje, prostě je ignoruje.)
   */
  ratePerHour(level = this.level){
    return this._prodPerHour(level);
  }

  upgradeTime(level = this.level){
    return this._upgradeTime(level);
  }
}
