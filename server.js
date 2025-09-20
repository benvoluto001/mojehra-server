// server.js (kořen repa)
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1); // důležité za proxy (Render)

const ADMIN_USER = (process.env.ADMIN_USER ?? 'hrac').toString().trim();
const ADMIN_PASS = (process.env.ADMIN_PASS ?? 'heslo123').toString().trim();
const SECRET     = process.env.SESSION_SECRET ?? 'dev-secret-change-me';

console.log('[CONFIG] USER =', ADMIN_USER, ' PASS_LEN =', ADMIN_PASS.length);

// parsování POST formuláře
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'sess',
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: true // Render jede přes HTTPS, díky trust proxy se cookie správně pošle
  }
}));

// ---- Login UI
app.get('/login', (req,res)=>{
  if (req.session.user) return res.redirect('/');
  res.type('html').send(
`<!doctype html>
<meta charset="utf-8">
<title>Přihlášení</title>
<style>body{font:16px/1.4 system-ui;padding:40px}input{padding:8px;margin:4px 0}button{padding:8px 12px}</style>
<h2>Přihlášení</h2>
<form method="post" action="/login">
  <div><input name="u" placeholder="Uživatel" required></div>
  <div><input type="password" name="p" placeholder="Heslo" required></div>
  <button>Přihlásit</button>
</form>
<div style="margin-top:8px;color:#777">Tip: výchozí je <b>${ADMIN_USER}</b> / heslo (délka: ${ADMIN_PASS.length})</div>`
  );
});

// ---- Login logika
app.post('/login', (req,res)=>{
  const u = (req.body?.u || '').trim();
  const p = (req.body?.p || '').trim();
  console.log('[LOGIN ATTEMPT]', { userTry: u, passLen: p.length });

  if (u === ADMIN_USER && p === ADMIN_PASS){
    req.session.user = u;
    console.log('[LOGIN OK]', u);
    return res.redirect('/');
  }
  console.log('[LOGIN FAIL]', { userTry: u, passLen: p.length });
  return res.status(401).type('html').send('Špatné jméno nebo heslo. <a href="/login">Zpět</a>');
});

app.post('/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/login'));
});

// ---- Gate: vše mimo /login vyžaduje přihlášení
// ---- Statická hra (pustíme ji vždy – JS/CSS/obrázky)
app.use(express.static(path.join(__dirname, 'public')));

// Pomocná kontrola session (můžeš si nechat)
app.get('/__whoami', (req, res) => res.json({ user: req.session.user ?? null }));

// ---- HTML router chráněný přihlášením (SPA fallback jen pro HTML navigace)
app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();

  const accept = req.headers.accept || '';
  const hasExt = path.extname(req.path) !== '';

  // není to HTML navigace → předej dál (když soubor neexistuje, vrátí 404)
  if (!accept.includes('text/html') || hasExt) return next();

  // je to HTML stránka (/, /obrana, …) → musí být přihlášen
  if (!req.session.user) return res.redirect('/login');

  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// zbytek 404 (nepovinné)
app.use((req, res) => res.status(404).end());


// SPA fallback – jen pro HTML navigace (bez přípony)
// aby chybějící .js/.css vracely 404 a bylo to vidět v konzoli
app.get('*', (req, res, next) => {
  if (req.method !== 'GET') return next();

  const accept = req.headers.accept || '';
  const hasExt = path.extname(req.path) !== '';

  // pokud jde o "stránku" (bez přípony) → vrať index.html
  if (accept.includes('text/html') && !hasExt) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  // jinak nech request propadnout dál (status 404)
  return res.status(404).end();
});


const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log('Listening on http://localhost:'+port));


