// src/research/Krystalografie.js
import { BaseResearch } from './BaseResearch.js';

export class Krystalografie extends BaseResearch {
  constructor(){
    super({
      id: 'VKrystalografie',
      name: 'Krystalografie',
      desc: 'Znalost krystalových struktur. Odemkne výrobu Ankaritu (od úrovně 2).',
    });
  }

  cost(lvl){
    const n = (lvl || 0) + 1;
    return { 'krystal': 10*n, 'zlato': 5*n };
  }
}
