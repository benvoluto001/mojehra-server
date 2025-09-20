// src/obrana/receptyObrana.js
import { state, save } from '../state.js';

function ensureCounter(id){
  if (!state.machines) state.machines = {};
  if (typeof state.machines[id] !== 'number') state.machines[id] = 0;
}
function haveOf(key){
  if (key in (state.resources||{})) return Number(state.resources[key]||0);
  if (key in (state.machines ||{})) return Number(state.machines[key] ||0);
  return 0;
}
function canPayOnce(cost){
  return Object.entries(cost||{}).every(([k,v]) => haveOf(k) >= v);
}
function payOnce(cost){
  Object.entries(cost||{}).forEach(([k,v])=>{
    if (k in (state.resources||{})){
      state.resources[k] = Math.max(0, (state.resources[k]||0) - v);
    } else if (k in (state.machines||{})){
      state.machines[k] = Math.max(0, (state.machines[k]||0) - v);
    }
  });
}

export function getDefenseRecipes(){
  return [
    { id:'vez_lucistnik',  name:'Strážní věž (lučištník)', tier:1,
      cost:{ 'dřevo':120,'kámen':80,'luk':1,'chleb_bojovniku':1 }, atk:12, armor:4,
      lore:'Jednoduché dřevěno-kamenné věže s lučištníky krmenými chlebem.' },
    { id:'hradba_kopinici', name:'Kopinická hradba', tier:1,
      cost:{ 'kámen':140,'železo':60,'drevene_kopi':1,'chleb_bojovniku':1 }, atk:6, armor:20,
      lore:'Zpevněné hradby, kde muži s kopími drží první linii.' },

    { id:'balista_stribro', name:'Balista se stříbrným hrotem', tier:2,
      cost:{ 'dřevo':140,'kámen':120,'železo':80,'stříbro':20,'zelezna_sekera':1,'masova_kase':1 }, atk:40, armor:8,
      lore:'Těžké balisty, jejichž šípy proráží i obrněné cíle.' },
    { id:'elitni_strelec',  name:'Zlatem krytý elitní střelec', tier:2,
      cost:{ 'dřevo':60,'železo':50,'zlato':50,'kuse':1,'lovci_zasoby':1 }, atk:25, armor:10,
      lore:'Kušemi ozbrojení střelci ve zlatem zdobených pancířích.' },

    { id:'krystalova_vez',  name:'Krystalová věž', tier:3,
      cost:{ 'kámen':180,'slitina':40,'krystal':20,'krystalova_hul':1,'ritualni_hostina':1 }, atk:100, armor:20,
      lore:'Monumentální věž s krystalovou technologií — energetický paprsek.' },
    { id:'strazce_pulzaru', name:'Strážce Pulzarů', tier:3,
      cost:{ 'slitina':50,'pulzar':1,'mec_bohu':1,'ritualni_hostina':1 }, atk:80, armor:60,
      lore:'Elitní strážci v mimozemské zbroji napájené Pulzary.' },
  ];
}

export function craftDefense(id, qty){
  const q = Math.max(0, Math.floor(Number(qty||0)));
  if (q <= 0) return { ok:false, built:0, reason:'qty=0' };
  const rec = getDefenseRecipes().find(r => r.id === id);
  if (!rec) return { ok:false, built:0, reason:'unknown id' };

  let built = 0;
  for (let i=0;i<q;i++){
    if (!canPayOnce(rec.cost)) break;
    payOnce(rec.cost);
    ensureCounter(id);
    state.machines[id] += 1;
    built++;
  }
  if (built>0) save?.();
  return { ok: built>0, built, reason: built===q ? 'ok' : 'not_enough' };
}

export function getDefenseTotals(){
  let atk = 0, armor = 0;
  getDefenseRecipes().forEach(r => {
    const n = Number(state?.machines?.[r.id] || 0);
    atk   += n * (r.atk||0);
    armor += n * (r.armor||0);
  });
  return { atk, armor };
}
