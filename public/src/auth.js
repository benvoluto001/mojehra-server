// src/auth.js
// Jednoduché lokální účty (localStorage). Hesla ukládáme jako SHA-256 hash.

const USERS_KEY = 'auth.users';
const CURR_KEY  = 'auth.current';

function loadUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch { return []; }
}
function saveUsers(list){ localStorage.setItem(USERS_KEY, JSON.stringify(list)); }

export function getCurrentUser(){
  return localStorage.getItem(CURR_KEY) || null;
}
function setCurrentUser(username){
  if (username == null) localStorage.removeItem(CURR_KEY);
  else localStorage.setItem(CURR_KEY, username);
  window.dispatchEvent(new CustomEvent('auth-changed'));
}

function str2hex(buf){
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
async function hashPassword(username, password){
  const te = new TextEncoder();
  const data = te.encode(`u:${username}\n${password}`);

  // Secure WebCrypto (https/localhost)
  if (crypto?.subtle?.digest) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // Fallback (ne-kryptografický, jen pro lokální testování)
  let h = 5381;
  for (let i = 0; i < data.length; i++) {
    h = ((h << 5) + h) ^ data[i];
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}


export function listUsers(){
  return loadUsers().map(u => u.username);
}

export async function register(username, password){
  username = String(username||'').trim();
  if (!username || !password) throw new Error('Vyplň uživatelské jméno i heslo.');
  const users = loadUsers();
  const exists = users.some(u => u.usernameLower === username.toLowerCase());
  if (exists) throw new Error('Tento uživatel už existuje.');
  const passHash = await hashPassword(username, password);
  users.push({ username, usernameLower: username.toLowerCase(), passHash, createdAt: Date.now() });
  saveUsers(users);
  setCurrentUser(username);
  return true;
}

export async function login(username, password){
  const users = loadUsers();
  const u = users.find(x => x.usernameLower === String(username||'').toLowerCase());
  if (!u) throw new Error('Uživatel nenalezen.');
  const passHash = await hashPassword(u.username, password);
  if (passHash !== u.passHash) throw new Error('Nesprávné heslo.');
  setCurrentUser(u.username);
  return true;
}

export function logout(){
  setCurrentUser(null);
}

export function ensureGuestIfNone(){
  if (!getCurrentUser()) setCurrentUser('host');
}

export function onAuthChanged(handler){
  window.addEventListener('auth-changed', handler);
}
