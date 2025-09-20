// src/stroje/elixiry/ElixirOdvahy.js
import { BaseStroj } from '../BaseStroj.js';
import { state } from '../../state.js';
import { addTimedBuff } from '../../effects/buffs.js';

export class ElixirOdvahy extends BaseStroj {
  constructor(){
    super({
      id: 'elixir_odvahy',
      name: 'Elixír odvahy',
      unitTime: 2,
      unitCost: { 'maso': 10, 'vlakno': 5, 'krystal': 1, 'slitina': 1 },
    });
    this.category = 'elixiry';
  }
  useOne(){
    const have = Number(state.machines?.[this.id] || 0);
    if (have <= 0) return false;
    state.machines[this.id] = have - 1;
    // +2.5 % morálka při obraně města na 2 h
    addTimedBuff({ key: 'defenseMorale', value: 0.025, durationSec: 2*60*60, label: 'Elixír odvahy' });
    return true;
  }
  effectNote(){ return '+2,5 % morálka armády při obraně (2 h).'; }
}
