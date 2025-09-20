// src/ui/postava.js
import { state, save } from '../state.js';

/** Definice slotů vybavení (typy itemů, které do nich smí) */
const EQUIP_SLOTS = [
  { key: 'head',    label: 'Hlava',      accept: ['helmet'] },
  { key: 'chest',   label: 'Hruď',       accept: ['armor'] },
  { key: 'legs',    label: 'Nohy',       accept: ['legs'] },
  { key: 'boots',   label: 'Boty',       accept: ['boots'] },       // boty jen do slotu boty
  { key: 'weapon',  label: 'Zbraň',      accept: ['weapon'] },
  { key: 'offhand', label: 'Druhá ruka', accept: ['shield','offhand'] },
  { key: 'ring1',   label: 'Prsten 1',   accept: ['ring'] },
  { key: 'ring2',   label: 'Prsten 2',   accept: ['ring'] },
  { key: 'amulet',  label: 'Amulet',     accept: ['amulet'] },
];

const accepts = (slotKey, item) => {
  const slot = EQUIP_SLOTS.find(s => s.key === slotKey);
  return !!slot && !!item && slot.accept.includes(item.type);
};
const firstFree = (arr) => arr.findIndex(x => !x);

/** Volitelný seed pár testovacích věcí (ať je co nasadit při zkoušce) */
const SEED_TEST_ITEMS = true;
function seedDemoItems(p){
  if (!SEED_TEST_ITEMS) return;
  if (p.inventory.some(Boolean)) return;
  p.inventory[0] = { id:'boots-1',  name:'Kožené boty',  type:'boots'  };
  p.inventory[1] = { id:'helm-1',   name:'Kožená přilba',type:'helmet' };
  p.inventory[2] = { id:'sword-1',  name:'Dřevěný meč',  type:'weapon' };
}

/** PUBLIC: vykreslí stránku Postava (atributy + inventář + vybavení) */
export function renderPostava(){
  const page = document.getElementById('page-postava');
  if (!page) return;

  const player = state.player;
  if (!player) return;

  seedDemoItems(player); // testovací předměty

  // JEDNA karta: vlevo vybavení + inventář, vpravo atributy
  page.innerHTML = `
    <section class="card">
      <h2>Postava</h2>

      <div class="char-layout">
        <!-- LEVÝ SLOUPEC -->
        <div class="char-left">
          <h3 class="mini-title">Vybavení</h3>
          <div class="equip-grid" id="equip-grid"></div>

          <h3 class="mini-title" style="margin-top:14px">Inventář</h3>
          <div class="inv-grid" id="inv-grid" aria-label="Inventář (5×10)"></div>
          <div class="mini muted" style="margin-top:8px">
            Klikni na předmět v inventáři pro nasazení. Klikni na slot pro sundání.
          </div>
        </div>

        <!-- PRAVÝ SLOUPEC -->
        <aside class="char-attrs">
          <div class="attrs" id="attrs"></div>
        </aside>
      </div>
    </section>
  `;

  // vykreslení obsahu
  drawAttrs(player);
  drawEquip(player);
  drawInventory(player);
}


/* ----- privátní renderery ----- */
function drawAttrs(p){
  const A = p.stats, M = p.max;
  const box = document.getElementById('attrs');
  if (!box) return;
  box.innerHTML = `
    <div class="attr-row"><span>Zdraví</span><span>${A.health} / ${M.health}</span></div>
    <div class="attr-row"><span>Mana</span><span>${A.mana} / ${M.mana}</span></div>
    <div class="attr-row"><span>Vitalita</span><span>${A.vitality} / ${M.vitality}</span></div>
    <div class="attr-row"><span>Útok</span><span>${A.attack}</span></div>
    <div class="attr-row"><span>Obrana</span><span>${A.defense}</span></div>
    <div class="mini muted" style="margin-top:6px">
      Regenerace každých ${p.regen.interval}s:
      +${p.regen.health} HP, +${p.regen.mana} MP, +${p.regen.vitality} VIT.
    </div>
  `;
}

function drawEquip(p){
  const eg = document.getElementById('equip-grid');
  if (!eg) return;
  eg.innerHTML = '';
  EQUIP_SLOTS.forEach(slot => {
    const it = p.equipment[slot.key];
    const btn = document.createElement('button');
    btn.className = 'slot equip';
    btn.dataset.slot = slot.key;
    btn.title = `${slot.label} (${slot.accept.join(', ')})`;
    btn.innerHTML = it ? `<b>${it.name}</b><div class="mini">${it.type}</div>`
                       : `<span class="muted">${slot.label}</span>`;
    btn.onclick = () => {
      // sundat → do inventáře
      if (!p.equipment[slot.key]) return;
      const idx = firstFree(p.inventory);
      if (idx === -1) return alert('Inventář je plný.');
      p.inventory[idx] = p.equipment[slot.key];
      p.equipment[slot.key] = null;
      save?.();
      drawEquip(p);
      drawInventory(p);
    };
    eg.appendChild(btn);
  });
}

function drawInventory(p){
  const inv = document.getElementById('inv-grid');
  if (!inv) return;
  inv.innerHTML = '';
  // 5 řádků × 10 sloupců = 50 buněk (p.inventory už takhle máme)
  p.inventory.forEach((it, idx) => {
    const cell = document.createElement('button');
    cell.className = 'slot inv';
    cell.dataset.index = String(idx);
    cell.innerHTML = it ? `<b>${it.name}</b><div class="mini">${it.type}</div>` : '';
    cell.title = it ? it.name : 'prázdné';
    cell.onclick = () => {
      if (!it) return;
      // najdi slot dle typu
      const target = EQUIP_SLOTS.find(s => accepts(s.key, it));
      if (!target) return alert(`Předmět typu "${it.type}" nelze nikam nasadit.`);
      const occupied = p.equipment[target.key];
      if (!occupied){
        p.equipment[target.key] = it;
        p.inventory[idx] = null;
      }else{
        // swap
        p.inventory[idx] = occupied;
        p.equipment[target.key] = it;
      }
      save?.();
      drawEquip(p);
      drawInventory(p);
    };
    inv.appendChild(cell);
  });
}
