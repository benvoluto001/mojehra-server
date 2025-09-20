// src/research/ZpracovaniKamene.js
import { BaseResearch } from './BaseResearch.js';

export class ZpracovaniKamene extends BaseResearch {
  constructor(){
    super({
      id: 'VKamen',
      name: ' Zpracování kamene',
      desc: 'Zvyšuje produkci Kamenolomu o +2 % za každý level.',
    });
  }

  // cena: základ 200 dřevo + 200 kámen, každý další level dvojnásobek
  cost(lvl){
    const n = (lvl ?? 0) + 1;           // kupovaný level
    const base = 240;
    const factor = 2 ** (n - 1);        // ×2 každý level
    const costWood = 240 + 240 * (n - 1);
const costStone = 240 + 240 * (n - 1);
return { 'dřevo': costWood, 'kámen': costStone };

    return { 'dřevo': base * factor, 'kámen': base * factor };
  }

  // bonus: +2 % produkce za každý level (multiplikátor pro Kamenolom)
  buildingMultiplier(state, building){
    const lvl = state?.research?.VKamen?.level || 0;
    if (building.id === 'kamenolom'){
      return 1 + 0.02 * lvl;
    }
    return 1;
  }
}
