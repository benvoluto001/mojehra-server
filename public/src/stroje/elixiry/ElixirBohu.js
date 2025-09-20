// src/stroje/elixiry/ElixirBohu.js
import { BaseStroj } from '../BaseStroj.js';
import { state } from '../../state.js';
import { addTimedBuff } from '../../effects/buffs.js';

export class ElixirBohu extends BaseStroj {
  constructor(){
    super({
      id: 'elixir_bohu',
      name: 'Elixír bohů',
      unitTime: 3,
      unitCost: { 'obilí': 20, 'maso': 20, 'krystal': 1, 'zlato': 30, 'pulzar': 1 },
    });
  }
  useOne(){
    const have = Number(state.machines?.[this.id] || 0);
    if (have <= 0) return false;
    state.machines[this.id] = have - 1;
    // +20 % produkce všech surovin na 4 hodiny
    addTimedBuff({ key: 'prodAll', value: 0.20, durationSec: 4*60*60, label: 'Elixír bohů' });
    return true;
  }
  effectNote(){ return '+20 % produkce všech surovin (4 h).'; }
}
