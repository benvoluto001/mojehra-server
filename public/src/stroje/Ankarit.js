// src/stroje/Ankarit.js
import { BaseStroj } from './BaseStroj.js';
import { state } from '../state.js';


export class Ankarit extends BaseStroj {
constructor(){
super({
id: 'ankarit',
name: 'Ankarit',
unitTime: 2,
unitCost: { 'krystal': 2 },
});
}


// ⬇️ Bez lvl 2 Krystalografie nedovol vyrobit žádný kus
maxCraftable(){
const lvl = state.research?.VKrystalografie?.level || 0;
if (lvl < 2) return 0;
return super.maxCraftable();
}


// Krátká poznámka do UI (zobrazíme ji ve Stroje – viz úprava níže)
requirementsNote(){
const lvl = state.research?.VKrystalografie?.level || 0;
return lvl >= 2 ? '' : 'Vyžaduje výzkum Krystalografie úroveň 2';
}
}