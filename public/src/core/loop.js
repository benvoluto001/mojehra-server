// core/loop.js
import { state, save, applyResearchEffects } from '../state.js';
import { renderResources, renderBuildings, renderDetail, renderStats } from '../ui/render.js';
import { renderVyzkumy } from '../ui/vyzkumy.js';
// core/loop.js
import { tickStroje, rerenderStrojeIfActive } from '../ui/stroje.js';
import { tickBuffs } from '../effects/buffs.js';

const TICK_MS = 1000;
let _timer = null;

/* ----------------------------- Výzkumy – lokálně ---------------------------- */
/** formát “Xs” – jen drobná utilita, kdybys ji chtěl použít i jinde */
const s = (n) => `${Math.max(0, Math.ceil(n))}s`;

/** Doba trvání výzkumu pro DALŠÍ level (level -> level+1) */
function researchDuration(r){
  const base   = r?.baseTime ?? 10;   // výchozí 10 s
  const factor = r?.timeFactor ?? 1.45;
  const lvl    = r?.level || 0;
  return Math.ceil(base * Math.pow(factor, lvl));
}

/** Jeden „tik“ výzkumů (1s) – bez dalších importů/exportů */
function tickResearchOnce(){
  let changed = false;
  const R = state.research || {};
  for (const r of Object.values(R)){
    if (!r || r.action !== 'upgrade' || !r.remaining) continue;
    r.remaining = Math.max(0, r.remaining - 1);
    if (r.remaining === 0){
      r.action = null;
      r.level = (r.level || 0) + 1;
      changed = true;
    }
  }
  if (changed && typeof applyResearchEffects === 'function'){
    applyResearchEffects();
  }
}
/* --------------------------------------------------------------------------- */

/** Jedno „herní” tiknutí */
function gameTick(buildings){
  // 1) tik budov
  buildings.forEach(b => (typeof b.tick === 'function') && b.tick());

  // 2) tik výzkumů
  tickResearchOnce();
  // 2b) tik strojů (výroba Ankarit/Pulzar)
  tickStroje();
  tickBuffs(); // elixíry – expirace a agregace

  // 3) čas běhu hry
  state.tick = (state.tick || 0) + 1;

  // 4) UI
  renderAll(buildings);
  rerenderStrojeIfActive();

  // 5) autosave
  if (state.tick % 1 === 0) save();
}

/** Společný render (vše na jednom místě) */
function renderAll(buildings){
  renderResources(buildings);
  renderStats(buildings);
  renderBuildings(buildings);

  // když je otevřená záložka Výzkumy, přerenderuj ji, ať se odpočítávání hýbe
  const vyzkumyActive = document
    .getElementById('page-vyzkumy')
    ?.classList.contains('active');
  if (vyzkumyActive) renderVyzkumy();

  // (volitelné) pokud máš vybraný detail budovy:
  const selId = window.__selectedBuildingId || null;
  if (selId){
    const b = buildings.find(x => x.id === selId);
    if (b) renderDetail(b);
  }
}


/** Spusť hlavní smyčku */
export function startLoop(buildings){
  // Ulož list budov do globalu – používají ho jiné části UI
  window.__allBuildings = buildings;

  if (_timer) clearInterval(_timer);
  // okamžitý první render a pak každou sekundu tick
  renderAll(buildings);
  _timer = setInterval(() => gameTick(buildings), TICK_MS);
}

/** Zastav smyčku (když přepínáš scény, reload, atd.) */
export function stopLoop(){
  if (_timer){
    clearInterval(_timer);
    _timer = null;
  }
}
