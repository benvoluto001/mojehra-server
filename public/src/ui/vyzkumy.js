// src/ui/vyzkumy.js
import { state, canPay, pay, save, getResearchDuration, startResearch } from '../state.js';
import { RESEARCHES, getResearchCost } from '../research/index.js';

// 1) Lokální fallback obrázků (primárně bereme window.RESEARCH_IMAGES z main.js)
const RESEARCH_IMAGES_FALLBACK = {
  VDrevo:               'src/ui/obrazky/vyzkumy/VDrevo.png',
  VKamen:               'src/ui/obrazky/vyzkumy/VKamen.png',
  VArtefakty:           'src/ui/obrazky/vyzkumy/VArtefakty.png',
  VZariciFragmenty:     'src/ui/obrazky/vyzkumy/VZariciFragmenty.png',
  VPokrocileNastroje:   'src/ui/obrazky/vyzkumy/VPokrocileNastroje.png',
  VKrystalografie:      'src/ui/obrazky/vyzkumy/VKrystalografie.png',
  VOkoPoutnika:         'src/ui/obrazky/vyzkumy/VOkoPoutnika.png', // ⬅ DOPLNĚNO
};
const RESEARCH_IMG_DEFAULT = 'src/ui/obrazky/vyzkumy/_default.png';

const s   = (n) => `${Math.max(0, Math.ceil(Number(n)||0))}s`;
const fmt = (n) => Number(n ?? 0).toLocaleString('cs-CZ');

// --- Pomocné ---
function getStateEntry(id){
  const r = state.research?.[id];
  return r || { level: 0, action: null, remaining: 0, baseTime: 10, timeFactor: 1.45 };
}
function isRunning(r){ return r?.action === 'upgrade' && (r?.remaining || 0) > 0; }

function shorten(text, max){
  const t = String(text || '');
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

// požadavky (pokud jsou uvedené na konfiguraci výzkumu)
function meetsReqByCfg(cfg){
  if (!cfg) return true;
  // researchReq: { id: level }
  if (cfg.researchReq){
    for (const [rid, need] of Object.entries(cfg.researchReq)){
      const cur = state.research?.[rid]?.level || 0;
      if (cur < (need|0)) return false;
    }
  }
  // buildingReq: { id: level } – volitelně
  if (cfg.buildingReq){
    const bmap = Object.fromEntries((window.__allBuildings || []).map(b => [b.id, b]));
    for (const [bid, need] of Object.entries(cfg.buildingReq)){
      const cur = bmap[bid]?.level || 0;
      const built = !!bmap[bid]?.isBuilt;
      if (!built || cur < (need|0)) return false;
    }
  }
  return true;
}

function imgFor(id){
  // priorita: window.RESEARCH_IMAGES (main.js) → lokální fallback → default
  const g = (window.RESEARCH_IMAGES && window.RESEARCH_IMAGES[id]) || null;
  if (g) return g;
  return RESEARCH_IMAGES_FALLBACK[id] || RESEARCH_IMG_DEFAULT;
}

// === DETAIL PANEL ===
export function renderResearchDetail(id){
  const box = document.getElementById('research-detail');
  if (!box) return;

  const cfg = RESEARCHES.find(x => x.id === id) || null;
  if (!cfg){
    box.innerHTML = `<h3>Detail</h3><div class="muted">Výzkum nenalezen.</div>`;
    return;
  }
  const r   = getStateEntry(id);
  const lv  = r.level || 0;
  const run = isRunning(r);

  const costNext = getResearchCost(cfg, lv);
  const canAff   = canPay(costNext);
  const reqOK    = meetsReqByCfg(cfg);
  const locked   = !run && (!canAff || !reqOK);

  const rows = Object.entries(costNext).map(([k,v]) => {
    const have = Number(state.resources?.[k]||0);
    const need = Number(v)||0;
    const ok = have >= need;
    return `<li>${ok ? '✅' : '❌'} ${k} — ${ok ? 'splněno' : 'chybí ' + fmt(need - have)}</li>`;
  }).join('');

  const img = imgFor(cfg.id);

 box.innerHTML = `
  <h3>${cfg.name}</h3>

    <!-- Obrázek nahoře – ČTVEREC, ostrý -->
  <img
    src="${img}"
    alt="${cfg.name}"
    class="research-detail-img"
    style="
      display:block;
      width:100%;
      aspect-ratio:1/1;
      object-fit:cover;
      border-radius:12px;
      margin:8px 0 10px;
      image-rendering:auto;
    "
  />



  <div class="mini">Úroveň: ${lv}${run ? ` • probíhá výzkum (${s(r.remaining)})` : ''}</div>

  <div class="muted" style="margin:8px 0;">${cfg.desc || ''}</div>

  <div class="mini muted">Cena další úrovně:</div>
  <ul style="margin:4px 0 0 16px; padding-left:18px;">${rows || '<li>—</li>'}</ul>

  <div class="mini muted" style="margin-top:8px;">Doba výzkumu:</div>
  <div>${s(getResearchDuration(r))}</div>

  <button id="btn-research" class="btn" ${locked ? 'disabled' : ''} style="margin-top:10px;">
    ${run ? 'Probíhá…' : 'Zkoumat'}
  </button>
`;


  // akce
  const btn = box.querySelector('#btn-research');
  if (btn){
    btn.onclick = () => {
      if (run) return;
      const ok = startResearch(cfg.id);
      if (!ok) return;
      save?.();
      renderVyzkumy();
      renderResearchDetail(cfg.id);
    };
  }
  // ulož pro loop (živé odpočítávání)
  window.__selectedResearchId = id;
  window.renderResearchDetail = renderResearchDetail;
}

// === HLAVNÍ MŘÍŽKA ===
export function renderVyzkumy(){
  const page = document.getElementById('page-vyzkumy');
  if (!page) return;

  // lazynastavení rozložení (mřížka + prázdný detail)
  if (!document.getElementById('research-grid')){
    page.innerHTML = `
      <div id="research-grid"></div>
      <section class="card" id="research-detail">
        <h3>Detail</h3>
        <div class="muted">Klikni vlevo na výzkum.</div>
      </section>
    `;
  }

  const grid = document.getElementById('research-grid');
  grid.innerHTML = '';

  const selectedId = window.__selectedResearchId || null;

  RESEARCHES.forEach(cfg => {
    const r  = getStateEntry(cfg.id);
    const lv = r.level || 0;
    const run = isRunning(r);
    const dur = getResearchDuration(r);

    const costObj   = getResearchCost(cfg, lv);
    const canAfford = canPay(costObj);
    const reqOK     = meetsReqByCfg(cfg);
    const locked    = !run && (!canAfford || !reqOK);

    const imgUrl = imgFor(cfg.id);
    const desc   = shorten(cfg.desc || '', 100);

    const tile = document.createElement('button');
    tile.className = 'card research-card';
    tile.setAttribute('data-rid', cfg.id);
    if (locked) tile.classList.add('locked');
    if (cfg.id === selectedId) tile.classList.add('selected');

    tile.innerHTML = `
      <div class="tile-bg" style="background-image:url('${imgUrl}')"></div>
      <div class="tile-content">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <div style="font-weight:800; font-size:16px; margin-bottom:4px;">${cfg.name}</div>
            <div class="muted" style="font-size:13px;">${desc}</div>
          </div>
          <div class="level">Lvl ${lv}</div>
        </div>
        <div class="mini muted" style="margin-top:8px;">další lvl: ${s(dur)}</div>
      </div>
    `;

    grid.appendChild(tile);
  });

  // delegovaný click → otevřít detail
  if (!grid.dataset.bound){
    grid.addEventListener('click', (e) => {
      const tile = e.target.closest('.research-card[data-rid]');
      if (!tile) return;
      const rid = tile.getAttribute('data-rid');
      window.__selectedResearchId = rid;

      // vizuální zvýraznění vybrané karty
      grid.querySelectorAll('.research-card.selected').forEach(n => n.classList.remove('selected'));
      tile.classList.add('selected');

      renderResearchDetail(rid);
    });
    grid.dataset.bound = '1';
  }

  // pokud už je vybráno, obnov detail (kvůli odpočtu)
  if (selectedId) renderResearchDetail(selectedId);
}
