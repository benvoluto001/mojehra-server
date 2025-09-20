// public/src/ui/zebricek.js
import { state, save } from '../state.js';

function ensureStats(){
  if (!state.stats) state.stats = {};
  if (!state.stats.spent) state.stats.spent = {};
  if (typeof state.stats.nickname !== 'string') state.stats.nickname = 'host';
}
function totalSpentPoints(){
  const s = state?.stats?.spent || {};
  return Object.values(s).reduce((a,b)=> a + Number(b||0), 0);
}

async function fetchBoard(){
  try{
    const r = await fetch('/api/leaderboard');
    if (!r.ok) throw 0;
    return await r.json();
  }catch(e){
    return []; // když API zatím není na serveru, vrať prázdný seznam
  }
}
async function postScore(){
  ensureStats();
  const payload = { user: state.stats.nickname || 'host', points: totalSpentPoints() };
  try{
    await fetch('/api/score', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  }catch(e){}
}

export async function renderZebricek(){
  ensureStats();
  const page = document.getElementById('page-zebricek');
  if (!page) return;

  const board = await fetchBoard();
  board.sort((a,b)=> (b.points||0) - (a.points||0));

  const myPoints = totalSpentPoints();

  page.innerHTML = `
    <section class="card">
      <h2>Žebříček</h2>

      <div class="row" style="gap:12px; align-items:end; flex-wrap:wrap;">
        <label>Jméno hráče
          <input id="nick" type="text" value="${state.stats.nickname||'host'}" maxlength="24" />
        </label>
        <div class="mini">Tvoje body (vše utracené suroviny): <b>${myPoints.toLocaleString('cs-CZ')}</b></div>
        <button id="btn-send" class="btn">Odeslat skóre</button>
      </div>

      <div class="mini-title" style="margin-top:12px;">Tabulka</div>
      <div>
        <div class="row muted" style="font-weight:600; gap:8px;">
          <div style="width:60px;">#</div>
          <div style="flex:1">Hráč</div>
          <div style="width:160px; text-align:right;">Body</div>
        </div>
        ${board.map((r,i)=>`
          <div class="row" style="gap:8px; padding:6px 0; border-top:1px solid rgba(255,255,255,0.06)">
            <div style="width:60px;">${i+1}.</div>
            <div style="flex:1">${r.user}</div>
            <div style="width:160px; text-align:right;">${Number(r.points||0).toLocaleString('cs-CZ')}</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;

  const nick = page.querySelector('#nick');
  nick?.addEventListener('change', () => {
    state.stats.nickname = nick.value.trim() || 'host';
    save?.();
  });

  page.querySelector('#btn-send')?.addEventListener('click', async () => {
    await postScore();
    renderZebricek(); // rychlý refresh
  });
}
