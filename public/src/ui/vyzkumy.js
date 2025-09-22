// src/ui/vyzkumy.js
import { state } from '../state.js';

const S = (n)=> `${Math.max(0, Math.ceil(Number(n)||0))}s`;

function getImg(cfg){
  return (window.RESEARCH_IMAGES?.[cfg.id]) || `./src/ui/obrazky/vyzkumy/${cfg.id}.png`;
}
function getDuration(cfg, lvl){
  if (typeof cfg.getResearchTime === 'function') return Math.ceil(Number(cfg.getResearchTime(lvl) || 0));
  const base = cfg.baseTime || 10;
  const fac  = cfg.timeFactor ?? 1.45;
  return Math.ceil(base * Math.pow(fac, lvl));
}
function getCost(cfg, lvl){
  if (typeof window.__getResearchCost === 'function'){
    try{ return window.__getResearchCost(cfg, lvl); }catch(_){}
  }
  const base = cfg.cost || {};
  const fac  = (cfg.costFactor ?? 1.4);
  const out  = {};
  for (const [k,v] of Object.entries(base)) out[k] = Math.ceil((Number(v)||0) * Math.pow(fac, lvl));
  return out;
}
function costStr(obj){
  if (!obj || typeof obj !== 'object') return '—';
  return Object.entries(obj).map(([k,v]) => `${(Number(v)||0).toLocaleString('cs-CZ')} ${k}`).join(', ') || '—';
}
// --- požadavky/cena/start ---
function reqsOf(cfg){
  const b = cfg.buildingReq || cfg.requirements?.buildings || {};
  const r = cfg.researchReq || cfg.requirements?.research  || {};
  return { b, r };
}
function haveReqs({b,r}){
  for (const [id,l] of Object.entries(b)) if ((state.buildings?.[id]?.level||0) < l) return false;
  for (const [id,l] of Object.entries(r)) if ((state.research?.[id]?.level ||0) < l) return false;
  return true;
}
function hasResources(cost){
  return Object.entries(cost||{}).every(([k,v]) => (state.resources?.[k]||0) >= (Number(v)||0));
}
function canStartResearch(cfg){
  const R = state.research?.[cfg.id] || {};
  if ((R.action === 'upgrade') && (R.remaining > 0)) return false;
  const lvl  = R.level|0;
  const cost = getCost(cfg, lvl);
  return haveReqs(reqsOf(cfg)) && hasResources(cost);
}
function startResearch(cfg){
  const R   = state.research?.[cfg.id] || (state.research[cfg.id] = { level:0 });
  const lvl = R.level|0;
  const cost= getCost(cfg, lvl);
  // zaplať
  for (const [k,v] of Object.entries(cost||{})){
    state.resources[k] = Math.max(0, (Number(state.resources[k]||0) - Number(v||0)));
  }
  // spusť
  R.action    = 'upgrade';
  R.remaining = getDuration(cfg, lvl);
}


export function renderVyzkumy(){
  const page = document.getElementById('page-vyzkumy');
  if (!page) return;
  const grid = page.querySelector('#research-grid');
  const box  = page.querySelector('#research-detail-box');
  if (!grid || !box) return;

  const list = (window.__RESEARCH_LIST__) || window.RESEARCHES || [];
  grid.innerHTML = '';

  list.forEach(cfg => {
    const R   = state.research?.[cfg.id] || {};
    const lvl = R.level|0;
const busy   = (R.action === 'upgrade') && (R.remaining > 0);
const total  = getDuration(cfg, lvl);
const remain = busy ? (R.remaining|0) : 0;
const pct    = busy ? Math.max(0, Math.min(100, Math.round(100*(1 - remain/total)))) : 0;
const can    = canStartResearch(cfg);
const locked = !can && !busy;

const card = document.createElement('button');
card.type = 'button';
card.className = 'card research-card' + (locked ? ' locked' : '');

   
  
    card.dataset.rid = cfg.id;
    card.innerHTML = `
      <div class="tile-bg" style="background-image:
        linear-gradient(to bottom right, rgba(25,25,30,.55), rgba(25,25,30,.55)),
        url('${getImg(cfg)}')"></div>
      <div class="tile-content" style="padding:12px;">
        <div class="row" style="display:flex;justify-content:space-between;gap:8px;">
          <h3 style="margin:0;">${cfg.name || cfg.id}</h3>
          <span class="level">Lvl: ${lvl}</span>
        </div>

      ${busy ? `
  <div class="progress" data-role="bar"><div class="bar" style="width:${pct}%"></div></div>
  <div class="mini muted" data-role="time" style="margin-top:4px;text-align:right;">Zkoumání — zbývá ${S(remain)}</div>
` : `<div class="mini muted" style="margin-top:8px;">${locked ? 'Nelze zkoumat' : 'Připraveno k výzkumu'}</div>`}
 
        </div>
    `;
    card.addEventListener('click', ()=>{
      window.__selectedResearchId = cfg.id;
      renderResearchDetail(cfg.id);
      [...grid.children].forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
    });
    grid.appendChild(card);
  });

  // auto select + vykresli detail
  const want = window.__selectedResearchId || ( (window.__RESEARCH_LIST__||[])[0]?.id );
  if (want){
    window.__selectedResearchId = want;
    renderResearchDetail(want);
    const idx = (window.__RESEARCH_LIST__||[]).findIndex(x=>x.id===want);
    if (grid.children[idx]) grid.children[idx].classList.add('selected');
  }

  // živý updater (1×/s)
  startResearchUIUpdater();
}

function startResearchUIUpdater(){
  if (window.__researchUiTimer) clearInterval(window.__researchUiTimer);
  window.__researchUiTimer = setInterval(()=>{
    const page = document.getElementById('page-vyzkumy');
    if (!page || !page.classList.contains('active')) return;

    // aktualizace kartiček vlevo
    const grid = page.querySelector('#research-grid');
    if (grid){
      [...grid.children].forEach(card=>{
        const rid = card.dataset.rid;
        const cfg = (window.__RESEARCH_LIST__||[]).find(x=>x.id===rid);
        const R   = state.research?.[rid] || {};
        const lvl = R.level|0;
        const busy   = (R.action === 'upgrade') && (R.remaining > 0);
        const total  = getDuration(cfg, lvl);
        const remain = busy ? (R.remaining|0) : 0;
        const pct    = busy ? Math.max(0, Math.min(100, Math.round(100*(1 - remain/total)))) : 0;

        const bar = card.querySelector('.progress .bar');
        const tEl = card.querySelector('[data-role="time"]');
        const lEl = card.querySelector('.level');
        if (lEl) lEl.textContent = `Lvl: ${lvl}`;
        if (bar) bar.style.width = pct + '%';
        if (tEl) tEl.textContent = `Zkoumání — zbývá ${S(remain)}`;
      });
    }

    // aktualizace detailu vpravo
    if (window.__selectedResearchId){
      renderResearchDetail(window.__selectedResearchId, true); // lean = pouze živé části
    }
  }, 1000);
}

export function renderResearchDetail(rid, lean=false){
  const page = document.getElementById('page-vyzkumy');
  const box  = page?.querySelector('#research-detail-box');
  if (!box) return;

  const list = (window.__RESEARCH_LIST__) || window.RESEARCHES || [];
  const cfg  = list.find(x=>x.id === rid);
  if (!cfg){
    box.innerHTML = `<div class="muted">Výzkum nenalezen.</div>`;
    return;
  }

  const R      = state.research?.[cfg.id] || {};
  const lvl    = R.level|0;
  const busy   = (R.action === 'upgrade') && (R.remaining > 0);
  const total  = getDuration(cfg, lvl);
  const remain = busy ? (R.remaining|0) : 0;
  const pct    = busy ? Math.max(0, Math.min(100, Math.round(100*(1 - remain/total)))) : 0;
  const cost   = getCost(cfg, lvl);
  const img    = getImg(cfg);

  // lean update (bez překreslení celé šablony)
  if (lean && box.dataset.rid === rid){
    const bar = box.querySelector('.progress .bar');
    const t1  = box.querySelector('[data-role="time1"]');
    const t2  = box.querySelector('[data-role="time2"]');
    const lvlEl = box.querySelector('[data-role="lvl"]');
    const costEl= box.querySelector('[data-role="cost"]');

    if (bar)    bar.style.width = pct + '%';
    if (t1)     t1.textContent = busy ? `Zbývá ${S(remain)} z ${S(total)}` : '';
    if (t2)     t2.textContent = S(total);
    if (lvlEl)  lvlEl.textContent = `Úroveň: ${lvl}${busy ? ` • právě probíhá zkoumání (${S(remain)})` : ''}`;
    if (costEl) costEl.innerHTML  = `<b>${costStr(cost)}</b>`;
    const btn = box.querySelector('#btn-research');
if (btn){
  const can = canStartResearch(cfg);
  btn.disabled = busy || !can;
  btn.textContent = busy ? 'Zkoumá se…' : 'Zkoumat';
}

    return;
  }

  // plné vykreslení
  box.dataset.rid = rid;
  box.innerHTML = `
  

    <div class="detail-img square" style="background-image:
      linear-gradient(to bottom right, rgba(25,25,30,.25), rgba(25,25,30,.3)),
      url('${img}')"></div>

    <h3 style="margin-top:8px;">${cfg.name || cfg.id}</h3>
    <div class="mini" data-role="lvl">Úroveň: ${lvl}${busy ? ` • právě probíhá zkoumání (${S(remain)})` : ''}</div>

    ${busy ? `
      <div class="progress" style="margin-top:8px;">
        <div class="bar" style="width:${pct}%"></div>
      </div>
      <div class="mini muted" style="margin-top:4px; text-align:right;" data-role="time1">
        Zbývá ${S(remain)} z ${S(total)}
      </div>
    ` : ''}

    <h4 style="margin-top:12px;">Akce</h4>
    <div class="mini">Doba dalšího levelu: <span data-role="time2">${S(total)}</span></div>
    <div class="mini">Cena upgradu: <span data-role="cost"><b>${costStr(cost)}</b></span></div>
    <button id="btn-research" class="btn"${busy || !canStartResearch(cfg) ? ' disabled' : ''}>
    ${busy ? 'Zkoumá se…' : 'Zkoumat'}
  </button>
`;

const btn = box.querySelector('#btn-research');
btn?.addEventListener('click', () => {
  if (btn.disabled) return;        // nic pokud je zamčeno
  startResearch(cfg);              // odečti cenu + spusť akci
  window.save?.();                 // (volitelné) hned ulož
  renderResearchDetail(cfg.id);    // obnov detail (ukáže progress)
});

}


