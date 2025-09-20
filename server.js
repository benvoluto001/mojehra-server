// server.js (kořen repa)
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ====== KONFIG (ENV s fallbacky) ======
const ADMIN_USER = (process.env.ADMIN_USER ?? 'hrac').toString().trim();
const ADMIN_PASS = (process.env.ADMIN_PASS ?? 'heslo123').toString().trim();
const SECRET     = (process.env.SESSION_SECRET ?? 'dev-secret-change-me');

// pro jistotu vypíšeme do logu (heslo jen délkou)
console.log('[CONFIG] USER =', ADMIN_USER, ' PASS_LEN =', ADMIN_PASS.length);

// parsování formuláře (MUSÍ být před routami)
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'sess',
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// ====== LOGIN UI ======
app.get('/login', (req,res)=>{
  if (req.session.user) return res.redirect('/');
  res.send(`
    <html><head><meta charset="utf-8"><title>Přihlášení</title>
      <style>body{font:16px/1.4 system-ui;padding:40px}input{padding:8px;margin:4px 0}button{padding:8px 12px}</style>
    </head><body>
      <h2>Přihlášení</h2>
      <form method="post" action="/login">
        <div><input name="u" placeholder="Uživatel" required></div>
        <div><input type="password" name="p" placeholder="Heslo" required></div>
        <button>Přihlásit</button>
      </form>
      <div style="margin-top:8px;color:#777">Tip: výchozí je <b>${ADMIN_USER}</b> / heslo (délka: ${ADMIN_PASS.length})</div>
    </body></html>
  `);
});

// ====== LOGIN LOGIKA ======
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
  return res.status(401).send('Špatné jméno nebo heslo. <a href="/login">Zpět</a>');
});

app.post('/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/login'));
});

// ====== GATE: všechno mimo /login vyžaduje přihlášení ======
app.use((req,res,next)=>{
  if (req.path.startsWith('/login')) return next();
  if (req.session.user) return next();
  return res.redirect('/login');
});

// ====== STATICKÁ HRA ======
app.use(express.static(path.join(__dirname,'public')));

// SPA fallback
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log('Listening on http://localhost:'+port));
