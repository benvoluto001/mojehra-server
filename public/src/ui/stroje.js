// src/ui/stroje.js
// Stránka „Výroba“: kategorie + výroba
// - Energie: stávající stroje (Ankarit, Pulzar, …)
// - Jídlo: nové recepty (výrobky se ukládají do state.machines a NEvystupují v levém panelu surovin)

import { state, save } from '../state.js';

// ─────────── registr strojů ───────────
let _machines = [];
export function registerMachines(list){
  _machines = Array.isArray(list) ? list : [];
}

// sekundový tik – volá loop
export function tickStroje(){
  _machines.forEach(m => m.tick?.());
}

// re-render jen když je karta aktivní
export function rerenderStrojeIfActive(){
  const page = document.getElementById('page-predmety');
  if (page?.classList.contains('active')) renderStroje();
}

// ─────────── UI – kategorie ───────────
const CATEGORIES = [
  { key: 'jidlo',   label: 'Jídlo' },
  { key: 'elixiry', label: 'Elixíry' },
  { key: 'zbrane',  label: 'Zbraně' },   // ⬅ přidej
  { key: 'energie', label: 'Energie' },
  { key: 'vypravy', label: 'Výpravy' },
  { key: 'nastroje',label: 'Nástroje' },
];


function getCat(){ return window.__vyrobaCategory || 'jidlo'; }
function setCat(key){ window.__vyrobaCategory = key; }

// util
const s   = (n) => `${Math.max(0, Math.ceil(n || 0))}s`;
const fmt = (n) => Number(n ?? 0).toLocaleString('cs-CZ');
function isMachineKey(key){ return key in (state.machines || {}); }
function have(key){
  return isMachineKey(key) ? Number(state.machines[key] || 0)
                           : Number(state.resources[key] || 0);
}

// vstupní paměť, ať při přepínání kategorií zůstane hodnota
const _qtyMem = new Map();
let _typing = false;

// ─────────── společný renderer seznamu pro zadanou kategorii ───────────
function renderMachinesListFor(category){
  const page = document.getElementById('page-predmety');
  if (!page) return;

  const boxId = `machines-list-${category}`;
  const hostHTML = `<div id="${boxId}"></div>`;
  const body = document.getElementById('vyroba-body');
  body.innerHTML = hostHTML;

  const box = document.getElementById(boxId);
  if (!box) return;

  // zapamatuj zadané hodnoty před přepsáním DOM
  document.querySelectorAll(`#${boxId} input[data-qty-for]`)?.forEach(inp => {
    _qtyMem.set(inp.dataset.qtyFor, inp.value);
  });

  // focus handlery proti „blikání“
  const host = page;
  if (!host.__typingWired){
    host.addEventListener('focusin', (e) => {
      if (e.target?.matches?.('input[data-qty-for]')) _typing = true;
    });
    host.addEventListener('focusout', (e) => {
      if (e.target?.matches?.('input[data-qty-for]')) _typing = false;
    });
    host.__typingWired = true;
  }

  box.innerHTML = '';

  const list = _machines.filter(m => (m.category || 'energie') === category);
  if (!list.length){
    box.innerHTML = `<div class="muted">V této kategorii zatím nejsou žádné recepty.</div>`;
    return;
  }

  list.forEach(m => {
    const maxMake = m.maxCraftable?.() ?? 0;
    const remembered = _qtyMem.get(m.id);
    let initVal = remembered != null ? Number(remembered) : (maxMake > 0 ? 1 : 0);
    if (Number.isNaN(initVal)) initVal = (maxMake > 0 ? 1 : 0);
    initVal = Math.max(0, Math.min(initVal, Math.max(0, maxMake)));

    const costList = Object.entries(m.unitCost || {}).map(([k,v]) => {
      const h = have(k);
      const ok = h >= v;
      const need = Math.max(0, v - h);
      return `<li>${ok ? '✅' : '❌'} ${k} — 1 ks stojí ${fmt(v)} ${ok ? '(splněno)' : '(chybí ' + fmt(need) + ')'}</li>`;
    }).join('');

    const progress =
    
      m.queue > 0
        ? `
          <div class="muted" style="margin-top:6px;">
            Výroba běží: ve frontě ${fmt(m.queue)} ks • zbývá u aktuálního kusu ${s(m.remaining)}
          </div>
          <div class="progress"><div class="bar" style="width:${Math.round(100 * (1 - (m.remaining / m.unitTime)))}%"></div></div>
        `
        : '';
  const effNote = (typeof m.effectNote === 'function' ? m.effectNote() : '') || '';

    const row = document.createElement('div');
    row.className = 'building';
      row.innerHTML = `
    <h3>${m.name}</h3>
    <div class="muted">Doba výroby 1 ks: ${s(m.unitTime)}</div>
    <div class="muted">Mám: <b>${fmt(state.machines?.[m.id] || 0)}</b> ks</div>

    ${effNote ? `<div class="mini muted" style="margin-top:6px;">🧪 Účinek: ${effNote}</div>` : ''}

    <div class="mini" style="margin-top:6px;">Vstupy (na 1 ks):</div>
    <ul style="margin:4px 0 0 16px; padding-left:18px;">${costList || '<li>—</li>'}</ul>

    ${progress}


            ${progress}

      <div class="row" style="margin-top:8px; gap:8px; align-items:center; flex-wrap:wrap;">
        <label class="muted">Kolik kusů:
          <input type="number"
                 min="${maxMake ? 1 : 0}" max="${maxMake}" step="1"
                 value="${initVal}" data-qty-for="${m.id}">
        </label>
        <button class="btn" data-make="${m.id}">Vyrobit</button>
        <span class="muted">Hotovo: <b>${fmt(state.machines?.[m.id] || 0)}</b> ks</span>
        ${typeof m.useOne === 'function'
          ? `<button class="btn" data-use="${m.id}" ${(state.machines?.[m.id]||0)>0?'':'disabled'}>Použít 1 ks</button>`
          : ''
        }
      </div>

    `;
    box.appendChild(row);
  });

  // Akce „Vyrobit“
    box.onclick = (e) => {
    const makeBtn = e.target.closest('button[data-make]');
    if (makeBtn){
      const id = makeBtn.dataset.make;
      const m  = _machines.find(x => x.id === id);
      const inp = box.querySelector(`input[data-qty-for="${id}"]`);
      const qty = Math.max(0, Math.floor(Number(inp?.value || 0)));
      if (m && qty>0 && m.startCraft(qty)){ save?.(); renderMachinesListFor(category); }
      return;
    }
    const useBtn = e.target.closest('button[data-use]');
    if (useBtn){
      const id = useBtn.dataset.use;
      const m  = _machines.find(x => x.id === id);
      if (m?.useOne?.()){ save?.(); renderMachinesListFor(category); }
    }
  };

}

// ─────────── stránka Výroba ───────────
export function renderStroje(){
  const page = document.getElementById('page-predmety');
  if (!page) return;

  page.innerHTML = `
    <section class="card">
      <h2>Výroba</h2>
      <div class="tabs" id="vyroba-tabs" style="margin:8px 0 12px;"></div>
      <div id="vyroba-body"></div>
    </section>
  `;

  // tabs
  const tabs = document.getElementById('vyroba-tabs');
  const active = getCat();
  tabs.innerHTML = CATEGORIES.map(c => `
    <button class="${c.key===active?'active':''}" data-cat="${c.key}">
      ${c.label}
    </button>
  `).join('');
  tabs.onclick = (e) => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    setCat(b.dataset.cat);
    renderStroje();
  };

  // tělo – vyrenderuj vybranou kategorii
  renderMachinesListFor(getCat());


  const box = document.getElementById('machines-list');
  box.innerHTML = '';

  // delegace akcí (Vyrobit / Použít)
  if (!box.__bound){
    box.addEventListener('click', (e) => {
      const btnMake = e.target.closest('button[data-make]');
      if (btnMake){
        const id = btnMake.dataset.make;
        const m  = _machines.find(x => x.id === id);
        const input = box.querySelector(`input[data-qty-for="${id}"]`);
        const qty = Number(input?.value || 0);
        if (m?.startCraft(qty)) { save?.(); renderStroje(); }
        return;
      }
      const btnUse = e.target.closest('button[data-use]');
      if (btnUse){
        const id = btnUse.dataset.use;
        const m  = _machines.find(x => x.id === id);
        if (m?.useOne?.()){
          save?.(); renderStroje();
        }
      }
    });
    box.__bound = true;
  }

  const fmt = (n) => Number(n ?? 0).toLocaleString('cs-CZ');
  const haveKey = (k) => (k in (state.machines||{})) ? Number(state.machines[k]||0) : Number(state.resources[k]||0);

  _machines.forEach(m => {
    const maxMake = Math.max(0, m.maxCraftable?.() ?? 0);
    const remembered = _qtyMem.get(m.id);
    let initVal = remembered != null ? Number(remembered) : (maxMake > 0 ? 1 : 0);
    if (Number.isNaN(initVal)) initVal = (maxMake > 0 ? 1 : 0);
    initVal = Math.max(0, Math.min(initVal, maxMake));

    const costList = Object.entries(m.unitCost||{}).map(([k,v]) => {
      const h = haveKey(k);
      const ok = h >= v;
      const need = Math.max(0, v - h);
      return `<li>${ok ? '✅' : '❌'} ${k} — 1 ks stojí ${fmt(v)} ${ok ? '(OK)' : '(chybí ' + fmt(need) + ')'}</li>`;
    }).join('');

    // sklad (vpravo) – množství hotových kusů
    const haveMade = Number(state.machines?.[m.id] || 0);
    const canUse = typeof m.useOne === 'function' && haveMade > 0;

    const note = m.requirementsNote?.() || '';
    const effNote = m.effectNote?.() || '';

    const div = document.createElement('div');
    div.className = 'building';
    div.innerHTML = `
      <h3>${m.name}</h3>
      ${note ? `<div class="mini muted">${note}</div>` : ''}
      <ul class="req-list">${costList || '<li>Bez nákladů</li>'}</ul>

      <div class="row" style="gap:8px;align-items:flex-end;">
        <label style="display:flex;flex-direction:column;gap:4px;">Vyrobit
          <input type="number" min="0" step="1" value="${initVal}" data-qty-for="${m.id}" style="width:110px;">
        </label>
        <button class="btn" data-make="${m.id}" ${maxMake<=0?'disabled':''}>Vyrobit</button>
        <div class="mini muted">Ve frontě: ${m.queue||0} ks ${m.queue>0?`(zbývá ${Math.ceil(m.remaining||0)}s)`:''}</div>
      </div>

      <div class="row" style="gap:8px; margin-top:6px;">
        <div class="mini">Mám hotovo: <b>${fmt(haveMade)} ks</b></div>
        ${typeof m.useOne === 'function' ? `<button class="btn" data-use="${m.id}" ${canUse?'':'disabled'}>Použít 1 ks</button>` : ''}
      </div>
      ${effNote ? `<div class="mini muted" style="margin-top:4px;">${effNote}</div>` : ''}
      <hr style="opacity:.15;margin:10px 0;">
    `;
    box.appendChild(div);
  });
}

