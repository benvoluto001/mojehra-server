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
  ensureGuestIfNone();     // nastav „host“, pokud není přihlášen nikdo
  load(buildings);         // načti save pro aktuálního uživatele
  updateAccountBadge();

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
  const u = getCurrentUser?.() || 'host';
  localStorage.removeItem(`idle_save:${u}`); // smaž jen save aktuálního účtu
  location.reload();
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
