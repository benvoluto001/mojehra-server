// src/stroje/receptyZbrane.js
import { BaseStroj } from './BaseStroj.js';

class _BaseWeapon extends BaseStroj {
  constructor(cfg){
    super(cfg);
    this.category = 'zbrane';
  }
  effectNote(){ return this._note || ''; }
}

/* Zbraně:
   - ukládají se do state.machines (nejsou vlevo mezi surovinami)
   - budou sloužit jako požadavky pro trénink jednotek
*/

class DreveneKopi extends _BaseWeapon {
  constructor(){
    super({
      id: 'drevene_kopi',
      name: 'Dřevěné kopí',
      unitTime: 3,
      unitCost: { 'dřevo': 30, 'železo': 10 },
    });
    this._note = 'Požadavek pro trénink Kopiníků.';
  }
}

class ZeleznyMec extends _BaseWeapon {
  constructor(){
    super({
      id: 'zelezny_mec',
      name: 'Železný meč',
      unitTime: 4,
      unitCost: { 'železo': 25, 'dřevo': 15 },
    });
    this._note = 'Požadavek pro trénink Mečeřů.';
  }
}

class Luk extends _BaseWeapon {
  constructor(){
    super({
      id: 'luk',
      name: 'Luk',
      unitTime: 3,
      unitCost: { 'dřevo': 35, 'kámen': 5 },
    });
    this._note = 'Požadavek pro trénink Lukostřelců.';
  }
}

class Kuse extends _BaseWeapon {
  constructor(){
    super({
      id: 'kuse',
      name: 'Kuše',
      unitTime: 5,
      unitCost: { 'dřevo': 40, 'železo': 20 },
    });
    this._note = 'Požadavek pro trénink Elitních střelců.';
  }
}

class ZeleznaSekera extends _BaseWeapon {
  constructor(){
    super({
      id: 'zelezna_sekera',
      name: 'Železná sekera',
      unitTime: 4,
      unitCost: { 'železo': 30, 'dřevo': 20 },
    });
    this._note = 'Požadavek pro trénink Těžké pěchoty.';
  }
}

class KopiZeSlitiny extends _BaseWeapon {
  constructor(){
    super({
      id: 'kopi_ze_slitiny',
      name: 'Kopí ze slitiny',
      unitTime: 5,
      unitCost: { 'slitina': 10, 'vlakno': 15 },
    });
    this._note = 'Požadavek pro trénink Hybridních strážců.';
  }
}

class MecBohu extends _BaseWeapon {
  constructor(){
    super({
      id: 'mec_bohu',
      name: 'Meč bohů',
      unitTime: 8,
      unitCost: { 'zlato': 50, 'slitina': 20, 'krystal': 10 },
    });
    this._note = 'Elitní hrdinská zbraň – umožní výcvik Krystalových válečníků.';
  }
}

class KrystalovaHul extends _BaseWeapon {
  constructor(){
    super({
      id: 'krystalova_hul',
      name: 'Krystalová hůl',
      unitTime: 6,
      unitCost: { 'krystal': 15, 'dřevo': 25, 'slitina': 8 },
    });
    this._note = 'Požadavek pro „Světelné střelce“ (hybridní ranged).';
  }
}

class PulzaroveDelo extends _BaseWeapon {
  constructor(){
    super({
      id: 'pulzarove_delo',
      name: 'Pulzarové dělo',
      unitTime: 12,
      unitCost: { 'pulzar': 1, 'slitina': 40, 'dřevo': 50 },
    });
    this._note = 'Těžká hybridní jednotka / obranný stroj.';
  }
}

export function weaponMachines(){
  return [
    new DreveneKopi(),
    new ZeleznyMec(),
    new Luk(),
    new Kuse(),
    new ZeleznaSekera(),
    new KopiZeSlitiny(),
    new MecBohu(),
    new KrystalovaHul(),
    new PulzaroveDelo(),
  ];
}
