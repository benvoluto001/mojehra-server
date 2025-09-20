// src/stroje/elixiry/ElixirSily.js
import { BaseStroj } from '../BaseStroj.js';
import { state } from '../../state.js';
import { addTimedBuff } from '../../effects/buffs.js';

export class ElixirSily extends BaseStroj {
  constructor(){
    super({
      id: 'elixir_sily',
      name: 'Elixír síly',
      unitTime: 2,
      unitCost: { 'maso': 10, 'krystal': 1 },
    });
  }
  useOne(){
    const have = Number(state.machines?.[this.id] || 0);
    if (have <= 0) return false;
    state.machines[this.id] = have - 1;
    addTimedBuff({ key: 'defenseAtk', value: 0.02, durationSec: 2*60*60, label: 'Elixír síly' });
    return true;
  }
  effectNote(){ return '+2 % k útoku obrany města na 2 hodiny.'; }
}
