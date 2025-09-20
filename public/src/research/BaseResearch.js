// src/research/BaseResearch.js
export class BaseResearch {
  constructor({ id, name, desc }) {
    this.id = id;
    this.name = name;
    this.desc = desc;
  }
  // cena dalšího levelu – přepiš v potomkovi
  cost(/* lvl */){ return {}; }

  // multiplikátor rychlosti těžby pro budovy – přepiš dle potřeby
  buildingMultiplier(/* state, building */){ return 1; }

  // aplikace trvalých efektů (např. změna max HP) – přepiš dle potřeby
  applyEffects(/* state */){}
}
