// Shared UMKM site logic
const AUTH_KEY = 'umkm_user';
const BASKET_KEY = 'umkm_basket';

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

// Auth helpers
function isLoginPage(){ return location.pathname.endsWith('login.html') || location.pathname === '/' || location.pathname.endsWith('/public/') }
function getUser(){ try{ return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); }catch{ return null; } }
function setUser(u){ localStorage.setItem(AUTH_KEY, JSON.stringify(u)); }
function requireAuth(){ if(!isLoginPage() && !getUser()){ location.href = '/public/login.html'; } }
requireAuth();

// Header wiring (nav active)
(function initHeader(){
  const active = $('a[href$="'+location.pathname.split('/').pop()+'"]');
  if(active) active.classList.add('active');
})();

// Reveal on scroll
(function initReveal(){
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); } });
  }, { threshold:.2 });
  $all('.reveal').forEach(el=> io.observe(el));
})();

// Basket helpers
function getBasket(){ try{ return JSON.parse(localStorage.getItem(BASKET_KEY) || '[]'); }catch{ return []; } }
function saveBasket(items){ localStorage.setItem(BASKET_KEY, JSON.stringify(items)); }
function addToBasket(item){
  const items = getBasket();
  const idx = items.findIndex(i=> i.id===item.id);
  if(idx>-1){ items[idx].qty += item.qty || 1; }
  else { items.push({ ...item, qty: item.qty||1 }); }
  saveBasket(items);
  toast('Added to basket');
  updateBasketBadge();
}
function removeFromBasket(id){ const items = getBasket().filter(i=> i.id!==id); saveBasket(items); renderBasket(); updateBasketBadge(); }
function changeQty(id, delta){ const items = getBasket(); const i = items.find(it=> it.id===id); if(!i) return; i.qty = Math.max(1, i.qty + delta); saveBasket(items); renderBasket(); updateBasketBadge(); }

function basketTotal(){ return getBasket().reduce((s,i)=> s + i.price * i.qty, 0); }

function updateBasketBadge(){
  const b = $('#basketBadge');
  if(!b) return; const count = getBasket().reduce((s,i)=> s+i.qty, 0); b.textContent = count; b.style.display = count? 'inline-flex':'none';
}
updateBasketBadge();

// Toast
let toastTimer; function toast(msg){
  let t = $('#toast'); if(!t){ t = document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;left:50%;top:24px;transform:translateX(-50%);background:#111;border:1px solid rgba(255,255,255,.18);padding:10px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:1000;color:#fff;font-weight:800'; document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity='1'; clearTimeout(toastTimer); toastTimer = setTimeout(()=> t.style.opacity='0', 1200);
}

// Login page
(function loginPage(){
  const form = $('#loginForm'); if(!form) return;
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if(!data.username || !data.password){ toast('Please fill in all fields'); return; }
    setUser({ name:data.username });
    location.href = '/public/home.html';
  });
})();

// Menu page: add handlers
(function menuPage(){
  const list = $('#menuList'); if(!list) return;
  $all('[data-add]');
  list.addEventListener('click',(e)=>{
    const btn = e.target.closest('[data-add]'); if(!btn) return;
    const item = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: Number(btn.dataset.price),
    };
    addToBasket(item);
  });
})();

// Orders page: render basket and tracking
function renderBasket(){
  const table = $('#basketTable'); if(!table) return;
  const tbody = table.querySelector('tbody');
  const items = getBasket();
  tbody.innerHTML = items.map(i=> `
    <tr>
      <td>${i.name}</td>
      <td>Rp ${i.price.toLocaleString('id-ID')}</td>
      <td class="qty">
        <button class="btn small" data-dec="${i.id}">-</button>
        <span>${i.qty}</span>
        <button class="btn small" data-inc="${i.id}">+</button>
      </td>
      <td>Rp ${(i.price*i.qty).toLocaleString('id-ID')}</td>
      <td><button class="btn small ghost" data-rem="${i.id}">Remove</button></td>
    </tr>
  `).join('');
  $('#basketTotal').textContent = 'Rp ' + basketTotal().toLocaleString('id-ID');
}

(function ordersPage(){
  const table = $('#basketTable'); if(!table) return;
  renderBasket();
  table.addEventListener('click',(e)=>{
    const dec = e.target.closest('[data-dec]'); if(dec) changeQty(dec.dataset.dec, -1);
    const inc = e.target.closest('[data-inc]'); if(inc) changeQty(inc.dataset.inc, +1);
    const rem = e.target.closest('[data-rem]'); if(rem) removeFromBasket(rem.dataset.rem);
  });
  $('#checkoutBtn').addEventListener('click',()=>{
    if(getBasket().length===0){ toast('Your basket is empty'); return; }
    toast('Order placed! Assigning driver...');
    startTracking();
  });
})();

// Simple driver tracking simulation
let trackTimer; let progress=0; let driverEl;
function startTracking(){
  const map = $('#map'); if(!map) return;
  progress = 0;
  driverEl = $('#driver');
  if(trackTimer) cancelAnimationFrame(trackTimer);
  function step(){
    progress = Math.min(1, progress + 0.004 + Math.random()*0.003);
    const x = 10 + progress*80; // percent
    const y = 80 - progress*60; // percent
    driverEl.style.left = x+'%';
    driverEl.style.top = y+'%';
    $('#trackStatus').textContent = progress<1 ? `Driver en route (${Math.round(progress*100)}%)` : 'Arrived. Enjoy your meal!';
    if(progress<1) trackTimer = requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Contact form
(function contactPage(){
  const form = $('#contactForm'); if(!form) return;
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    toast('Thanks! We will contact: '+data.email);
    form.reset();
  });
})();
