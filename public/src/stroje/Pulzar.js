// src/stroje/Pulzar.js
import { BaseStroj } from './BaseStroj.js';
import { state } from '../state.js';

export class Pulzar extends BaseStroj {
  constructor(){
    super({
      id: 'pulzar',
      name: 'Pulzar',
      unitTime: 2,
      unitCost: { 'ankarit': 1, 'krystal': 1 },
    });
  }

  // přepiš metodu tick z BaseStroj, abychom přidali energii
  tick(){
    if (this.queue <= 0) return;
    this.remaining = Math.max(0, this.remaining - 1);
    if (this.remaining === 0){
      // dokončen jeden kus → připiš pulzar
      state.machines[this.id] = (state.machines[this.id] || 0) + 1;

      // BONUS: každý pulzar přidá 5 energie
      state.resources.energie = (state.resources.energie || 0) + 5;

      this.queue -= 1;
      this.remaining = this.queue > 0 ? this.unitTime : 0;
    }
  }
}
