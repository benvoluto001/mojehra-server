// src/stroje/elixiry/KrvavyElixir.js
import { BaseStroj } from '../BaseStroj.js';
import { state } from '../../state.js';
import { addTimedBuff } from '../../effects/buffs.js';

export class KrvavyElixir extends BaseStroj {
  constructor(){
    super({
      id: 'krvavy_elixir',
      name: 'Krvavý elixír',
      unitTime: 2,
      unitCost: { 'maso': 10, 'pulzar': 1, 'krystal': 1 },
    });
  }
  useOne(){
    const have = Number(state.machines?.[this.id] || 0);
    if (have <= 0) return false;
    state.machines[this.id] = have - 1;
    // buff pro hrdinu v duelech: +10 % útok i HP (připraveno)
    addTimedBuff({ key: 'heroAtk', value: 0.10, durationSec: 2*60*60, label: 'Krvavý elixír' });
    addTimedBuff({ key: 'heroHP',  value: 0.10, durationSec: 2*60*60, label: 'Krvavý elixír' });
    return true;
  }
  effectNote(){ return 'Hrdina: +10 % útok & +10 % HP v duelech (2 h).'; }
}
