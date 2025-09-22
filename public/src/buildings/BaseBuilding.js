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

      // požadavky
      requirements: {},          // na jiné budovy: { 'pila': 3, 'kamenolom': 2 }
      researchRequirements: {},  // na výzkumy: { 'VPokrocileNastroje': 1 }
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

  // ————————————————————————————————————————————————————————————————
  // Pomocné lookupy: level jiné budovy / level výzkumu
  // ————————————————————————————————————————————————————————————————

  /** Získá level jiné budovy dle ID (funguje s polem, objektem i state.buildings). */
  _getBuildingLevelById(reqId, buildings) {
    // 1) předaný seznam jako pole instancí
    if (Array.isArray(buildings)) {
      const other = buildings.find(b => b?.id === reqId);
      if (other) return Number(other.level || 0);
    }
    // 2) předaný objekt se stavem
    if (buildings && typeof buildings === 'object') {
      const o = buildings[reqId];
      if (o) return Number(o.level || 0);
    }
    // 3) globální state
    const s = state?.buildings?.[reqId];
    if (s) return Number(s.level || 0);
    return 0;
  }

  /** Vrátí level výzkumu dle klíče s několika tolerantními variantami. */
  _getResearchLevelById(reqId) {
    const r = state?.research || {};
    const direct = r?.[reqId]?.level;
    if (direct != null) return Number(direct || 0);

    // zkus CamelCase první písmeno
    const cap = reqId.charAt(0).toUpperCase() + reqId.slice(1);
    const capLvl = r?.[cap]?.level;
    if (capLvl != null) return Number(capLvl || 0);

    // zkus přidat/odebrat prefix 'V'
    const noV = reqId.startsWith('V') ? reqId.slice(1) : reqId;
    const withV = reqId.startsWith('V') ? reqId : ('V' + cap);
    const noVLvl = r?.[noV]?.level ?? r?.[(noV.charAt(0).toUpperCase() + noV.slice(1))]?.level;
    if (noVLvl != null) return Number(noVLvl || 0);
    const withVLvl = r?.[withV]?.level;
    if (withVLvl != null) return Number(withVLvl || 0);

    return 0;
  }

  // ————————————————————————————————————————————————————————————————
  // Požadavky: budovy + výzkumy
  // ————————————————————————————————————————————————————————————————

  /** Splněny požadavky na jiné budovy? */
  meetsRequirements(buildings = []) {
    if (!this.requirements || Object.keys(this.requirements).length === 0) return true;
    return Object.entries(this.requirements).every(([reqId, reqLvl]) => {
      const lvl = this._getBuildingLevelById(reqId, buildings);
      // musí být postaveno (level > 0) a >= požadovanému levelu
      return lvl >= Number(reqLvl || 0);
    });
  }

  /** Splněny požadavky na výzkumy? */
  meetsResearchRequirements() {
    if (!this.researchRequirements || Object.keys(this.researchRequirements).length === 0) return true;
    return Object.entries(this.researchRequirements).every(([reqId, reqLvl]) => {
      const lvl = this._getResearchLevelById(reqId);
      return lvl >= Number(reqLvl || 0);
    });
  }

  /** Může začít stavba? */
  canStartBuild(buildings = []) {
  if (this.isBuilt) return false;
  if (this.isBusy()) return false;
  if (!this.meetsRequirements(buildings)) return false;       // budovy
  if (!this.meetsResearchRequirements()) return false;        // VÝZKUMY  ← DŮLEŽITÉ
  return canPay(this.buildCost || {});
}

meetsRequirements(buildings = []) {
  if (!this.requirements || Object.keys(this.requirements).length === 0) return true;
  const getLvl = (id) => {
    if (Array.isArray(buildings)) {
      const b = buildings.find(x => x?.id === id); if (b) return Number(b.level||0);
    }
    if (buildings && typeof buildings === 'object' && buildings[id]) {
      return Number(buildings[id].level || 0);
    }
    const s = state?.buildings?.[id]; return Number(s?.level || 0);
  };
  return Object.entries(this.requirements).every(([id, need]) => getLvl(id) >= Number(need||0));
}

meetsResearchRequirements() {
  if (!this.researchRequirements || Object.keys(this.researchRequirements).length === 0) return true;
  const r = state?.research || {};
  const getRes = (id) => (
    r?.[id]?.level ??
    r?.[(id.charAt(0).toUpperCase()+id.slice(1))]?.level ??
    (id.startsWith('V') ? r?.[id.slice(1)]?.level : r?.['V'+(id.charAt(0).toUpperCase()+id.slice(1))]?.level) ??
    0
  );
  return Object.entries(this.researchRequirements).every(([id, need]) => Number(getRes(id)||0) >= Number(need||0));
}

  /** Spusť stavbu (zaplatí cenu a nastaví čas stavby) */
  startBuild(buildings = []) {
    if (!this.canStartBuild(buildings)) return false;
    pay(this.buildCost || {});

    this.action = 'build';

    // efekty (např. elixír zrychlení stavby): state.effects.buildTime (záporné = rychlejší)
    const mul = Math.max(0.05, 1 + Number(state?.effects?.buildTime || 0));
    this.remaining = Math.max(0, Math.ceil(this.buildTime * mul));

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
    // pokud bys chtěl vyžadovat výzkum i pro upgrade, odkomentuj další řádek:
    // if (!this.meetsResearchRequirements()) return false;
    return canPay(this.getUpgradeCost());
  }

  startUpgrade() {
    if (!this.canStartUpgrade()) return false;
    pay(this.getUpgradeCost());

    this.action = 'upgrade';

    // Pokud budova poskytla funkci getUpgradeTime(level), použij ji.
    // Jinak zachovej původní chování s this.upgradeTime.
    const baseTime =
      (typeof this.getUpgradeTime === 'function')
        ? Number(this.getUpgradeTime(this.level) || 0)
        : Number(this.upgradeTime || 0);

    const mul = Math.max(0.05, 1 + Number(state?.effects?.buildTime || 0)); // záporné = rychlejší
    this.remaining = Math.max(0, Math.ceil(baseTime * mul));

    return true;
  }

  /**
   * TICK (1× za sekundu):
   * - pokud běží akce, odečítá čas a na konci dokončí build/upgrade
   * - pokud budova produkuje, přičte produkci (během upgradu taky – na aktuálním levelu)
   */
  tick() {
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

          // Pokud nepoužíváme funkční výpočet času (getUpgradeTime),
          // zachovej původní lineární navyšování upgradeTime.
          if (typeof this.getUpgradeTime !== 'function') {
            this.upgradeTime += (this.timeIncrement | 0);
          }

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
