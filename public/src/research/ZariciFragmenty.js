// src/research/ZariciFragmenty.js
import { BaseResearch } from './BaseResearch.js';


/**
* Zářící fragmenty – odemyká mimozemské budovy a výzkumy.
* L1: odemkne Krystal hvězdného jádra
* L2: odemkne Mimozemskou slitinu
* L3: odemkne Energetické jádro
* L4: odemkne Bio‑Mechanické vlákno
* L5: odemkne Datové artefakty
*
* Cena: level 1 stojí 2 dřeva; každý další level +1 dřevo.
* Čas: 2 s + 1 s za každý dosažený level (nastaveno ve state.research timeLinear).
*/
export class ZariciFragmenty extends BaseResearch {
constructor(){
super({
id: 'VZariciFragmenty',
name: 'Zářící fragmenty',
desc: 'Tajemné střepy naplněné energií. S každým poznatkem odemykáš další mimozemské technologie.'
});
}


// Cena pro NÁSLEDUJÍCÍ level:
  // L1 = 1600 dřevo, každý další level je o 120 % dražší (tj. ×2.2 oproti předchozímu)
  cost(lvl){
    const base = 1600;           // cena 1. levelu (můžeš změnit)
    const n = (lvl || 0) + 1;    // kolikátý level kupuješ (1,2,3,…)
    const price = Math.round(base * Math.pow(2.2, n - 1));
    return { 'dřevo': price };
}  }