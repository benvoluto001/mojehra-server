// src/ui/ucet.js
import { getCurrentUser, listUsers, register, login, logout } from '../auth.js';
import { load } from '../state.js';

const fmt = (x)=> String(x||'').replace(/</g,'&lt;');

export function renderUcet(){
  const page = document.getElementById('page-ucet');
  if (!page) return;

  const curr = getCurrentUser();
  const users = listUsers();

  page.innerHTML = `
    <section class="card">
      <h2>Účet</h2>
      <div class="row" style="gap:12px; flex-wrap:wrap;">
        <div class="pill">Přihlášen: <b id="acc-name">${fmt(curr)||'—'}</b></div>
        <button class="btn" id="btn-logout" ${curr?'':'disabled'}>Odhlásit</button>
      </div>
    </section>

    <section class="card">
      <h3>Přihlášení</h3>
      <div class="row" style="gap:8px; align-items:end; flex-wrap:wrap;">
        <label>Uživatel<br>
          <select id="login-user" style="min-width:180px;">
            ${users.map(u=>`<option value="${fmt(u)}"${u===curr?' selected':''}>${fmt(u)}</option>`).join('') || '<option value="">(žádní uživatelé)</option>'}
          </select>
        </label>
        <label>Heslo<br>
          <input type="password" id="login-pass" placeholder="••••••" style="min-width:180px;">
        </label>
        <button class="btn" id="btn-login" ${users.length? '':'disabled'}>Přihlásit</button>
      </div>
    </section>

    <section class="card">
      <h3>Registrace</h3>
      <div class="row" style="gap:8px; align-items:end; flex-wrap:wrap;">
        <label>Uživatel<br>
          <input type="text" id="reg-user" placeholder="Nový uživatel" style="min-width:180px;">
        </label>
        <label>Heslo<br>
          <input type="password" id="reg-pass" placeholder="Heslo" style="min-width:180px;">
        </label>
        <label>Heslo znovu<br>
          <input type="password" id="reg-pass2" placeholder="Heslo znovu" style="min-width:180px;">
        </label>
        <button class="btn" id="btn-register">Registrovat</button>
      </div>
      <div class="mini muted" style="margin-top:6px;">Každý účet má vlastní uloženou hru.</div>
    </section>
  `;

  page.querySelector('#btn-login')?.addEventListener('click', async ()=>{
    try{
      const u = page.querySelector('#login-user')?.value;
      const p = page.querySelector('#login-pass')?.value;
      await login(u, p);
      await load();
      alert('Přihlášeno.');
      renderUcet();
      window.dispatchEvent(new CustomEvent('auth-changed'));
    }catch(e){ alert(e.message||String(e)); }
  });

  page.querySelector('#btn-register')?.addEventListener('click', async ()=>{
    try{
      const u = page.querySelector('#reg-user')?.value;
      const p1 = page.querySelector('#reg-pass')?.value;
      const p2 = page.querySelector('#reg-pass2')?.value;
      if (p1 !== p2) throw new Error('Hesla se neshodují.');
      await register(u, p1);
      await load();
      alert('Účet vytvořen a přihlášen.');
      renderUcet();
      window.dispatchEvent(new CustomEvent('auth-changed'));
    }catch(e){ alert(e.message||String(e)); }
  });

  page.querySelector('#btn-logout')?.addEventListener('click', ()=>{
    logout();
    alert('Odhlášeno.');
    renderUcet();
  });
}
