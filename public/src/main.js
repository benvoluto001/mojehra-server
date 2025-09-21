// src/main.js
import { load, save } from './state.js';
import { startLoop } from './core/loop.js';

import { renderResources, renderBuildings, renderDetail } from './ui/render.js';
import { renderPostava } from './ui/postava.js';
import { renderVyzkumy } from './ui/vyzkumy.js';
import { renderVypravy, resumeExpeditionOnLoad } from './ui/vypravy.js';
import { renderPisari, resumePisariOnLoad } from './ui/pisari.js';
import { renderStroje, registerMachines } from './ui/stroje.js';
import { renderObrana } from './ui/obrana.js';
import { renderUcet } from './ui/ucet.js';

import { state } from './state.js';
import { getCurrentUser, ensureGuestIfNone, onAuthChanged } from './auth.js';
import { renderZebricek } from './ui/zebricek.js';

import { Pila } from './buildings/Pila.js';
import { Kamenolom } from './buildings/Kamenolom.js';
import { StribrnyDul } from './buildings/StribrnyDul.js';
import { ZeleznyDul } from './buildings/ZeleznyDul.js';
import { ZlatyDul } from './buildings/ZlatyDul.js';
import { KrystalHvezdnehoJadra } from './buildings/KrystalHvezdnehoJadra.js';
import { BioMechanickeVlakno } from './buildings/BioMechanickeVlakno.js';
import { Sklad } from './buildings/Sklad.js';
import { EnergetickeJadro } from './buildings/EnergetickeJadro.js';
import { MimozemskaSlitina } from './buildings/MimozemskaSlitina.js';
import { DatoveArtefakty } from './buildings/DatoveArtefakty.js';
import { FarmaNaMaso } from './buildings/FarmaNaMaso.js';
import { FarmaNaObili } from './buildings/FarmaNaObili.js';

import { Ankarit } from './stroje/Ankarit.js';
import { Pulzar } from './stroje/Pulzar.js';
import { foodMachines } from './stroje/receptyJidlo.js';
import { weaponMachines } from './stroje/receptyZbrane.js';

import { ElixirSily }     from './stroje/elixiry/ElixirSily.js';
import { ElixirJasnosti } from './stroje/elixiry/ElixirJasnosti.js';
import { ElixirHvezd }    from './stroje/elixiry/ElixirHvezd.js';
import { ElixirOdvahy }   from './stroje/elixiry/ElixirOdvahy.js';
import { KrvavyElixir }   from './stroje/elixiry/KrvavyElixir.js';
import { ElixirBohu }     from './stroje/elixiry/ElixirBohu.js';

import { RESEARCHES } from './research/index.js';
// === OFFLINE OBNOVA VÝPRAVY (bez importu z vypravy.js) ===




// === AUTOSAVE + SAVE PŘI ODCHODU ===
let __autosaveTimer;
let __SKIP_SAVE_ONCE = false; // ⬅ při resetu = true → nic se neuloží

function setupAutosave(){
  try{ clearInterval(__autosaveTimer); }catch{}
  __autosaveTimer = setInterval(()=>{ try{ save?.(); }catch{} }, 5000); // každých 5 s
}

// ulož při skrytí záložky / zavření okna
window.addEventListener('visibilitychange', ()=>{ if (document.hidden){ try{ if (!__SKIP_SAVE_ONCE) save?.(); }catch{} }});
window.addEventListener('pagehide',         ()=>{ try{ if (!__SKIP_SAVE_ONCE) save?.(); }catch{} });
window.addEventListener('beforeunload',     ()=>{ try{ if (!__SKIP_SAVE_ONCE) save?.(); }catch{} });


// === HARD RESET HRY ===
function hardResetGame(){
  try{ __SKIP_SAVE_ONCE = true; }catch(e){}           // ⬅ stopni všechny savy
  try{ clearInterval(__autosaveTimer); }catch(e){}    // ⬅ vypni autosave
  try{
    localStorage.clear();                              // ⬅ smaž všechno uložené
    sessionStorage.clear();
  }catch(e){}
  location.reload();                                   // ⬅ čisté načtení
}




// ulož i při kliknutí na odkaz /logout
document.addEventListener('click', (e)=>{
  const a = e.target.closest?.('a[href="/logout"]');
  if (a){ try{ save?.(); }catch{} }
});


let __expTimer = null;
function __expStop(){ if (__expTimer){ clearInterval(__expTimer); __expTimer = null; } }

function __phasePlanned(phase){
  // pokud máš v appce PHASES/phasePlanned, použij je
  if (typeof phasePlanned === 'function') return phasePlanned(phase);
  const map = { out: 5*60, explore: 20*60, back: 5*60 }; // s
  return map[phase] || 0;
}
function __pushLog(msg){ try{ (typeof pushLog==='function') && pushLog(msg); }catch{} }

export function resumeExpeditionOnLoadInline(){
  const ex = state?.expedition;
  if (!ex || ex.status !== 'running'){ __expStop(); return; }

  const now = Date.now();
  let elapsed = Math.floor((now - (ex.startedAt || now))/1000);

  // dožeň offline – přeskakuj celé fáze dokud něco zbývá
  while (true){
    const planned = __phasePlanned(ex.phase);
    if (elapsed < planned){
      // jsme uprostřed fáze → nastav zbývající čas a spusť tik
      ex.remaining = planned - elapsed;
      ex.updatedAt = now;
      __expStop();
      __expTimer = setInterval(()=>{
        // jednoduchý tik: odpočítání zbývajících sekund
        ex.remaining = Math.max(0, (ex.remaining||0) - 1);
        if (ex.remaining <= 0){
          // fáze doběhla právě teď
          if (ex.phase === 'out'){
            ex.phase = 'explore';
            ex.startedAt = Date.now();
            ex.remaining  = __phasePlanned('explore');
            __pushLog('Karavana dorazila na místo. Začíná průzkum (20 min).');
          }else if (ex.phase === 'explore'){
            ex.phase = 'back';
            ex.startedAt = Date.now();
            ex.remaining  = __phasePlanned('back');
            __pushLog('Průzkum dokončen. Návrat (5 min).');
          }else{
            // konec výpravy
            __expStop();
            if (typeof finishExpedition === 'function'){
              finishExpedition();
            }else{
              ex.status = 'done';
              ex.phase = 'out';
              __pushLog('Výprava dokončena.');
            }
            return;
          }
        }
      }, 1000);
      return;
    }

    // celá fáze doběhla během nepřihlášení → odečti a přepni fázi
    elapsed -= planned;

    if (ex.phase === 'out'){
      ex.phase = 'explore';
      ex.startedAt = now - (elapsed*1000);
      __pushLog('Karavana dorazila na místo. Začíná průzkum (20 min).');
      continue;
    }
    if (ex.phase === 'explore'){
      ex.phase = 'back';
      ex.startedAt = now - (elapsed*1000);
      __pushLog('Průzkum dokončen. Návrat (5 min).');
      continue;
    }
    if (ex.phase === 'back'){
      // všechno doběhlo už offline
      __expStop();
      if (typeof finishExpedition === 'function'){
        finishExpedition();
      }else{
        ex.status = 'done';
        ex.phase = 'out';
        ex.remaining = 0;
        __pushLog('Výprava dokončena.');
      }
      return;
    }
  }
}

// DOPLŇ POD IMPORTY
export async function syncAccountFromSession(){
  try{
    const r = await fetch('/__whoami');
    const j = await r.json();
    const u = (j && j.user) ? j.user : 'host';
    const el = document.getElementById('account-label');
    if (el) el.textContent = u;

    // volitelně: když nemáš ještě přezdívku, předvyplň ji jménem účtu
    if (!state.stats) state.stats = {};
    if (!state.stats.nickname || state.stats.nickname === 'host') {
      state.stats.nickname = u;
      save?.();
    }
  }catch(e){}
}

export function refreshAccountLabel(){
  const el = document.getElementById('account-label');
  if (el) el.textContent = (state?.stats?.nickname || 'host');
}

// ===== pomocné =====
function updateAccountBadge(){
  const el = document.getElementById('account-badge');
  if (el) el.textContent = getCurrentUser() || 'host';
}

// bezpečné získání/vytvoření page kontejneru (když chybí v HTML)
function ensurePage(id){
  let el = document.getElementById(id);
  if (!el){
    el = document.createElement('section');
    el.id = id;
    el.className = 'page';
    const main = document.querySelector('main') || document.body;
    main.appendChild(el);
  }
  return el;
}

// výzkumy + jejich obrázky (volitelné)
window.__RESEARCH_LIST__ = RESEARCHES;
window.RESEARCH_IMAGES = {
  VDrevo:             'src/ui/obrazky/vyzkumy/VDrevo.png',
  VKamen:             'src/ui/obrazky/vyzkumy/VKamen.png',
  VArtefakty:         'src/ui/obrazky/vyzkumy/VArtefakty.png',
  VKrystalografie:    'src/ui/obrazky/vyzkumy/VKrystalografie.png',
  VOkoPoutnika:       'src/ui/obrazky/vyzkumy/VOkoPoutnika.png',
  VPokrocileNastroje: 'src/ui/obrazky/vyzkumy/VPokrocileNastroje.png',
  VZariciFragmenty:   'src/ui/obrazky/vyzkumy/VZariciFragmenty.png',
  VSyntezaSlitiny:    'src/ui/obrazky/vyzkumy/VSyntezaSlitiny.png',
};

function mountApp(){
  console.log('✅ init');

  // ========== seznam budov ==========
  const buildings = [
    new Sklad(),
    new Pila(),
    new FarmaNaObili(),
    new FarmaNaMaso(),
    new Kamenolom(),
    new ZeleznyDul(),
    new StribrnyDul(),
    new ZlatyDul(),
    new KrystalHvezdnehoJadra(),
    new BioMechanickeVlakno(),
    new EnergetickeJadro(),
    new MimozemskaSlitina(),
    new DatoveArtefakty(),
  ];

  // ========== stroje (výroba) ==========
  // Energie
  const mAnkarit = new Ankarit(); mAnkarit.category = 'energie';
  const mPulzar  = new Pulzar();  mPulzar.category  = 'energie';

  // Elixíry
  const mElixiry = [
    new ElixirSily(),
    new ElixirJasnosti(),
    new ElixirHvezd(),
    new ElixirOdvahy(),
    new KrvavyElixir(),
    new ElixirBohu(),
  ].map(m => (m.category = 'elixiry', m));

  const machines = [
  mAnkarit,
  mPulzar,
  ...foodMachines(),
  ...mElixiry,
  ...weaponMachines(),
];


  // dostupné globálně (render, offline výpočet apod.)
  window.__allBuildings = buildings;
  window.renderPisari = renderPisari;

  // ========== účty a save ==========
  ensureGuestIfNone();
load(buildings);
resumeExpeditionOnLoadInline();
syncAccountFromSession();

 // přepiš „Účet: …“ podle session (/__whoami)


  // obnova rozběhnutých dějů po načtení
  resumeExpeditionOnLoad();
  resumePisariOnLoad();

  // první vykreslení + smyčka
  registerMachines(machines);
  renderResources(buildings);
  renderBuildings(buildings);
  startLoop(buildings);

  // --- Uložit/Reset ---
  document.getElementById('save')?.addEventListener('click', () => {
    save();
    alert('Uloženo ✅');
  });
  document.getElementById('reset')?.addEventListener('click', () => {
  const ok = confirm('Opravdu smazat celý postup a začít znovu?');
  if (!ok) return;
  hardResetGame();
});



  // ===== Mini router (hash) =====
  function handleRoute(){
    const hash = (location.hash || '#budovy');
    const name = hash.slice(1);

    // skryj vše
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));

    // zajisti stránku
    const id = 'page-' + name;
    const pageEl = ensurePage(id);
    pageEl.classList.add('active');

    // aktivní odkaz v menu
    document.querySelectorAll('.topnav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.topnav a[href="${hash}"]`)?.classList.add('active');

    // render podle jména
    if (name === 'budovy')   renderBuildings(window.__allBuildings || []);
    if (name === 'vyzkumy')  renderVyzkumy();
    if (name === 'vypravy')  renderVypravy();
    if (name === 'pisari')   renderPisari();
    if (name === 'postava')  renderPostava?.();
    
    if (name === 'zebricek')  renderZebricek();

 
    if (name === 'predmety') renderStroje();
    if (name === 'obrana')   renderObrana();
    if (name === 'ucet')     renderUcet();
  }

  window.addEventListener('hashchange', handleRoute);
  if (!location.hash) location.hash = '#budovy';
  handleRoute();

  // reakce na přepnutí účtu (registrace/přihlášení/odhlášení)
  onAuthChanged(() => {
    load(buildings);
    // po načtení savů obnov běžící výpravu (spustí časovač a dopočítá offline)
resumeExpeditionOnLoad();

    updateAccountBadge();
    const name = (location.hash || '#budovy').slice(1);
    handleRoute(); // překresli aktuální záložku
  });

  // === Automatická regenerace vitality každé 2 s (+10) ===
  setInterval(() => {
    const p = state.player;
    if (!p) return;
    const before = p.stats.vitality;
    p.stats.vitality = Math.min(p.max.vitality, p.stats.vitality + 10);
    if (p.stats.vitality !== before &&
        document.getElementById('page-postava')?.classList.contains('active')){
      renderPostava();
    }
  }, 2000);

  onAuthChanged(() => {
  load(window.__allBuildings || []);
  const name = (location.hash || '#budovy').slice(1);
  // (pokud máš odznak účtu v menu, klidně aktualizuj i ten)
  // updateAccountBadge?.();
  // překresli aktuální záložku:
  location.hash = '#' + name;
});

}

// start po načtení DOM
if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
