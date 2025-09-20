// src/buildings/BaseBuilding.js
import { addResource, canPay, pay, getBuildingRate, addCapacity, state } from '../state.js';


const CAP_GAIN_PER_STEP = 30; // kolik přidáme kapacity při postavení / upgradu

/**
 * Základní třída pro všechny budovy.
 * Konkrétní budovy (Pila, Kamenolom, …) dědí z této třídy
 * a pouze předají konfiguraci do super({...}).
 */
export class BaseBuilding {
  constructor(opts = {}) {
    const defaults = {
      id: '',                 // unikátní ID (např. 'pila')
      name: '',               // název pro UI
      output: null,           // klíč suroviny (např. 'dřevo'), nebo null (Sklad)
      baseRate: 1,            // základní rychlost (na 1. úrovni dává 1*baseRate / tick)

      level: 1,               // aktuální úroveň
      isBuilt: false,         // už stojí?

      // stavba
      buildTime: 1,           // s
      buildCost: {},          // { 'dřevo': 20, 'kámen': 10 }

      // upgrade
      upgradeTime: 1,         // 
      timeIncrement: 1,       // o kolik se prodlouží upgradeTime po každém upgradu
      upgradeCostBase: {},    // základ pro výpočet ceny upgradu (objekt jako buildCost)
      upgradeCostLinearInc: 0,// lineární přírůstek ceny za level (násobí se pro každou položku)
      upgradeCostFactor: 1.0, // multiplikátor ceny^level (jemná exponenciála)

      // požadavky na jiné budovy: { 'pila': 3, 'kamenolom': 2 }
      requirements: {},
    };

    Object.assign(this, defaults, opts);

    // runtime stav
    this.action = null;     // 'build' | 'upgrade' | null
    this.remaining = 0;     // kolik sekund zbývá do dokončení akce
  }

  // Pomocná vlastnost pro UI, ať máš stále dostupné "rate" (už s výzkumy).
  get rate() {
    return getBuildingRate(this);
  }

  isBusy() {
    return !!this.action && this.remaining > 0;
  }

  /** Splněny požadavky na jiné budovy? */
  meetsRequirements(buildings = []) {
    if (!this.requirements || Object.keys(this.requirements).length === 0) return true;
    return Object.entries(this.requirements).every(([reqId, reqLvl]) => {
      const other = buildings.find(b => b.id === reqId);
      return other && other.level >= reqLvl && other.isBuilt;
    });
  }

  /** Může začít stavba? */
  canStartBuild(buildings = []) {
    if (this.isBuilt) return false;
    if (this.isBusy()) return false;
    if (!this.meetsRequirements(buildings)) return false;
    return canPay(this.buildCost || {});
  }

  /** Spusť stavbu (zaplatí cenu a nastaví čas stavby) */
  startBuild(buildings = []) {
    if (!this.canStartBuild(buildings)) return false;
    pay(this.buildCost || {});
  
    this.action = 'build';
{
  const mul = Math.max(0.05, 1 + Number(state?.effects?.buildTime || 0)); // záporné = rychlejší
  this.remaining = Math.max(0, Math.ceil(this.buildTime * mul));
}

    return true;
  }

  /** Cena upgradu pro aktuální level */
  getUpgradeCost() {
    // vzorec: (base + linear*levelIndex) * factor^levelIndex
    // kde levelIndex = (level - 1)
    const idx = Math.max(0, (this.level | 0) - 1);
    const out = {};
    const base = this.upgradeCostBase || {};
    const factor = Number(this.upgradeCostFactor || 1);
    const lin = Number(this.upgradeCostLinearInc || 0);
    for (const [k, v] of Object.entries(base)) {
      const linearPart = v + lin * idx;
      const scaled = linearPart * Math.pow(factor, idx);
      out[k] = Math.round(scaled);
    }
    return out;
  }

  /** Může začít upgrade? */
  canStartUpgrade() {
    if (!this.isBuilt) return false;
    if (this.isBusy()) return false;
    return canPay(this.getUpgradeCost());
  }

  /** Spusť upgrade (zaplatí cenu a nastaví čas upgradu) */
  startUpgrade() {
    if (!this.canStartUpgrade()) return false;
    pay(this.getUpgradeCost());
    
    this.action = 'upgrade';
{
  const mul = Math.max(0.05, 1 + Number(state?.effects?.buildTime || 0));
  this.remaining = Math.max(0, Math.ceil(this.upgradeTime * mul));
}

    return true;
  }

  /**
   * TICK (1× za sekundu):
   * - pokud běží akce, odečítá čas a na konci dokončí build/upgrade
   * - pokud budova produkuje, přičte produkci (během upgradu taky – na aktuálním levelu)
   */
  
// kolik kapacity přidat po dokončení stavby/upgrade


tick(){
  // probíhající akce
  if (this.isBusy()) {
    this.remaining = Math.max(0, this.remaining - 1);
    if (this.remaining === 0) {
      if (this.action === 'build') {
        this.isBuilt = true;
        // po dokončení stavby přidej kapacitu pro danou surovinu
        if (this.output) addCapacity({ [this.output]: CAP_GAIN_PER_STEP });
      } else if (this.action === 'upgrade') {
        this.level++;
        // další upgrade bude trvat o trochu déle
        this.upgradeTime += (this.timeIncrement | 0);
        // po dokončení upgradu přidej kapacitu pro danou surovinu
        if (this.output) addCapacity({ [this.output]: CAP_GAIN_PER_STEP });
      }
      this.action = null;
    }
  }

  // produkce…
  const producesNow = this.isBuilt && (!this.isBusy() || this.action === 'upgrade');
  if (producesNow && this.output) {
    addResource(this.output, getBuildingRate(this));
  }
}

}
