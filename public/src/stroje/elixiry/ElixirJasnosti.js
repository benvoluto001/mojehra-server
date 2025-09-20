// src/stroje/elixiry/ElixirJasnosti.js
import { BaseStroj } from '../BaseStroj.js';
import { state } from '../../state.js';
import { addTimedBuff } from '../../effects/buffs.js';

export class ElixirJasnosti extends BaseStroj {
  constructor(){
    super({
      id: 'elixir_jasnosti',
      name: 'Elixír jasnosti',
      unitTime: 2,
      unitCost: { 'obilí': 10, 'maso': 10, 'krystal': 1 },
    });
  }
  useOne(){
    const have = Number(state.machines?.[this.id] || 0);
    if (have <= 0) return false;
    state.machines[this.id] = have - 1;
    // −50 % doby výzkumu
    addTimedBuff({ key: 'researchTime', value: -0.50, durationSec: 2*60*60, label: 'Elixír jasnosti' });
    return true;
  }
  effectNote(){ return '−50 % doby výzkumu na 2 hodiny.'; }
}
