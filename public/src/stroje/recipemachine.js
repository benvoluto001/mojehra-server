// src/stroje/RecipeMachine.js
import { BaseStroj } from './BaseStroj.js';

/** Obecný „výrobní stroj“ pro recepty (výstup = počítadlo v state.machines) */
export class RecipeMachine extends BaseStroj {
  /**
   * @param {Object} cfg
   * @param {string} cfg.id         klíč v state.machines (bez diakritiky)
   * @param {string} cfg.name       název receptu v UI
   * @param {number} cfg.unitTime   čas 1 ks (s)
   * @param {Object} cfg.unitCost   vstupy na 1 ks (suroviny NEBO jiné „machines“)
   * @param {string} [cfg.category] kategorie ve Výrobě (např. 'jidlo', 'energie')
   */
  constructor({ id, name, unitTime = 2, unitCost = {}, category = 'jidlo' }){
    super({ id, name, unitTime, unitCost });
    this.category = category;
  }
}
