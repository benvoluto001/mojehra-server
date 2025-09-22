// src/research/PokrocileNastroje.js
import { BaseResearch } from './BaseResearch.js';

export class PokrocileNastroje extends BaseResearch {
  constructor(){
    super({
      id: 'VPokrocileNastroje',
      name: 'Pokročilé nástroje',
      desc: 'Lepší nástroje a postupy. Zrychluje těžbu kovů.',
    });
  }

  cost(lvl){
    const n = (lvl || 0) + 1;
    return { 'dřevo': 40*n, 'kámen': 25*n, 'železo': 15*n };
  }

  // lehké zvýšení produkce pro kovové doly
  buildingMultiplier(state, b){
    const L = state?.research?.VPokrocileNastroje?.level || 0;
    if (!L) return 1;
    if (b.id === 'zeleznydul' || b.id === 'stribrnydul'){
      return 1 + 0.06*L; // +6 % za level
    }
    return 1;
  }
}
