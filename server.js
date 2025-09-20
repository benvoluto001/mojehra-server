// server.js (kořen repa)
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// ──────────────────────────────────────────────────────────────
// Cesty k souborům s daty
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_DIR    = path.join(process.cwd(), 'data');
const USERS_FILE  = path.join(DATA_DIR, 'users.json');        // registrace/login
const BOARD_FILE  = path.join(DATA_DIR, 'leaderboard.json');  // žebříček

function readJSON(file, fallback){
  try{
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }catch{ return fallback; }
}
function writeJSON(file, data){
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const loadUsers  = () => readJSON(USERS_FILE, []);
const saveUsers  = (arr) => writeJSON(USERS_FILE, arr);
const loadBoard  = () => readJSON(BOARD_FILE, []);
const saveBoard  = (arr) => writeJSON(BOARD_FILE, arr);

// ──────────────────────────────────────────────────────────────
// App + session
const app = express();
app.set('trust proxy', 1); // Render/Heroku za proxy → umožní secure cookie

const ADMIN_USER = (process.env.ADMIN_USER ?? 'hrac').toString().trim();
const ADMIN_PASS = (process.env.ADMIN_PASS ?? 'heslo123').toString().trim();
const SECRET     = process.env.SESSION_SECRET ?? 'dev-secret-change-me';

console.log('[CONFIG] ADMIN_USER =', ADMIN_USER, ' PASS_LEN =', ADMIN_PASS.length);

app.use(express.urlencoded({ extended: true })); // formuláře
app.use(express.json());                          // JSON (API)

app.use(session({
  name: 'sess',
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: true
  }
}));

// ──────────────────────────────────────────────────────────────
// Login UI (GET)
app.get('/login', (req,res)=>{
  if (req.session.user) return res.redirect('/');
  res.type('html').send(`<!doctype html>
<meta charset="utf-8">
<title>Přihlášení</title>
<style>
  body{font:16px/1.4 system-ui;padding:40px}
  input{padding:8px;margin:4px 0}
  button{padding:8px 12px}
  a{color:#08f;text-decoration:none}
</style>
<h2>Přihlášení</h2>
<form method="post" action="/login">
  <div><input name="u" placeholder="Uživatel" required></div>
  <div><input type="password" name="p" placeholder="Heslo" required></div>
  <button>Přihlásit</button>
</form>
<div style="margin-top:8px">
  <a href="/register">Vytvořit nový účet</a>
</div>`);
});

// Login (POST) — admin z ENV nebo uživatel z users.json
app.post('/login', async (req,res)=>{
  const u = (req.body?.u || '').trim();
  const p = (req.body?.p || '').trim();

  // 1) admin přes ENV
  if (u === ADMIN_USER && p === ADMIN_PASS){
    req.session.user = u;
    return res.redirect('/');
  }

  // 2) běžný uživatel z users.json
  const users = loadUsers();
  const item  = users.find(x => x.user === u);
  if (item && await bcrypt.compare(p, item.hash)){
    req.session.user = u;
    return res.redirect('/');
  }

  return res.status(401).type('html')
    .send('Špatné jméno nebo heslo. <a href="/login">Zpět</a> | <a href="/register">Registrace</a>');
});

// Logout
app.post('/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/login'));
});

// Logout přes GET (pro jednoduchý odkaz/tlačítko)
app.get('/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/login'));
});

// ──────────────────────────────────────────────────────────────
// Registrace (GET + POST)
app.get('/register', (req,res)=>{
  if (req.session.user) return res.redirect('/');
  res.type('html').send(`<!doctype html>
<meta charset="utf-8">
<title>Registrace</title>
<style>
  body{font:16px/1.4 system-ui;padding:40px}
  input{padding:8px;margin:4px 0}
  button{padding:8px 12px}
  a{color:#08f;text-decoration:none}
</style>
<h2>Registrace</h2>
<form method="post" action="/register">
  <div><input name="u" placeholder="Uživatel" required></div>
  <div><input type="password" name="p" placeholder="Heslo" required></div>
  <button>Vytvořit účet</button>
</form>
<div style="margin-top:8px"><a href="/login">Zpět na přihlášení</a></div>`);
});

app.post('/register', async (req,res)=>{
  const u = (req.body?.u || '').trim();
  const p = (req.body?.p || '').trim();
  if (!u || !p) return res.status(400).send('Chybí údaje.');

  const users = loadUsers();
  if (users.find(x=> x.user === u))
    return res.status(409).type('html').send('Uživatel už existuje. <a href="/login">Přihlásit</a>');

  const hash = await bcrypt.hash(p, 10);
  users.push({ user: u, hash, createdAt: Date.now() });
  saveUsers(users);

  req.session.user = u;
  return res.redirect('/');
});

// ──────────────────────────────────────────────────────────────
// API: žebříček
app.get('/api/leaderboard', (req,res)=>{
  res.json(loadBoard());
});
app.post('/api/score', (req,res)=>{
  const name = String(req.body?.user || '').trim() || 'host';
  const pts  = Number(req.body?.points || 0) || 0;

  const board = loadBoard();
  const i = board.findIndex(x => x.user === name);
  if (i >= 0){
    board[i].points    = Math.max(Number(board[i].points||0), pts);
    board[i].updatedAt = Date.now();
  }else{
    board.push({ user: name, points: pts, updatedAt: Date.now() });
  }
  board.sort((a,b)=> (b.points||0) - (a.points||0));
  saveBoard(board.slice(0,100));
  res.json({ ok:true });
});

// ──────────────────────────────────────────────────────────────
// Statické soubory (JS/CSS/obrázky) — povoleno vždy
app.use(express.static(path.join(__dirname, 'public')));

// Pomocná diagnostika
app.get('/__whoami', (req,res)=> res.json({ user: req.session.user ?? null }));

// SPA fallback — jen pro HTML (chráněné přihlášením)
app.get('*', (req,res,next)=>{
  if (req.method !== 'GET') return next();
  const accept = req.headers.accept || '';
  const hasExt = path.extname(req.path) !== '';

  // ne-HTML nebo soubor s příponou → předej dál (404 obstará Express)
  if (!accept.includes('text/html') || hasExt) return next();

  // HTML stránka (/, /vypravy, …) → vyžaduje přihlášení
  if (!req.session.user) return res.redirect('/login');

  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log('Listening on http://localhost:' + port));
