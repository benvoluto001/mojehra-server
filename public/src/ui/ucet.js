// public/src/ui/ucet.js
import { state, save } from '../state.js';

function ensureStats(){
  if (!state.stats) state.stats = {};
  if (!state.stats.spent) state.stats.spent = {};
  if (typeof state.stats.nickname !== 'string') state.stats.nickname = 'host';
}
function totalSpent(){
  const s = state?.stats?.spent || {};
  return Object.values(s).reduce((a,b)=>a + Number(b||0), 0);
}

export function renderUcet(){
  ensureStats();
  const page = document.getElementById('page-ucet');
  if (!page) return;

  const points = totalSpent();

  page.innerHTML = `
    <section class="card">
      <h2>Účet</h2>

      <div class="row" style="gap:12px;align-items:end;flex-wrap:wrap;">
        <label>Jméno hráče
          <input id="nick" type="text" value="${state.stats.nickname||'host'}" maxlength="24"/>
        </label>
        <div class="mini">Body (vše utracené suroviny): <b>${points.toLocaleString('cs-CZ')}</b></div>
      </div>

      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap;">
        <button id="btn-save" class="btn">Uložit jméno</button>

        <!-- Odhlášení a přepnutí účtu přes přímé odkazy -->
        <a class="btn btn-secondary" href="/logout">Odhlásit</a>
        <a class="btn btn-secondary" href="/logout">Přihlásit jiný účet</a>

        <!-- Viditelné vstupy na /login a /register (když nechceš jen odhlásit) -->
        <a class="btn" href="/login">Přejít na přihlášení</a>
        <a class="btn" href="/register">Vytvořit nový účet</a>
      </div>
    </section>
  `;
// hned po vykreslení přepiš text v hlavičce
const lbl = document.getElementById('account-label');
if (lbl) lbl.textContent = state.stats.nickname || 'host';

page.querySelector('#btn-save')?.addEventListener('click', ()=>{
  state.stats.nickname = (nick.value||'').trim() || 'host';
  save?.();
  
});


}
