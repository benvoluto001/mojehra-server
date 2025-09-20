import { BaseResearch } from './BaseResearch.js';

export class ZpracovaniDreva extends BaseResearch {
  constructor(){
    super({
      id: 'VDrevo',
      name: 'Zpracování dřeva',
      desc: 'Zvyšuje produkci Pily o +2 % za každý level.',

    });
  }

  cost(lvl){
    // lvl = aktuální dosažený level
    // n = kolikátý level kupujeme
    const n = (lvl || 0) + 1;
    const baseWood = 200;
    const baseStone = 200;
    const factor = Math.pow(2, n - 1); // každá úroveň ×2
    return {
      'dřevo': baseWood * factor,
      'kámen': baseStone * factor
    };
  }
  // výpočet bonusu pro daný level
  _bonusPerLevel(lvl){
    if (lvl <= 0) return 0;
    if (lvl === 1) return 0.06; // základní 6 %
    if (lvl <= 10){
      // lineární pokles z 45 % na 13 % (už máš nastavené, zachováme)
      const start = 0.45;
      const end   = 0.13;
      const step  = (start - end) / 9;
      return start - step * (lvl - 1);
    }
    return 0.12;
  }

   buildingMultiplier(state, building){
    const lvl = state?.research?.VDrevo?.level || 0;
    if (building.id === 'pila'){
      return 1 + (0.02 * lvl); // +2 % za každý level
      // bonus se počítá podle _bonusPerLevel, kde level 1 = 6 %
      let total = 1;
      for (let i = 1; i <= lvl; i++){
        total *= 1 + this._bonusPerLevel(i);
      }
      return total;
    }
    return 1;
  }

}
