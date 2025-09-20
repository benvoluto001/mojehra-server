// src/stroje/elixiry/ElixirHvezd.js
import { BaseStroj } from '../BaseStroj.js';
import { state } from '../../state.js';
import { addTimedBuff } from '../../effects/buffs.js';

export class ElixirHvezd extends BaseStroj {
  constructor(){
    super({
      id: 'elixir_hvezd',
      name: 'Elixír hvězd',
      unitTime: 2,
      unitCost: { 'obilí': 10, 'maso': 10, 'krystal': 1, 'artefakty': 1 },
    });
    this.category = 'elixiry';
  }
  useOne(){
    const have = Number(state.machines?.[this.id] || 0);
    if (have <= 0) return false;
    state.machines[this.id] = have - 1;
    // +10 % šance na artefakt z expedic na 2 h
    addTimedBuff({ key: 'expArtifact', value: 0.10, durationSec: 2*60*60, label: 'Elixír hvězd' });
    return true;
  }
  effectNote(){ return '+10 % šance na artefakt z expedic (2 h).'; }
}
