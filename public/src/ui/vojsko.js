// vojsko.js
 import { state, save } from '../state.js';
 import { UNIT_TYPES } from '../vojsko/units.js';


const fmt = (n) => Number(n ?? 0).toLocaleString('cs-CZ');

// trénink 1 jednotky = 20 s (zatím jednotné)
const TRAIN_TIME = 20;

// ===== Ticking: posun tréninku =====
export function tickVojsko(){
  const V = state.units || {};
  for (const [id, u] of Object.entries(V)){
    if (u.queue > 0){
      u.remaining = (u.remaining || TRAIN_TIME) - 1;
      if (u.remaining <= 0){
        u.remaining = TRAIN_TIME;
        u.queue--;
        u.count = (u.count||0) + 1;
      }
    }
  }
}

// ===== UI: překresli jen když je karta aktivní =====
export function rerenderVojskoIfActive(){
  const page = document.getElementById('page-vojsko');
  if (page?.classList.contains('active')) renderVojsko();
}

// ===== UI: vykreslení stránky =====
export function renderVojsko(){
  const page = document.getElementById('page-vojsko');
  if (!page) return;

  page.innerHTML = `
    <section class="card">
      <h2>Vojsko</h2>
      <div id="units-list"></div>
    </section>
  `;

  const list = document.getElementById('units-list');
  list.innerHTML = '';

  const V = state.units = state.units || {};

  UNIT_TYPES.forEach(cfg => {
    const id = cfg.id;
    if (!V[id]){
      V[id] = { count: 0, queue: 0, remaining: TRAIN_TIME };
    }
    const u = V[id];

    const div = document.createElement('div');
    div.className = 'building';
    div.innerHTML = `
      <h3>${cfg.short} <span class="muted">(lvl ${u.level||1})</span></h3>
      <div class="muted">${cfg.desc}</div>
      <div class="muted">Mám: ${fmt(u.count)} ks</div>
      ${u.queue>0 ? `<div class="muted">Ve výcviku: ${u.queue} ks (zbývá ${u.remaining}s)</div>`:''}
      <div class="row" style="margin-top:6px; gap:6px;">
        <button class="btn" data-train="${id}">Trénovat</button>
      </div>
    `;
    list.appendChild(div);
  });

  list.onclick = (e) => {
    const btn = e.target.closest('button[data-train]');
    if (!btn) return;
    const id = btn.dataset.train;
    const u = state.units[id];
    if (!u) return;
    u.queue++;
    save?.();
    renderVojsko();
  };
}
