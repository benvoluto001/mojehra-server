// src/ui/pisari.js
// Dům písařů – zkoumání artefaktů (3 s, náhodný malý bonus, log)

import { state, save } from '../state.js';

// ───────────────────────── Pomocné (lokální canPay/pay) ─────────────────────
function canPay(cost = {}){
  return Object.entries(cost).every(([k,v])=>{
    const have =
      (k in (state.resources||{})) ? (state.resources[k]||0) :
      (k in (state.machines ||{})) ? (state.machines[k] ||0) : 0;
    return have >= v;
  });
}
function pay(cost = {}){
  Object.entries(cost).forEach(([k,v])=>{
    if (k in (state.resources||{})){
      state.resources[k] = Math.max(0, (state.resources[k]||0) - v);
    } else if (k in (state.machines||{})){
      state.machines[k] = Math.max(0, (state.machines[k]||0) - v);
    }
  });
}

// ───────────────────────── Konfigurace a utilitky ────────────────────────────
const DURATION_S = 3;                                // 1 zkoumání = 3 s
const rnd = (n) => Math.floor(Math.random() * n);
const s   = (n) => `${Math.max(0, Math.ceil(n||0))}s`;

// Seznam malých bonusů (kumulují se); hodnoty ~0.04 % atd.
const BONUSES = [
  { id: 'prod_drevo',  label: '+0,04 % produkce dřeva',   apply: s => s.effects.prodByRes['dřevo'] += 0.0004 },
  { id: 'prod_kamen',  label: '+0,04 % produkce kamene',  apply: s => s.effects.prodByRes['kámen'] += 0.0004 },
  { id: 'prod_zelezo', label: '+0,04 % produkce železa',  apply: s => s.effects.prodByRes['železo'] += 0.0004 },
  { id: 'prod_zlato',  label: '+0,04 % produkce zlata',   apply: s => s.effects.prodByRes['zlato'] += 0.0004 },
  { id: 'prod_obili',  label: '+0,04 % produkce obilí',   apply: s => s.effects.prodByRes['obilí'] += 0.0004 },
  { id: 'prod_maso',   label: '+0,04 % produkce masa',    apply: s => s.effects.prodByRes['maso']  += 0.0004 },

  { id: 't_research',  label: '−0,05 % čas výzkumu',       apply: s => s.effects.researchTime -= 0.0005 },
  { id: 't_build',     label: '−0,05 % čas stavby budov',  apply: s => s.effects.buildTime    -= 0.0005 },

  { id: 'cap_store',   label: '+0,03 % kapacita skladiště',apply: s => s.effects.capacity     += 0.0003 },

  // Expedice – připraveno
  { id: 'exp_cargo',   label: '+0,02 % nosnost karavan',         apply: s => s.effects.expCargo     += 0.0002 },
  { id: 'exp_fail',    label: '−0,01 % šance selhání expedice',  apply: s => s.effects.expFail      -= 0.0001 },
  { id: 'exp_common',  label: '+0,05 % šance na běžné suroviny', apply: s => s.effects.expCommon    += 0.0005 },
  { id: 'exp_art',     label: '+0,01 % šance na extra artefakt', apply: s => s.effects.expArtifact  += 0.0001 },
];

// ───────────────────────── Stav a inicializace ───────────────────────────────
function ensurePisariState(){
  if (!state.pisari) state.pisari = { status: 'idle', remaining: 0, startedAt: 0, log: [], total: 0 };
  if (!Array.isArray(state.pisari.log)) state.pisari.log = [];

  if (!state.effects) state.effects = {};
  if (!state.effects.prodByRes)
    state.effects.prodByRes = { 'dřevo':0, 'kámen':0, 'železo':0, 'zlato':0, 'obilí':0, 'maso':0 };

  // globální multiplikátory (aditivně – 0.001 = 0.1 %)
  if (typeof state.effects.researchTime !== 'number') state.effects.researchTime = 0;
  if (typeof state.effects.buildTime    !== 'number') state.effects.buildTime    = 0;
  if (typeof state.effects.capacity     !== 'number') state.effects.capacity     = 0;

  // expedice – připraveno
  if (typeof state.effects.expCargo    !== 'number') state.effects.expCargo    = 0;
  if (typeof state.effects.expFail     !== 'number') state.effects.expFail     = 0;
  if (typeof state.effects.expCommon   !== 'number') state.effects.expCommon   = 0;
  if (typeof state.effects.expArtifact !== 'number') state.effects.expArtifact = 0;

  return state.pisari;
}

function pushLog(txt){
  const p = ensurePisariState();
  const line = `[${new Date().toLocaleTimeString('cs-CZ')}] ${txt}`;
  p.log.unshift(line);
  p.log = p.log.slice(0, 30);
}

// ───────────────────────── Běh časovače ──────────────────────────────────────
let _timer = null;
function startTimer(){ if (_timer) clearInterval(_timer); _timer = setInterval(tick, 200); }
function stopTimer(){ if (_timer){ clearInterval(_timer); _timer = null; } }

function finish(){
  const p = ensurePisariState();
  if (p.status !== 'running') return;

  const chosen = BONUSES[rnd(BONUSES.length)];
  chosen.apply(state);

  p.total = (p.total || 0) + 1;
  p.status = 'idle';
  p.remaining = 0;
  p.startedAt = 0;

  pushLog(`Zkoumání dokončeno: ${chosen.label}`);
  save?.();
  renderPisari();
}

function tick(){
  const p = ensurePisariState();
  if (p.status !== 'running'){ stopTimer(); return; }
  const elapsed = Math.floor((Date.now() - (p.startedAt || Date.now())) / 1000);
  p.remaining = Math.max(0, DURATION_S - elapsed);
  if (p.remaining <= 0){
    stopTimer();
    finish();
  } else {
    const page = document.getElementById('page-pisari');
    if (page?.classList.contains('active')) renderPisari();
  }
}

// ───────────────────────── API (exporty) ─────────────────────────────────────
export function startArtifactResearch(){
  const p = ensurePisariState();
  if (p.status === 'running') return;

  // Musíš mít 1 artefakt – odečteme ho hned při startu
  const cost = { artefakty: 1 };
  if (!canPay(cost)){
    pushLog('Nemáš žádný artefakt – zkoumání nelze zahájit.');
    renderPisari();
    return;
  }
  pay(cost);

  p.status    = 'running';
  p.remaining = DURATION_S;
  p.startedAt = Date.now();
  pushLog('Začalo zkoumání artefaktu (3 s)…');

  save?.();
  startTimer();
  renderPisari();
}

export function resumePisariOnLoad(){
  const p = ensurePisariState();
  if (p.status !== 'running') return;
  const elapsed = Math.floor((Date.now() - (p.startedAt || Date.now())) / 1000);
  p.remaining = Math.max(0, DURATION_S - elapsed);
  if (p.remaining <= 0) finish();
  else startTimer();
}

function pct(x){ return (Number(x||0)*100).toFixed(2).replace('.',',') + ' %'; }
function renderEffectsSummary(){
  const e = state.effects || {};
  const P = e.prodByRes || {};
  const L = [
    ['dřevo',   P['dřevo']],
    ['kámen',   P['kámen']],
    ['železo',  P['železo']],
    ['zlato',   P['zlato']],
    ['obilí',   P['obilí']],
    ['maso',    P['maso']],
  ].map(([k,v]) => `<div class="mini">Produkční bonus ${k}: <b>${pct(v)}</b></div>`).join('');

  const G = `
    <div class="mini">Čas výzkumu: <b>${pct(-(e.researchTime||0))}</b></div>
    <div class="mini">Čas stavby: <b>${pct(-(e.buildTime||0))}</b></div>
    <div class="mini">Kapacita skladiště: <b>${pct(e.capacity||0)}</b></div>
    <div class="mini">Nosnost karavan: <b>${pct(e.expCargo||0)}</b></div>
    <div class="mini">Selhání expedice: <b>${pct(e.expFail||0)}</b></div>
    <div class="mini">Šance na běžné suroviny: <b>${pct(e.expCommon||0)}</b></div>
    <div class="mini">Šance na extra artefakt: <b>${pct(e.expArtifact||0)}</b></div>
  `;
  return L + G;
}

export function renderPisari(){
  const page = document.getElementById('page-pisari');
  if (!page) return;
  ensurePisariState();
  const p = state.pisari;

  const have = Number(state?.resources?.artefakty || 0);
  const disabled = (p.status === 'running' || have <= 0) ? 'disabled' : '';
  const hint = have <= 0 ? ' (nemáš artefakt)' : '';

  page.innerHTML = `
    <section class="card">
      <h2>Dům písařů</h2>
      <div class="muted" style="margin-bottom:8px;">
        Zkoumej artefakty — každé zkoumání trvá 3 s a přidá náhodný malý bonus. Bonusy se sčítají.
      </div>

      <div class="row" style="gap:8px; align-items:center;">
        <button class="btn" id="btn-start" ${disabled}>Zkoumat artefakt</button>
        <div class="mini">
          ${p.status==='running' ? `Probíhá… zbývá ${s(p.remaining)}` : 'Připraveno'}
        </div>
        <div class="mini muted">Artefakty: ${have}${hint}</div>
        <div class="mini muted">Celkem prozkoumáno: ${p.total||0}</div>
      </div>

      <div class="mini-title" style="margin-top:12px;">Aktuální kumulované bonusy</div>
      <div class="grid" style="display:grid; grid-template-columns:repeat(2,minmax(180px,1fr)); gap:8px;">
        ${renderEffectsSummary()}
      </div>

      <div class="mini-title" style="margin-top:12px;">Zprávy</div>
      <div class="log" id="pisari-log">${(p.log||[]).map(l=>`<div>${l}</div>`).join('')}</div>
    </section>
  `;

  page.querySelector('#btn-start')?.addEventListener('click', startArtifactResearch);
}
