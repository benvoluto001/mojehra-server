// src/ui/render.js

// ── formátování čísel/času ─────────────────────────────────────────────────────
const fmtInt = (n) => Math.floor(Number(n) || 0).toLocaleString('cs-CZ');
const fmt    = (n) => Number(n ?? 0).toLocaleString('cs-CZ');
const s      = (n) => `${Math.max(0, Math.ceil(Number(n) || 0))}s`;

// ── stav / importy ─────────────────────────────────────────────────────────────
import { state, save } from '../state.js';
import { getBuildingRate } from '../state.js';

let selectedResourceKey = null; // co je vybráno vlevo (kvůli zvýraznění)

// hezké názvy (podle konfigurací v globálu)
const BUILDING_NAMES = Object.fromEntries((window.BUILDINGS   || []).map(x => [x.id, x.name]));
const RESEARCH_NAMES = Object.fromEntries((window.RESEARCHES  || []).map(x => [x.id, x.name]));

// ── pomocné UI ─────────────────────────────────────────────────────────────────
function ensureResourcesContainer(){
  let wrap = document.getElementById('resources');
  if (!wrap){
    wrap = document.createElement('div');
    wrap.id = 'resources';
    document.body.appendChild(wrap);
  }
  return wrap;
}

function progressBarHTML(b){
  if (!b?.isBusy?.()) return '';
  const total = b.action === 'build' ? b.buildTime : b.upgradeTime;
  if (!total || total <= 0) return '';
  const elapsed = Math.max(0, total - b.remaining);
  const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  return `
    <div class="progress">
      <div class="bar" style="width:${pct}%"></div>
    </div>
  `;
}

// hezké vypsání POŽADAVKŮ (budovy + výzkumy)
// funguje jak nad instancí budovy, tak nad její konfigurací
function renderReqHTML(cfgLike, st) {
  const rows = [];
  const curState = st || state;

  // === BUDOVY ===
  const bReq =
    cfgLike.buildingReq ||
    (cfgLike.requires && cfgLike.requires.buildings) ||
    cfgLike.requiresBuildings ||
    cfgLike.requirements ||
    null;

  if (bReq && Object.keys(bReq).length) {
    rows.push('<div class="mini muted">Vyžaduje budovy:</div>');
    rows.push('<ul class="req-list">');
    for (const [id, need] of Object.entries(bReq)) {
      // najdi instanci budovy
      const other = (window.__allBuildings || []).find(b => b.id === id);
      const cur   = other?.level || 0;
      const built = !!other?.isBuilt;
      const ok    = built && cur >= Number(need);
      const name  = other?.name || id;

      rows.push(
        `<li class="${ok ? 'ok' : 'no'}">
          ${ok ? '✔' : '✖'} ${name} — lvl ${need} 
          ${ok ? 'splněno' : `(máš ${cur}${built ? '' : ', nestojí'})`}
        </li>`
      );
    }
    rows.push('</ul>');
  }

  // === VÝZKUMY ===
  const rReq =
    cfgLike.researchReq ||
    (cfgLike.requires && cfgLike.requires.research) ||
    cfgLike.requiresResearch ||
    null;

  if (rReq && Object.keys(rReq).length) {
    rows.push('<div class="mini muted">Vyžaduje výzkum:</div>');
    rows.push('<ul class="req-list">');
    for (const [id, need] of Object.entries(rReq)) {
      const cur = curState?.research?.[id]?.level || 0;
      const ok  = cur >= Number(need);
      rows.push(
        `<li class="${ok ? 'ok' : 'no'}">
          ${ok ? '✔' : '✖'} ${id} — lvl ${need} 
          ${ok ? 'splněno' : `(máš ${cur})`}
        </li>`
      );
    }
    rows.push('</ul>');
  }

  return rows.join('');
}


// najdi budovu, která vyrábí daný resource (řeší diakritiku i různé id)
function findBuildingForResource(buildings, resourceKey){
  if (!resourceKey) return null;

  // 1) ideálně přímo podle výstupu
  let b = buildings.find(x => x.output === resourceKey);
  if (b) return b;

  // 2) fallback map (pozor na skutečná id z tvých tříd)
  const map = {
    'dřevo': 'pila', 'drevo': 'pila',
    'kámen': 'kamenolom', 'kamen': 'kamenolom',
    'železo': 'zeleznydul', 'zelezo': 'zeleznydul',
    'stříbro': 'stribrnyDul', 'stribro': 'stribrnyDul',
    'zlato': 'ZlatyDul',
    'krystal': 'KrystalHvezdnehoJadra',
    'vlakno': 'BioMechanickeVlakno',
    'slitina': 'MimozemskaSlitina',
    'artefakty': 'DatoveArtefakty',
    'energie': 'EnergetickeJadro',
    'obilí': 'FarmaNaObili',
    'maso':  'FarmaNaMaso',
  };
  const id = map[resourceKey];
  if (!id) return null;
  return buildings.find(x => x.id === id) || null;
}

// ── RENDER: panel surovin vlevo (klikací) ─────────────────────────────────────
export function renderResources(buildingsMaybe){
  const buildings = buildingsMaybe || window.__allBuildings || [];
  const wrap = ensureResourcesContainer();
  wrap.innerHTML = '';

  for (const [key, rawVal] of Object.entries(state.resources)){
    const val = Number(rawVal) || 0;

    // skryj nulové (kromě energie)
    const isEnergy = key === 'energie';
    if (!isEnergy && Math.floor(val) <= 0) continue;

    const capRaw   = state.capacity?.[key];
    const isCapped = Number.isFinite(capRaw) && capRaw >= 0;
    const cap      = isCapped ? Number(capRaw) : undefined;
    const full     = isCapped && val >= (cap - 1e-9); // tolerance FP

    const div = document.createElement('div');
    div.className = 'resource' + (full ? ' full' : '') + (selectedResourceKey === key ? ' active' : '');
    div.textContent = isCapped ? `${key}: ${fmtInt(val)} / ${fmtInt(cap)}` : `${key}: ${fmtInt(val)}`;
    div.dataset.key = key;
    wrap.appendChild(div);
  }

  // klik -> otevři Budovy a jejich detail vybrané suroviny
  wrap.onclick = (e) => {
    const item = e.target.closest('.resource');
    if (!item) return;

    selectedResourceKey = item.dataset.key || null;
    const b = findBuildingForResource(buildings, selectedResourceKey);

    // dej vědět routeru i loopu
    window.__pendingResourceKey = selectedResourceKey;
    window.__pendingBuildingId  = b?.id || null;
    window.__selectedBuildingId = b?.id || null; // ⬅ živý refresh v loopu

    const onBudovy = document.getElementById('page-budovy')?.classList.contains('active');
    if (!onBudovy) {
      location.hash = '#budovy';
    } else if (b) {
      renderDetail(b);
    }

    renderResources(buildings); // refresh zvýraznění
  };
}

// ── RENDER: DETAIL BUDOVY (pořadí jako u výzkumů) ─────────────────────────────
export function renderDetail(b){
  const box = document.getElementById('detail-box');
  if (!box) return;

  // zapamatuj si otevřený detail, ať ho loop přerenderuje každou s
  if (b && b.id) window.__selectedBuildingId = b.id;

  if (!b){
    box.innerHTML = `<div class="muted">Klikni vlevo na surovinu, zobrazí se tady detail příslušné budovy.</div>`;
    return;
  }

  const all = window.__allBuildings || [];
  const H = 3600, D = 86400, W = 604800;

  // stav & ceny
  const canBuild  = !b.isBuilt && b.canStartBuild?.(all);
  const canUpg    =  b.isBuilt && b.canStartUpgrade?.();

  const buildCostObj   = b.buildCost || {};
  const upgradeCostObj = (b.getUpgradeCost ? b.getUpgradeCost() : {}) || {};

  const costBuild = Object.entries(buildCostObj).map(([k,v]) => `${fmtInt(v)} ${k}`).join(', ') || '—';
  const costUpg   = Object.entries(upgradeCostObj).map(([k,v]) => `${fmtInt(v)} ${k}`).join(', ') || '—';

  // aktuální produkce (během upgrade běží na starém lvl)
  const producesNow = b.isBuilt && (!b.isBusy() || b.action === 'upgrade');
  const rateNow = producesNow ? (b.rate || 0) : 0;

  // projekce +10 lvl
  const L = b.level || 1;
  const rows = Array.from({length:10}, (_,i) => {
    const next = L + i + 1;
    const totalAtNext = (b.baseRate * next);
    const inc = b.baseRate * (i + 1);
    return `<tr>
      <td>Lvl ${next}</td>
      <td>+${fmt(inc)}/s</td>
      <td>${fmt(totalAtNext)}/s</td>
    </tr>`;
  }).join('');

  // Požadavky (budovy + výzkumy) – umístěno hned pod nadpis a úroveň
  const reqHTML = renderReqHTML(b, state);

  const lvlShown = b.isBuilt ? b.level : 0;

  // MARKUP ve stejném duchu jako výzkumy:
  // Nadpis → Úroveň → Požadavky → Akce (cena, doba, tlačítko) → Aktuální produkce → Projekce → Statistika
  box.innerHTML = `
    <h3>${b.name}</h3>
    <div class="mini">Úroveň: ${lvlShown}${b.isBusy?.() ? ` • právě probíhá ${b.action === 'build' ? 'stavba' : 'vylepšení'} (${s(b.remaining)})` : ''}</div>

    ${reqHTML}

    <h4>Akce</h4>
    <div class="mini">${b.isBuilt ? 'Cena upgradu' : 'Cena stavby'}: ${b.isBuilt ? costUpg : costBuild}</div>
    <div class="mini">${b.isBuilt ? 'Doba vylepšení' : 'Doba stavby'}: ${s(b.isBuilt ? b.upgradeTime : b.buildTime)}</div>
    <button
      id="${b.isBuilt ? 'btn-upg' : 'btn-build'}"
      class="btn"
      ${b.isBuilt
          ? (canUpg   ? '' : 'disabled')
          : (canBuild ? '' : 'disabled')
      }>
      ${b.isBusy?.()
          ? (b.isBuilt ? 'Vylepšuje se…' : 'Staví se…')
          : (b.isBuilt ? 'Vylepšit' : 'Postavit')
      }
    </button>
    ${b.isBusy?.()
      ? `<div class="progress" style="margin-top:8px;">
           <div class="bar" style="width:${Math.round(100 * (1 - (b.remaining/(b.action==='build'?b.buildTime:b.upgradeTime))))}%"></div>
         </div>`
      : ''
    }

    <h4>Aktuální produkce</h4>
    <table class="tbl small">
      <thead>
        <tr><th>/s</th><th>/h</th><th>/den</th><th>/týden</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${fmt(rateNow)}</td>
          <td>${fmt(rateNow * H)}</td>
          <td>${fmt(rateNow * D)}</td>
          <td>${fmt(rateNow * W)}</td>
        </tr>
      </tbody>
    </table>

    <h4>Projekce navýšení (dalších 10 lvl)</h4>
    <table class="tbl small">
      <thead>
        <tr>
          <th>Budoucí úroveň</th>
          <th>Navýšení oproti dnešku</th>
          <th>Výroba na dané úrovni</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <h4><span class="ico">📊</span> Statistika těžby</h4>
    <table class="tbl small">
      <thead>
        <tr><th>Surovina</th><th>/s</th><th>/h</th><th>/den</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${b.output || '—'}</td>
          <td>${fmt(rateNow)}</td>
          <td>${fmt(rateNow * H)}</td>
          <td>${fmt(rateNow * D)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // drátování tlačítek
  if (!b.isBuilt){
    document.getElementById('btn-build')?.addEventListener('click', () => {
      b.startBuild(all);
      save?.();
      renderDetail(b); // okamžitý refresh
    });
  } else {
    document.getElementById('btn-upg')?.addEventListener('click', () => {
      b.startUpgrade();
      save?.();
      renderDetail(b);
    });
  }
}

// ── RENDER: STATISTIKY CELKOVÉ PRODUKCE (souhrn v detailu) ────────────────────
export function renderStats(buildings){
  const box = document.getElementById('stats');
  if (!box) return;

  const perSec = {};
  buildings.forEach(b => {
    if (!b.isBuilt) return;
    const producesNow = !b.isBusy() || b.action === 'upgrade';
    if (!producesNow) return;
    if (!b.output) return;
    perSec[b.output] = (perSec[b.output] || 0) + (b.rate || 0);
  });

  const H = 3600, D = 86400, W = 604800;

  const rows = Object.keys(perSec).sort().map(key => `
    <div class="stat-row">
      <div class="stat-name">${key}</div>
      <div class="stat-num">${fmt(perSec[key])}</div>
      <div class="stat-num">${fmt(perSec[key]*H)}</div>
      <div class="stat-num">${fmt(perSec[key]*D)}</div>
      <div class="stat-num">${fmt(perSec[key]*W)}</div>
    </div>
  `).join('');

  box.innerHTML = `
    <h3 class="stats-title">📈 Statistika těžby</h3>
    <div class="stat-header">
      <div>Surovina</div>
      <div>/s</div>
      <div>/h</div>
      <div>/den</div>
      <div>/týden</div>
    </div>
    ${rows || `<div class="muted">Žádná aktivní produkce</div>`}
  `;
}
// splněné požadavky výzkumu? (budovy + jiné výzkumy)
function canStartResearchByReq(cfg, st = window.state){
  if (!cfg) return true;
  const s = st || {};
  // různé možné názvy polí s požadavky
  const bReq =
    cfg.buildingReq ||
    (cfg.requires && cfg.requires.buildings) ||
    cfg.requiresBuildings ||
    null;
  const rReq =
    cfg.researchReq ||
    (cfg.requires && cfg.requires.research) ||
    cfg.requiresResearch ||
    null;

  // budovy: bereme živé instance z window.__allBuildings
  if (bReq){
    const bmap = Object.fromEntries((window.__allBuildings || []).map(b => [b.id, b]));
    for (const [id, need] of Object.entries(bReq)){
      const cur = bmap[id]?.level || 0;
      if (cur < Number(need)) return false;
    }
  }
  // výzkumy: z uloženého stavu
  if (rReq){
    for (const [id, need] of Object.entries(rReq)){
      const cur = s?.research?.[id]?.level || 0;
      if (cur < Number(need)) return false;
    }
  }
  return true;
}

// ── VÝZKUMY (mřížka + kliknutí) ───────────────────────────────────────────────
export function renderVyzkumyLegacy(){

  const page = document.getElementById('page-vyzkumy');
  if (!page || !page.classList.contains('active')) return;

  const grid = page.querySelector('#research-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const list =
    (Array.isArray(window.__RESEARCH_LIST__) && window.__RESEARCH_LIST__) ||
    (typeof RESEARCHES !== 'undefined' && Array.isArray(RESEARCHES) && RESEARCHES) ||
    [];

  list.forEach(cfg => {
    const r  = (window.state?.research?.[cfg.id]) || { level: 0 };
    const lv = r.level || 0;

    const tile = document.createElement('button');
    const locked = !canStartResearchByReq(cfg, window.state);
    tile.className = 'card research-card' + (locked ? ' locked' : '');
    tile.setAttribute('data-rid', cfg.id);

    // obrázek + obsah (použijeme .tile-bg a .tile-content, aby šednutí fungovalo přes CSS)
    const img = (window.RESEARCH_IMAGES && window.RESEARCH_IMAGES[cfg.id]) || null;
    tile.innerHTML = `
      ${img ? `<div class="tile-bg" style="background-image:url('${img}')"></div>` : ''}
      <div class="tile-content">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="font-weight:800;font-size:16px;line-height:1.1;max-width:80%;">${cfg.name}</div>
          <div class="level">Lvl ${lv}</div>
        </div>
        <div class="mini muted" style="margin-top:6px;">${cfg.desc || ''}</div>
      </div>
    `;

    grid.appendChild(tile);
  });

  if (!grid.dataset.bound){
    grid.addEventListener('click', (e)=>{
      const tile = e.target.closest('.research-card[data-rid]');
      if (!tile) return;
      const rid = tile.getAttribute('data-rid');
      window.__selectedResearchId = rid;
      if (typeof window.renderResearchDetail === 'function'){
        window.renderResearchDetail(rid);
      }
    });
    grid.dataset.bound = '1';
  }
}

// ── MŘÍŽKA BUDOV ──────────────────────────────────────────────────────────────
function ensureBudovyLayout(){
  const page = document.getElementById('page-budovy');
  if (!page) return null;
  const grid   = page.querySelector('#buildings');
  const detail = page.querySelector('#detail-box');
  return { page, grid, detail };
}

export function renderBuildings(buildings){
  const ctx = ensureBudovyLayout();
  const grid = (ctx && ctx.grid) || document.getElementById('buildings');
  if (!grid) return;

  grid.innerHTML = '';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(3, minmax(180px, 1fr))';
  grid.style.gap = '12px';

  // obrázky budov podle ID (uprav dle svých souborů)
  const IMG = {
    pila: './src/ui/obrazky/pila.PNG',
    kamenolom: './src/ui/obrazky/kamenolom.png',
    zeleznydul: './src/ui/obrazky/zeleznydul.png',
    stribrnyDul: './src/ui/obrazky/stribrnydul.png',
    ZlatyDul: './src/ui/obrazky/zlatydul.png',
    KrystalHvezdnehoJadra: './src/ui/obrazky/krystalhvezdnehojadra.png',
    EnergetickeJadro: './src/ui/obrazky/energetickejadro.png',
    sklad: './src/ui/obrazky/sklad.png',
    DatoveArtefakty: './src/ui/obrazky/datoveartefakty.png',
    BioMechanickeVlakno: './src/ui/obrazky/vlakno.png',
    biomechanickevlakno: './src/ui/obrazky/vlakno.png',
    MimozemskaSlitina:   './src/ui/obrazky/mimozemskaslitina.png',
    mimozemskaslitina:   './src/ui/obrazky/mimozemskaslitina.png',
    FarmaNaObili: './src/ui/obrazky/obili.png',
    FarmaNaMaso:  './src/ui/obrazky/maso.png',


  };
  const getImg = (id) => IMG[id] || IMG[(id || '').toLowerCase()];

  const THEME_FG = '#E8D3B5';   // světlá sepia pro text
  const THEME_MUTED = '#CDB896'; // tlumená sepia
  const H = 3600;

  buildings.forEach(b => {
    const busy = typeof b.isBusy === 'function' ? b.isBusy() : false;
    const producesNow = b.isBuilt && (!busy || b.action === 'upgrade');
    const perSec  = producesNow ? (Number(b.rate) || 0) : 0;
    const perHour = perSec * H;

    const tile = document.createElement('button');
    tile.className = 'card';
    tile.setAttribute('data-bid', b.id);
    tile.style.textAlign = 'left';
    tile.style.cursor = 'pointer';
    tile.style.aspectRatio = '1 / 1';
    tile.style.display = 'flex';
    tile.style.flexDirection = 'column';
    tile.style.justifyContent = 'space-between';
    tile.setAttribute('data-bid', b.id);
        // je budova zamknutá (nesplňuje požadavky na stavbu)?
    const unmetReq = !b.isBuilt && !(b.canStartBuild?.(buildings));
    if (unmetReq) {
      tile.classList.add('locked');
    }


    // obrázek pro danou budovu (pokud existuje)
    const img = getImg(b.id);
    if (img){
      tile.style.backgroundImage =
        `linear-gradient(to bottom right, rgba(45,34,24,.55), rgba(45,34,24,.55)), url("${img}")`;
      tile.style.backgroundSize = 'cover';
      tile.style.backgroundPosition = 'center';
      tile.style.color = THEME_FG;
      tile.style.textShadow = '0 1px 2px rgba(0,0,0,.45)';
    }

    const lvl = b.isBuilt ? (b.level || 0) : 0;
    const busyText = busy ? (b.action === 'build' ? ' • staví se ⏳' : ' • upgrade ⏫') : '';
    const useMuted = img ? '' : 'muted';
    const mutedInline = img ? `style="color:${THEME_MUTED}"` : '';

    tile.innerHTML = `
      <div>
        <div style="font-weight:700; font-size:16px; margin-bottom:4px;">${b.name}</div>
        <div class="mini ${useMuted}" ${mutedInline}>Lvl: ${lvl}${busyText}</div>
      </div>
      <div style="text-align:right;">
        <div class="mini ${useMuted}" ${mutedInline}>/h</div>
        <div style="font-weight:700;">${Number(perHour).toLocaleString('cs-CZ')}</div>
        ${b.output ? `<div class="mini ${useMuted}" ${mutedInline}>${b.output}</div>` : ''}
      </div>
    `;

    if (window.__selectedBuildingId === b.id){
      tile.style.outline = '2px solid rgba(205, 181, 125, .9)';
      tile.style.boxShadow = '0 0 8px rgba(205,181,125,.6)';
    }

    grid.appendChild(tile);
  });

  // klik na kartu → otevři detail
  grid.onclick = (e) => {
    const btn = e.target.closest('[data-bid]');
    if (!btn) return;
    const id = btn.getAttribute('data-bid');
    const b = buildings.find(x => x.id === id);
    if (!b) return;
    window.__selectedBuildingId = id;
    ensureBudovyLayout();
    renderDetail(b);
    renderBuildings(buildings); // refresh zvýraznění
  };
}
