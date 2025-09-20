// src/research/SyntezaMimozemskeSlitiny.js
import { BaseResearch } from './BaseResearch.js';

export class SyntezaMimozemskeSlitiny extends BaseResearch {
  constructor() {
    super({
      id: 'VSyntezaSlitiny',
      name: 'Syntéza mimozemské slitiny',
      desc: 'Zvyšuje produkci slitiny (škálování dle úrovně). Na 5. úrovni odemyká budovu Mimozemská slitina.',
      baseTime: 10,     // 10 s na úroveň
      timeFactor: 1.5,  // každá další úroveň je o 50 % delší
    });
  }

  // cena za další úroveň (můžeš si snadno upravit)
  cost(lvl) {
    const n = (lvl || 0) + 1;
    const base = 1500;
    const price = Math.round(base * Math.pow(1.6, n - 1));
    return { 'zlato': price };
  }

  // multiplikátor produkce pro budovu MimozemskaSlitina
  // Lv 1–4: +6 % / lvl, Lv 5–10: +3 % / lvl, Lv 11+: +2 % / lvl
  buildingMultiplier(state, building) {
    if (!building || building.id !== 'MimozemskaSlitina') return 1;
    const lv = this.level(state);
    let add = 0;
    for (let i = 1; i <= lv; i++) {
      if (i <= 4) add += 0.06;
      else if (i <= 10) add += 0.03;
      else add += 0.02;
    }
    return 1 + add;
  }
}
