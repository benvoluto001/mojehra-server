// server.js (kořen projektu)
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// Jednoduché přihlašovací údaje (změníš podle sebe nebo dáš do env proměnných)
const ADMIN_USER = process.env.ADMIN_USER || 'hrac';
const ADMIN_PASS = process.env.ADMIN_PASS || 'heslo123';
const SECRET     = process.env.SESSION_SECRET || 'dev-secret-change-me';

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

// Login stránka (jednoduchá)
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
    </body></html>
  `);
});

app.post('/login', (req,res)=>{
  const { u, p } = req.body || {};
  if (u === ADMIN_USER && p === ADMIN_PASS){
    req.session.user = u;
    return res.redirect('/');
  }
  res.status(401).send('Špatné jméno nebo heslo. <a href="/login">Zpět</a>');
});

app.post('/logout', (req,res)=>{
  req.session.destroy(()=> res.redirect('/login'));
});

// Gate – všechno kromě /login bude vyžadovat přihlášení
app.use((req,res,next)=>{
  if (req.path.startsWith('/login')) return next();
  if (req.session.user) return next();
  return res.redirect('/login');
});

// Statické soubory (tvoje hra)
app.use(express.static(path.join(__dirname,'public')));

// SPA fallback – ať hash router funguje
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log('Listening on http://localhost:'+port));
