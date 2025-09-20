// src/research/ArtefaktovaPisma.js
import { BaseResearch } from './BaseResearch.js';

export class ArtefaktovaPisma extends BaseResearch {
  constructor(){
    super({
      id: 'VArtefakty',
      name: 'Artefaktová písma',
      desc: 'Odemkne možnost stavět Datové artefakty (od úrovně 5).',
    });
  }

  // cena za další level (klidně si uprav)
  cost(lvl){
    const n = lvl + 1;
    return { 'dřevo': 120*n, 'dřevo': 60*n };
  }

  // žádný přímý multiplikátor produkce – jen odemyká budovu na lvl 5
  // applyEffects zde nepotřebujeme; odemčení pohlídá budova v canStartBuild()
}
