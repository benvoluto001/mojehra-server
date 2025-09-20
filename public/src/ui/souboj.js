// souboj.js
 import { state } from '../state.js';
 import { UNIT_TYPES } from '../vojsko/units.js';
 import { simulateBattle, defaultMatrix, DAMAGE_TYPES } from '../sim/battle.js';


const fmt = (n) => Number(n ?? 0).toLocaleString('cs-CZ');

function ensureUnitsObj(obj){
  const out = {};
  UNIT_TYPES.forEach(u => out[u.id] = Number(obj?.[u.id]||0));
  return out;
}

function readMatrixFromDOM(box){
  const m = {};
  DAMAGE_TYPES.forEach(a => {
    m[a] = {};
    DAMAGE_TYPES.forEach(d => {
      const inp = box.querySelector(`input[data-m="${a}-${d}"]`);
      m[a][d] = Number(inp?.value || 1);
    });
  });
  return m;
}

function matrixTableHTML(M){
  const head = `<tr><th style="text-align:left;">Útočí \\ Brání se</th>${DAMAGE_TYPES.map(t => `<th>${t}</th>`).join('')}</tr>`;
  const rows = DAMAGE_TYPES.map(a => `
    <tr>
      <th style="text-align:left;">${a}</th>
      ${DAMAGE_TYPES.map(d => `
        <td><input type="number" step="0.05" min="0" value="${M[a][d]}" data-m="${a}-${d}"></td>
      `).join('')}
    </tr>
  `).join('');
  return `<table class="tbl-sim">${head}${rows}</table>`;
}

function unitRowHTML(side, u, init=0){
  return `
    <div class="sim-row">
      <label>${u.short||u.name}
        <input type="number" min="0" step="1" value="${init}" data-${side}="${u.id}" style="width:90px;">
      </label>
      <span class="muted">HP: ${u.stats.hp}, Odolnost: ${u.stats.armor}, Útok: ${u.stats.atk}, typ: ${u.damageType}</span>
    </div>
  `;
}

export function simulateBattle(attacker, defender){
  // jednoduchá placeholder logika, ať import funguje
  const atk = (attacker?.attack  ?? 10) - (defender?.defense ?? 5);
  const def = (defender?.attack  ?? 10) - (attacker?.defense ?? 5);
  const rounds = 10;

  let aHP = attacker?.hp ?? 100;
  let dHP = defender?.hp ?? 100;

  for (let i = 0; i < rounds && aHP > 0 && dHP > 0; i++){
    dHP -= Math.max(1, atk);
    if (dHP <= 0) break;
    aHP -= Math.max(1, def);
  }

  return {
    winner: aHP > dHP ? 'attacker' : (dHP > aHP ? 'defender' : 'draw'),
    aHP: Math.max(0, Math.round(aHP)),
    dHP: Math.max(0, Math.round(dHP)),
    rounds,
  };
}

export function renderSouboj(){
  const page = document.getElementById('page-souboj');
  if (!page) return;

  const M = defaultMatrix();

  page.innerHTML = `
    <section class="card">
      <h2>Souboj (A vs B)</h2>
      <div class="mini muted">Pozn.: Schopnosti jednotek (průraznost, aura, debuffy, burst) se uplatní automaticky podle složení armád.</div>
      <div class="sim-grid">
        <div class="sim-card">
          <h3>Hráč A</h3>
          <div class="mini muted">Můžeš načíst své aktuální vojsko.</div>
          <div id="sideA"></div>
          <div class="sim-row">
            <button class="btn" id="loadA">Načíst z Vojska</button>
            <button class="btn" id="clearA">Vyprázdnit</button>
          </div>
        </div>

        <div class="sim-card">
          <h3>Hráč B</h3>
          <div id="sideB"></div>
          <div class="sim-row">
            <button class="btn" id="mirrorB">Zrcadlit z A</button>
            <button class="btn" id="clearB">Vyprázdnit</button>
          </div>
        </div>
      </div>

      <div class="mini-title">Matice typů poškození (násobky)</div>
      <div id="matrixBox">${matrixTableHTML(M)}</div>

      <div class="sim-row" style="margin-top:10px;">
        <label>Vliv odolnosti (armor) – % ztráty dmg za 1 bod:
          <input type="number" step="0.1" min="0" max="100" value="1" id="armorEff" style="width:90px;"> %
        </label>
        <label>Max kol:
          <input type="number" min="1" max="200" step="1" value="50" id="maxRounds" style="width:90px;">
        </label>
        <button class="btn" id="run">Simulovat</button>
      </div>

      <div class="mini-title">Výsledek</div>
      <div id="result" class="muted">Zatím žádný výsledek.</div>
      <div class="mini-title">Log</div>
      <div id="log" class="log"></div>
    </section>
  `;

  const boxA = page.querySelector('#sideA');
  const boxB = page.querySelector('#sideB');

  // vykresli řádky jednotek
  boxA.innerHTML = UNIT_TYPES.map(u => unitRowHTML('a', u, 0)).join('');
  boxB.innerHTML = UNIT_TYPES.map(u => unitRowHTML('b', u, 0)).join('');

  // tlačítka
  page.querySelector('#loadA')?.addEventListener('click', () => {
    const units = state.units || {};
    UNIT_TYPES.forEach(u => {
      const inp = page.querySelector(`input[data-a="${u.id}"]`);
      if (inp) inp.value = Number(units[u.id]||0);
    });
  });
  page.querySelector('#mirrorB')?.addEventListener('click', () => {
    UNIT_TYPES.forEach(u => {
      const a = page.querySelector(`input[data-a="${u.id}"]`);
      const b = page.querySelector(`input[data-b="${u.id}"]`);
      if (a && b) b.value = a.value;
    });
  });
  page.querySelector('#clearA')?.addEventListener('click', () => {
    UNIT_TYPES.forEach(u => {
      const inp = page.querySelector(`input[data-a="${u.id}"]`);
      if (inp) inp.value = 0;
    });
  });
  page.querySelector('#clearB')?.addEventListener('click', () => {
    UNIT_TYPES.forEach(u => {
      const inp = page.querySelector(`input[data-b="${u.id}"]`);
      if (inp) inp.value = 0;
    });
  });

  page.querySelector('#run')?.addEventListener('click', () => {
    // načti armády
    const armyA = {};
    const armyB = {};
    UNIT_TYPES.forEach(u => {
      armyA[u.id] = Number(page.querySelector(`input[data-a="${u.id}"]`)?.value || 0);
      armyB[u.id] = Number(page.querySelector(`input[data-b="${u.id}"]`)?.value || 0);
    });

    // matrix + volby
    const M2 = readMatrixFromDOM(page.querySelector('#matrixBox'));
    const armorEffPct = Number(page.querySelector('#armorEff')?.value || 1);
    const maxRounds = Number(page.querySelector('#maxRounds')?.value || 50);

    const res = simulateBattle(ensureUnitsObj(armyA), ensureUnitsObj(armyB), {
      matrix: M2,
      armorEffect: armorEffPct/100,
      maxRounds
    });

    const resultEl = page.querySelector('#result');
    const logEl = page.querySelector('#log');

    const sumA = UNIT_TYPES.map(u => `${u.short||u.name}: ${fmt(res.armyA[u.id]||0)}`).join(' • ');
    const sumB = UNIT_TYPES.map(u => `${u.short||u.name}: ${fmt(res.armyB[u.id]||0)}`).join(' • ');

    let text = '';
    if (res.winner === 'A') text = `Vítěz: Hráč A (${res.rounds} kol)`;
    else if (res.winner === 'B') text = `Vítěz: Hráč B (${res.rounds} kol)`;
    else text = `Remíza (${res.rounds} kol)`;

    resultEl.innerHTML = `${text}<br><div class="mini muted">Zbylí – A: ${sumA}<br>B: ${sumB}</div>`;
    logEl.innerHTML = res.log.map(l => `<div>${l}</div>`).join('');
  });
}
