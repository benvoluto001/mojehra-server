// src/ui/render.js

// ── formátování čísel/času ─────────────────────────────────────────────────────
const fmtInt = (n) => Math.floor(Number(n) || 0).toLocaleString('cs-CZ');
const fmt    = (n) => Number(n ?? 0).toLocaleString('cs-CZ');
const s      = (n) => `${Math.max(0, Math.ceil(Number(n) || 0))}s`;

// ── stav / importy ─────────────────────────────────────────────────────────────
import { state, save } from '../state.js';
import { getBuildingRate } from '../state.js';
// --- helpery jen pro výzkumy (nepřepisují nic existujícího) ---
const formatSec = (n)=> `${Math.max(0, Math.ceil(Number(n)||0))}s`;
const H = 3600;
function getResearchTimeAt(r, level){
  if (typeof r.getResearchTime === 'function') return Math.ceil(Number(r.getResearchTime(level) || 0));
  return Math.ceil(Number(r.researchTime || 0));
}
function fmtCostObj(obj){
  if (!obj) return '';
  return Object.entries(obj).map(([k,v]) => `${k} ${Number(v).toLocaleString('cs-CZ')}`).join(', ');
}



// === Pomocníci pro výpočet produkce/časů z budovy ===
const HOUR = 3600;
function getRatePerHourAt(b, level){
  if (typeof b.ratePerHour === 'function')    return Number(b.ratePerHour(level) || 0);
  if (typeof b._prodPerHour === 'function')   return Number(b._prodPerHour(level) || 0);
  if (typeof b.getRatePerHour === 'function') return Number(b.getRatePerHour(level) || 0);
  const L = Number(level || b.level || 1);
  return Number(b.baseRate || 0) * Math.max(1, L);
}
function getUpgradeTimeAt(b, level){
  if (typeof b.getUpgradeTime === 'function') return Math.ceil(Number(b.getUpgradeTime(level) || 0));
  return Math.ceil(Number(b.upgradeTime || 0));
}



// Cesta k obrázkům budov (v public/…)
const BUILDING_IMAGE_BASE = './src/ui/obrazky';

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
  // aktuální produkce /h (během upgradu jede starý lvl)
const producesNow = b.isBuilt && (!b.isBusy?.() || b.action === 'upgrade');
const rateNowH = producesNow ? getRatePerHourAt(b, b.level) : 0;


  // stav & ceny
  const canBuild  = !b.isBuilt && b.canStartBuild?.(all);
  const canUpg    =  b.isBuilt && b.canStartUpgrade?.();

  const buildCostObj   = b.buildCost || {};
  const upgradeCostObj = (b.getUpgradeCost ? b.getUpgradeCost() : {}) || {};

  const costBuild = Object.entries(buildCostObj).map(([k,v]) => `${fmtInt(v)} ${k}`).join(', ') || '—';
  const costUpg   = Object.entries(upgradeCostObj).map(([k,v]) => `${fmtInt(v)} ${k}`).join(', ') || '—';

 


  const L = b.level || 1;
const rows = Array.from({length:10}, (_,i) => {
  const next = L + i + 1;
  const curH  = getRatePerHourAt(b, L);
  const nextH = getRatePerHourAt(b, next);
  const incH  = Math.max(0, nextH - curH);
  return `<tr>
    <td>Lvl ${next}</td>
    <td>+${fmt(incH)}/h</td>
    <td>${fmt(nextH)}/h</td>
  </tr>`;
}).join('');



  // Požadavky (budovy + výzkumy) – umístěno hned pod nadpis a úroveň
  const reqHTML = renderReqHTML(b, state);

  const lvlShown = b.isBuilt ? b.level : 0;
const imgKey = b.imageKey || b.id || '';
const busyText = (b.isBusy?.())
  ? ' • právě probíhá ' + (b.action === 'build' ? 'stavba' : 'vylepšení') + ' (' + s(b.remaining) + ')'
  : '';

  
  // MARKUP ve stejném duchu jako výzkumy:
  // Nadpis → Úroveň → Požadavky → Akce (cena, doba, tlačítko) → Aktuální produkce → Projekce → Statistika
  box.innerHTML = `
        <h3>${b.name}</h3>
    <div class="detail-hero hero-square" style="background-image:
      linear-gradient(to bottom right, rgba(25,25,30,.25), rgba(25,25,30,.3)),
      url('./src/ui/obrazky/${imgKey}.png')
    "></div>

    <div class="mini">Úroveň: ${lvlShown}${busyText}</div>


    
    ${reqHTML}

    <h4>Akce</h4>
    <div class="mini">
  ${b.isBuilt ? 'Doba vylepšení' : 'Doba stavby'}:
  ${s(b.isBuilt ? getUpgradeTimeAt(b, b.level) : b.buildTime)}
</div>
<div class="mini">
  ${b.isBuilt ? 'Cena upgradu' : 'Cena stavby'}:
  ${b.isBuilt ? costUpg : costBuild}
</div>


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
           <div class="bar" style="width:${Math.round(100 * (1 - (b.remaining/(b.action==='build' ? b.buildTime : getUpgradeTimeAt(b, b.level))))) }%
"></div>
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
          <td>${fmt(rateNowH / HOUR)}</td>
          <td>${fmt(rateNowH)}</td>
          <td>${fmt(rateNowH * 24)}</td>
          <td>${fmt(rateNowH * 24 * 7)}</td>

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
          <td>${fmt(rateNowH / HOUR)}</td>
          <td>${fmt(rateNowH)}</td>
          <td>${fmt(rateNowH * 24)}</td>
          <td>${fmt(rateNowH * 24 * 7)}</td>
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




// ── DETAIL VÝZKUMU (pravý panel) ─────────────────────────────────────────────
export function renderResearchDetail(rOrId){
  const panel = document.getElementById('research-detail-box');
  if (!panel) return;

  // r může být objekt nebo jen id
  const r = (typeof rOrId === 'string')
    ? (window.__allResearches || []).find(x => x.id === rOrId)
    : rOrId;

  if (!r){
    panel.innerHTML = `<div class="muted">Vyber výzkum vlevo.</div>`;
    return;
  }

  const total  = getResearchTimeAt(r, r.level);
  const busy   = r.isBusy?.();
  const remain = busy ? (r.remaining|0) : 0;
  const pct    = busy ? Math.max(0, Math.min(100, Math.round(100 * (1 - (remain/total))))) : 0;

  const cost = fmtCostObj(
    (typeof r.getNextCost === 'function') ? r.getNextCost()
      : (r.researchCost || r.cost || null)
  ) || '—';

  const imgKey  = r.imageKey || r.id || '';
  const reqHTML = renderReqHTML(r, state);

  panel.innerHTML = `
    <h3>${r.name}</h3>
    <div class="detail-hero" style="background-image:
      linear-gradient(to bottom right, rgba(25,25,30,.25), rgba(25,25,30,.3)),
      url('./src/ui/obrazky/${imgKey}.png')
    "></div>

    <div class="mini">Úroveň: ${r.level|0}${busy ? ` • právě probíhá (${s(remain)})` : ''}</div>

    <h4>Akce</h4>
    <div class="mini">Doba výzkumu: ${s(total)}</div>
    <div class="mini">Cena dalšího levelu: ${cost}</div>

    ${busy ? `
      <div class="progress" style="margin:8px 0;">
        <div class="bar" style="width:${pct}%"></div>
      </div>
      <div class="mini muted" style="margin:-2px 0 8px; text-align:right;">
        Zkoumání — zbývá ${s(remain)}
      </div>
    ` : ''}

    <button id="btn-research" class="btn">${busy ? 'Zkoumá se…' : 'Zkoumat'}</button>

    ${reqHTML ? `<h4 style="margin-top:14px;">Požadavky</h4>${reqHTML}` : ''}
  `;

  panel.querySelector('#btn-research')?.addEventListener('click', ()=>{
    if (busy) return;
    r.startResearch?.();
    save?.();
    renderResearchDetail(r);
  });
}

// pro starší kód, který volá window.renderResearchDetail(rid)
if (typeof window !== 'undefined'){
  window.renderResearchDetail = (rid) => renderResearchDetail(rid);
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

export function renderBuildings(buildingsMaybe){
  const buildings = buildingsMaybe || window.__allBuildings || [];
  const grid = document.getElementById('buildings');
  if (!grid) return;

  grid.innerHTML = '';

  for (const b of buildings){
    const div = document.createElement('div');
    div.className = 'card building';

    // "locked" = nestojí a nesplňuje požadavky
    const canBuild = !b.isBuilt && b.canStartBuild?.(buildings);
    if (!b.isBuilt && !canBuild) div.classList.add('locked');

    // obrázek dlaždice (vezmeme imageKey nebo id)
    const key = b.imageKey || b.id || '';
    const bgStyle = `background-image:
      linear-gradient(to bottom right, rgba(25,25,30,.55), rgba(25,25,30,.55)),
      url('./src/ui/obrazky/${key}.png')`;

    // aktuální rychlost /h (během upgradu jede starý level)
    const producesNow = b.isBuilt && (!b.isBusy?.() || b.action === 'upgrade');
    const ratePerHour = producesNow ? getRatePerHourAt(b, b.level) : 0;

    // vybraná karta
    const selected = (window.__selectedBuildingId && window.__selectedBuildingId === b.id);
    if (selected) div.classList.add('selected');

    div.innerHTML = `
      <div class="tile-bg" style="${bgStyle}"></div>
      <div class="tile-content">
        <div class="row">
          <h3>${b.name}</h3>
          <span class="level">Lvl: ${b.isBuilt ? b.level : 0}</span>
        </div>

        <div class="row">
          <span class="muted">/h</span>
          <b>${Math.floor(ratePerHour).toLocaleString('cs-CZ')}</b>
          <span class="muted">${b.output || ''}</span>
        </div>

        ${b.isBusy?.() ? `
  <div class="progress" style="margin-top:8px; position:relative;">
    <div class="bar" style="width:${Math.round(100 * (1 - (b.remaining/(b.action==='build'?b.buildTime:getUpgradeTimeAt(b, b.level)))))}%"></div>
  </div>
  <div class="mini muted" style="margin-top:4px; text-align:right;">
    ${b.action === 'build' ? 'Stavba' : 'Vylepšení'} — zbývá ${s(b.remaining)}
  </div>
` : ''}

      </div>
    `;

    // klik → ukaž detail a zvýrazni
    div.addEventListener('click', (e)=>{
      e.preventDefault();
      window.__selectedBuildingId = b.id;
      renderDetail(b);
      renderBuildings(buildings);
    });

    grid.appendChild(div);
  }

  // Auto-výběr: poprvé vyber první budovu a zobraz detail
  if (!window.__selectedBuildingId && buildings.length){
    window.__selectedBuildingId = buildings[0].id;
    renderDetail(buildings[0]);
  }else if (window.__selectedBuildingId){
    const sel = buildings.find(x => x.id === window.__selectedBuildingId);
    if (sel) renderDetail(sel);
  }
}
