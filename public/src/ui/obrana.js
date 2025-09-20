// src/obrana.js
import { state } from '../state.js';
import { getDefenseRecipes, craftDefense, getDefenseTotals } from '../obrana/receptyObrana.js';


export function renderObrana(){
  const page = document.getElementById('page-obrana');
  if (!page) return;

  const fmt = (n)=>Number(n||0).toLocaleString('cs-CZ');
  const totals = getDefenseTotals();

  page.innerHTML = `
    <section class="card">
      <h2>Obrana – přehled</h2>
      <div class="row" style="gap:16px; flex-wrap:wrap;">
        <div class="pill">Celkový útok obrany: <b class="d-atk">${fmt(totals.atk)}</b></div>
        <div class="pill">Celkové brnění: <b class="d-arm">${fmt(totals.armor)}</b></div>
      </div>
    </section>

    <section class="card" id="def-workshop">
      <h3>Stavba obranných prvků</h3>
      <div class="tabs" id="def-tabs" style="margin:8px 0; display:flex; gap:6px;">
        <button class="tab active" data-tier="1">Tier 1</button>
        <button class="tab" data-tier="2">Tier 2</button>
        <button class="tab" data-tier="3">Tier 3</button>
      </div>
      <div id="def-list"></div>
    </section>
  `;

  const all = getDefenseRecipes();
  const tabs = page.querySelector('#def-tabs');
  const listEl = page.querySelector('#def-list');

  const renderTier = (tier) => {
    const items = all.filter(r => String(r.tier) === String(tier));
    listEl.innerHTML = items.map(r=>{
      const costHTML = Object.entries(r.cost).map(([k,v])=>{
        const have = (k in (state.resources||{})) ? (state.resources[k]||0)
                  : (k in (state.machines ||{})) ? (state.machines[k] ||0) : 0;
        const ok = have >= v;
        return `<li>${ok?'✅':'❌'} ${k}: ${v} (máš ${fmt(have)})</li>`;
      }).join('');
      const haveBuilt = Number(state?.machines?.[r.id] || 0);

      return `
        <div class="building">
          <h4>${r.name}</h4>
          <div class="mini muted">${r.lore || ''}</div>
          <div class="mini" style="margin-top:4px;">Přínos: <b>ATK ${fmt(r.atk)}</b> • <b>ARM ${fmt(r.armor)}</b> / ks</div>

          <div class="mini" style="margin-top:6px;">Náklady (na 1 ks):</div>
          <ul style="margin:4px 0 0 16px; padding-left:18px;">${costHTML}</ul>

          <div class="row" style="gap:8px; align-items:center; margin-top:8px;">
            <label class="muted">Postavit
              <input type="number" min="1" step="1" value="1" data-qty-for="${r.id}" style="width:110px;">
            </label>
            <button class="btn" data-build="${r.id}">Postavit</button>
            <span class="mini">Mám: <b>${fmt(haveBuilt)}</b> ks</span>
          </div>
        </div>
        <hr style="opacity:.15; margin:10px 0;">
      `;
    }).join('') || '<div class="muted">Žádné položky.</div>';
  };

  // první render
  renderTier(1);

  // přepínání tierů
  tabs.addEventListener('click', (e)=>{
    const b = e.target.closest('button[data-tier]');
    if (!b) return;
    tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    renderTier(b.dataset.tier);
  });

  // stavba
  listEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-build]');
    if (!btn) return;
    const id = btn.dataset.build;
    const inp = listEl.querySelector(`input[data-qty-for="${id}"]`);
    const qty = Math.max(1, Math.floor(Number(inp?.value || 1)));
    const res = craftDefense(id, qty);
    if (!res.ok){ alert('Nemáš dost surovin / vybavení.'); return; }

    // přepočti přehled
    const t2 = getDefenseTotals();
    page.querySelector('.d-atk').textContent = fmt(t2.atk);
    page.querySelector('.d-arm').textContent = fmt(t2.armor);

    // překresli aktivní tier
    const active = tabs.querySelector('button.active')?.dataset.tier || '1';
    renderTier(active);
  });
}
