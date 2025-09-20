// src/stroje/receptyJidlo.js
import { RecipeMachine } from './recipemachine.js';

/**
 * Všechny recepty v kategorii „Jídlo“.
 * ↓ Množství a časy jsou rozumné defaulty – kdykoli upravíme.
 */
export function foodMachines(){
  return [
    new RecipeMachine({
      id: 'chleb_bojovniku',
      name: 'Chléb bojovníků',
      unitTime: 2,
      unitCost: { 'obilí': 20 },
      category: 'jidlo',
    }),
    new RecipeMachine({
      id: 'masova_kase',
      name: 'Masová kaše',
      unitTime: 3,
      unitCost: { 'maso': 12, 'obilí': 12 },
      category: 'jidlo',
    }),
    new RecipeMachine({
      id: 'susene_maso',
      name: 'Sušené maso',
      unitTime: 3,
      unitCost: { 'maso': 18 },
      category: 'jidlo',
    }),
    new RecipeMachine({
      id: 'lovci_zasoby',
      name: 'Lovčí zásoby',
      unitTime: 4,
      // ⬇️ Vstup „sušené maso“ je právě VÝROBEK (machine) z předchozího receptu.
      unitCost: { 'susene_maso': 3, 'vlakno': 8 },
      category: 'jidlo',
    }),
    new RecipeMachine({
      id: 'ritualni_hostina',
      name: 'Rituální hostina',
      unitTime: 5,
      unitCost: { 'obilí': 35, 'susene_maso': 25, 'zlato': 5 },
      category: 'jidlo',
    }),
    new RecipeMachine({
      id: 'slavnostni_pecivo',
      name: 'Slavnostní pečivo',
      unitTime: 5,
      // „med“ zatím nemáš, nevadí – výroba bude čekat, dokud med nepřidáme (nová budova).
      unitCost: { 'obilí': 28, 'med': 6 },
      category: 'jidlo',
    }),
    new RecipeMachine({
      id: 'hostina_vitezu',
      name: 'Hostina vítězů',
      unitTime: 6,
      unitCost: { 'maso': 45, 'obilí': 45, med: 10, 'zlato': 12 },
      category: 'jidlo',
    }),
  ];
}
