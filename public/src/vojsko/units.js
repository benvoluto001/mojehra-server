// src/vojsko/units.js



export const UNIT_TYPES = [
  {
    id: 'kopinik',
    short: 'Kopiník',
    name: 'Kopiník Ankaritu',
    desc: 'Lehká frontová pěchota. Levný a rychlý trénink, vhodný do početních sestav.',
    damageType: 'azurová',
    strongAgainst: ['purpurová'],
    weakAgainst:   ['smaragdová'],
    stats: { hp: 120, armor: 8, atk: 14 },
    abilities: [ { name: 'Průraznost', desc: 'Ignoruje 15 % odolnosti cíle.' } ],
    effects: {          // ⬅️ nový blok: engine z něj čte čísla
      pierceArmorPct: 0.15            // průraznost: ignoruj 15 % armoru (váženě)
    },
lore: 'Špičky kopí jsou laděny na frekvenci ankaritového jádra.',
    cost: { 'dřevo': 20, 'železo': 5 }
  },
  {
    id: 'strelci',
    short: 'Střelci',
    name: 'Střelci Krystalové optiky',
    desc: 'Střední rozsah, přesné dávky krystalové energie.',
    damageType: 'purpurová',
    strongAgainst: ['karminová'],
    weakAgainst:   ['azurová'],
    stats: { hp: 90, armor: 6, atk: 20 },
    abilities: [ { name: 'Potlačující palba', desc: 'Snižuje útok nepřítele o 10 % na 5 s.' } ],
    effects: {
      debuffAtkPct: 0.10,             // -10 % k útoku nepřítele (váženě)
      debuffAtkRounds: 5
    },
lore: 'Krystaly v mířidlech destabilizují cizí slitiny.',
    cost: { 'dřevo': 10, 'železo': 10, 'krystal': 2 }
  },
  {
    id: 'strazce',
    short: 'Strážce',
    name: 'Strážci Skladů',
    desc: 'Těžká pěchota pro držení linie. Nízký DPS, vysoká výdrž.',
    damageType: 'smaragdová',
    strongAgainst: ['azurová'],
    weakAgainst:   ['karminová'],
    stats: { hp: 220, armor: 22, atk: 10 },
    abilities: [ { name: 'Ochranná aura', desc: 'Snižuje přijímané poškození spojenců o 8 %.' } ],
    effects: {
      teamDamageReductionPct: 0.08     // -8 % obdrženého dmg pro vlastní stranu (váženě)
    },
 lore: 'Pláty jsou posvěcené Datovými artefakty.',
    cost: { 'kámen': 30, 'železo': 20 }
  },
  {
    id: 'jezdec',
    short: 'Jezdec',
    name: 'Pulzarový jezdec',
    desc: 'Elitní útočná jednotka využívající přebytky energie.',
    damageType: 'karminová',
    strongAgainst: ['smaragdová'],
    weakAgainst:   ['purpurová'],
    stats: { hp: 150, armor: 12, atk: 32 },
    abilities: [
      { name: 'Přetížení', desc: 'Krátce zvyšuje útok o 20 % při zahájení střetu.' },
      { name: 'Pohybový šok', desc: 'Malá šance omráčit cíl na 1 s.' }
    ],
    effects: {
      burstAtkPct: 0.20,              // +20 % k útoku na začátku
      burstRounds: 1                   // po 1 kolo
      // (stun pro jednoduchost teď neřešíme; lze doplnit později)
    },
    lore: 'Sedlo je propojeno s pulzarem; jezdec cítí tep jádra jako vlastní.',
    cost: { 'železo': 25, 'stříbro': 10, 'energie': 15 }
  }
];
