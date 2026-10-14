/* Admin portal: sign in, live orders with bills, menu control, table QR codes and sales summary. */
window.Admin = (function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const { money, esc } = U;
  const root = () => document.getElementById('admin');
  const state = { tab: 'orders', filter: 'all', q: '', sel: null, sound: true };
  const fresh = new Set();
  let known = null, lastSig = '', pollTimer = null, wired = false, authed = false;

  const isAuthed = () => authed || Store.session.get('ic_admin') === '1';
  const visible = () => !root().hidden && isAuthed();
  const orders = () => U.getOrders();

  /* ---------- entry ---------- */
  function mount() {
    if (isAuthed()) { try { shell(); } catch (err) { authed = false; login(); $('#lErr').textContent = 'Could not open the dashboard: ' + err.message; } } else login();
    if (!wired) {
      wired = true;
      Store.on(k => { if (k === 'ic_orders' || k === 'ic_menu') refresh(); });
      pollTimer = setInterval(() => { if (visible()) { const s = JSON.stringify(Store.get('ic_orders', [])); if (s !== lastSig) refresh(); } }, 3000);
    }
  }

  /* ---------- login ---------- */
  function login() {
    root().innerHTML = `
      <div class="login">
        <div class="login-art">
          <img src="interior-brick.jpg" alt="">
          <div class="login-shade"></div>
          <div class="login-brand"><h1>Irani Canteen</h1><p>Staff portal. See customer orders and bills, manage the menu and print table QR codes.</p></div>
        </div>
        <div class="login-side">
          <div class="login-card" id="loginForm" role="form" aria-label="Staff sign in">
            <h2>Sign in</h2>
            <p class="muted">Use your staff account to open the order desk.</p>
            <label class="field"><span>Username</span><input id="lUser" autocomplete="username" value="${esc(IC.admin.user)}"></label>
            <label class="field"><span>Password</span><input id="lPass" type="password" autocomplete="current-password" value="${esc(IC.admin.pass)}"></label>
            <label class="check"><input type="checkbox" id="lShow"> Show password</label>
            <p class="form-err" id="lErr" role="alert"></p>
            <button type="button" class="btn primary block" id="lSubmit">Sign in</button>
            <div class="demo-cred">
              <b>Demo login</b>
              <span>Username <code>${esc(IC.admin.user)}</code></span>
              <span>Password <code>${esc(IC.admin.pass)}</code></span>
              <button type="button" class="link-btn" id="lFill">Fill in demo login</button>
            </div>
            <a class="back" href="#top" id="lBack">Back to the customer site</a>
          </div>
        </div>
      </div>`;
    $('#lShow').onchange = e => { $('#lPass').type = e.target.checked ? 'text' : 'password'; };
    $('#lFill').onclick = () => { $('#lUser').value = IC.admin.user; $('#lPass').value = IC.admin.pass; };
    $('#lBack').onclick = e => { e.preventDefault(); App.go(false); };
    const attempt = e => {
      if (e) e.preventDefault();
      const u = $('#lUser').value.trim().toLowerCase(), p = $('#lPass').value.trim();
      if (u === IC.admin.user.toLowerCase() && p === IC.admin.pass) {
        authed = true; Store.session.set('ic_admin', '1'); known = null;
        try { shell(); } catch (err) { authed = false; login(); $('#lErr').textContent = 'Could not open the dashboard: ' + err.message; }
      } else $('#lErr').textContent = 'Username or password is incorrect. Use the demo login shown below.';
    };
    $('#lSubmit').onclick = attempt;
    ['#lUser', '#lPass'].forEach(s => $(s).addEventListener('keydown', e => { if (e.key === 'Enter') attempt(e); }));
  }

  /* ---------- shell ---------- */
  const TABS = [['orders', 'Orders'], ['menu', 'Menu'], ['qr', 'Table QR codes'], ['sales', 'Sales']];
  function shell() {
    root().innerHTML = `
      <div class="adm">
        <aside class="adm-side">
          <div class="adm-logo">Irani Canteen<small>Staff portal</small></div>
          <nav id="admNav" aria-label="Admin sections"></nav>
          <div class="adm-side-foot">
            <button class="link-btn" id="admSite">View customer site</button>
            <button class="btn ghost light sm" id="admOut">Sign out</button>
          </div>
        </aside>
        <section class="adm-main">
          <header class="adm-top">
            <h2 id="admTitle"></h2>
            <label class="check"><input type="checkbox" id="admSound" ${state.sound ? 'checked' : ''}> Sound for new orders</label>
          </header>
          <div id="admView"></div>
        </section>
        <aside class="adm-drawer" id="admDrawer" aria-hidden="true"></aside>
        <div class="adm-scrim" id="admScrim" hidden></div>
      </div>`;
    $('#admSound').onchange = e => { state.sound = e.target.checked; };
    $('#admOut').onclick = () => { authed = false; Store.session.del('ic_admin'); login(); };
    $('#admSite').onclick = () => App.go(false);
    $('#admScrim').onclick = closeDrawer;
    $('#admNav').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { state.tab = b.dataset.tab; closeDrawer(); view(); } };
    known = new Set(orders().map(o => o.id)); lastSig = JSON.stringify(Store.get('ic_orders', []));
    view();
  }

  function renderNav() {
    const pending = orders().filter(o => o.status === 'new').length;
    $('#admNav').innerHTML = TABS.map(([id, n]) =>
      `<button data-tab="${id}" class="${state.tab === id ? 'on' : ''}">${n}${id === 'orders' && pending ? `<span class="badge">${pending}</span>` : ''}</button>`).join('');
    $('#admTitle').textContent = TABS.find(t => t[0] === state.tab)[1];
  }

  function view() {
    renderNav();
    ({ orders: viewOrders, menu: viewMenu, qr: viewQR, sales: viewSales })[state.tab]();
  }

  /* ---------- live refresh ---------- */
  function refresh() {
    if (!visible()) return;
    const list = orders(); lastSig = JSON.stringify(Store.get('ic_orders', []));
    if (known) {
      const added = list.filter(o => !known.has(o.id));
      if (added.length) {
        added.forEach(o => { fresh.add(o.id); setTimeout(() => { fresh.delete(o.id); if (visible() && state.tab === 'orders') ordersParts(); }, 8000); });
        const o = added[0];
        U.toast(`New order ${o.id}, ${o.type === 'dine-in' ? 'Table ' + o.table : 'takeaway'}, ${money(o.total)}`);
        if (state.sound) beep();
      }
      known = new Set(list.map(o => o.id));
    }
    renderNav();
    if (state.tab === 'orders') ordersParts();
    if (state.tab === 'sales') viewSales();
    if (state.tab === 'menu' && !document.activeElement.closest('#admView')) viewMenu();
    if (state.sel) drawer(state.sel);
  }
  function beep() {
    try {
      const A = window.AudioContext || window.webkitAudioContext; const c = new A();
      [660, 880].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; o.connect(g); g.connect(c.destination);
        g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.16); g.gain.exponentialRampToValueAtTime(0.18, c.currentTime + i * 0.16 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.16 + 0.15); o.start(c.currentTime + i * 0.16); o.stop(c.currentTime + i * 0.16 + 0.17); });
    } catch (e) { /* sound is optional */ }
  }

  /* ---------- orders view ---------- */
  function viewOrders() {
    $('#admView').innerHTML = `
      <div class="stats" id="oStats"></div>
      <div class="toolbar">
        <div class="filters" id="oFilters" role="group" aria-label="Filter by status"></div>
        <input class="search" id="oSearch" type="search" placeholder="Search by order ID, name or table" value="${esc(state.q)}" aria-label="Search orders">
      </div>
      <div class="table-wrap"><table class="otable">
        <thead><tr><th>Order</th><th>Guest</th><th>Service</th><th>Items</th><th class="n">Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
        <tbody id="oRows"></tbody></table></div>`;
    $('#oSearch').oninput = e => { state.q = e.target.value; ordersParts(true); };
    $('#oFilters').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { state.filter = b.dataset.f; ordersParts(); } };
    $('#oRows').onclick = e => {
      const adv = e.target.closest('[data-adv]'); if (adv) { advance(adv.dataset.adv); return; }
      const tr = e.target.closest('tr[data-open]'); if (tr) openDrawer(tr.dataset.open);
    };
    ordersParts();
  }

  const pill = s => `<span class="pill s-${s}">${U.STATUS[s]}</span>`;
  const NEXT = { new: ['preparing', 'Accept'], preparing: ['ready', 'Mark ready'], ready: ['served', 'Mark served'] };

  function ordersParts() {
    if (!$('#oRows')) return;
    const all = orders(); const today = all.filter(o => U.sameDay(o.createdAt, Date.now()));
    const live = today.filter(o => o.status !== 'cancelled');
    const rev = live.reduce((s, o) => s + o.total, 0);
    $('#oStats').innerHTML = `
      <div class="stat"><span>Orders today</span><b>${live.length}</b></div>
      <div class="stat"><span>Sales today</span><b>${money(rev)}</b></div>
      <div class="stat"><span>In the kitchen</span><b>${all.filter(o => o.status === 'new' || o.status === 'preparing').length}</b></div>
      <div class="stat"><span>Average bill</span><b>${live.length ? money(Math.round(rev / live.length)) : '₹0'}</b></div>`;
    const counts = s => s === 'all' ? all.length : all.filter(o => o.status === s).length;
    $('#oFilters').innerHTML = ['all', ...U.FLOW, 'cancelled'].map(s =>
      `<button data-f="${s}" class="${state.filter === s ? 'on' : ''}">${s === 'all' ? 'All' : U.STATUS[s]} <i>${counts(s)}</i></button>`).join('');
    const q = state.q.trim().toLowerCase();
    const rows = all.filter(o => (state.filter === 'all' || o.status === state.filter) &&
      (!q || [o.id, o.name, o.phone, o.type === 'dine-in' ? 'table ' + o.table : 'takeaway'].join(' ').toLowerCase().includes(q)));
    $('#oRows').innerHTML = rows.length ? rows.map(o => {
      const n = NEXT[o.status];
      return `<tr data-open="${o.id}" class="${fresh.has(o.id) ? 'fresh' : ''} ${state.sel === o.id ? 'sel' : ''}">
        <td><b>${o.id}</b>${fresh.has(o.id) ? ' <span class="new-tag">New</span>' : ''}<small>${U.timeStr(o.createdAt)}</small></td>
        <td>${esc(o.name)}<small>${esc(o.phone)}</small></td>
        <td>${o.type === 'dine-in' ? 'Table ' + o.table : 'Takeaway'}</td>
        <td>${o.items.reduce((s, i) => s + i.qty, 0)} items</td>
        <td class="n"><b>${money(o.total)}</b></td>
        <td>${esc(o.payment)}<small class="${o.paid ? 'ok' : 'due'}">${o.paid ? 'Paid' : 'Due'}</small></td>
        <td>${pill(o.status)}</td>
        <td class="act">${n ? `<button class="btn primary sm" data-adv="${o.id}">${n[1]}</button>` : `<button class="btn ghost sm" tabindex="-1">View bill</button>`}</td></tr>`;
    }).join('') : `<tr><td colspan="8" class="empty-row">No orders match. Orders placed from the customer site appear here instantly.</td></tr>`;
  }

  function advance(id) {
    const o = orders().find(x => x.id === id); if (!o || !NEXT[o.status]) return;
    const next = NEXT[o.status][0];
    U.updateOrder(id, { status: next, paid: next === 'served' ? true : o.paid });
    U.toast(`${id} is now ${U.STATUS[next].toLowerCase()}`);
    refresh();
  }

  /* ---------- order drawer ---------- */
  function openDrawer(id) { state.sel = id; drawer(id); $('#admDrawer').classList.add('open'); $('#admDrawer').setAttribute('aria-hidden', 'false'); $('#admScrim').hidden = false; ordersParts(); }
  function closeDrawer() { state.sel = null; const d = $('#admDrawer'); if (d) { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); } const s = $('#admScrim'); if (s) s.hidden = true; if ($('#oRows')) ordersParts(); }
  function drawer(id) {
    const o = orders().find(x => x.id === id); const d = $('#admDrawer'); if (!o || !d) return;
    const n = NEXT[o.status]; const canCancel = o.status !== 'served' && o.status !== 'cancelled';
    d.innerHTML = `
      <div class="drawer-head"><div><h3>${o.id}</h3>${pill(o.status)}</div><button class="icon-btn" id="dClose">Close</button></div>
      <div class="drawer-body">
        <dl class="kv">
          <div><dt>Guest</dt><dd>${esc(o.name)}, <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></dd></div>
          <div><dt>Service</dt><dd>${o.type === 'dine-in' ? 'Dine-in, Table ' + o.table : 'Takeaway'}</dd></div>
          <div><dt>Placed</dt><dd>${U.dateStr(o.createdAt)}, ${U.timeStr(o.createdAt)}</dd></div>
          <div><dt>Payment</dt><dd>${esc(o.payment)}, ${o.paid ? 'paid' : 'due at the counter'}</dd></div>
        </dl>
        ${o.note ? `<div class="note"><b>Kitchen note</b><p>${esc(o.note)}</p></div>` : ''}
        <div class="bill-wrap">${U.billHTML(o)}</div>
      </div>
      <div class="drawer-foot">
        ${n ? `<button class="btn primary" id="dAdv">${n[1]}</button>` : ''}
        ${!o.paid && o.status !== 'cancelled' ? `<button class="btn ghost" id="dPaid">Mark as paid</button>` : ''}
        <button class="btn ghost" id="dPrint">Print bill</button>
        ${canCancel ? `<button class="btn danger" id="dCancel">Cancel order</button>` : ''}
      </div>`;
    $('#dClose').onclick = closeDrawer;
    $('#dPrint').onclick = () => U.printHTML(U.billHTML(o));
    if ($('#dAdv')) $('#dAdv').onclick = () => advance(id);
    if ($('#dPaid')) $('#dPaid').onclick = () => { U.updateOrder(id, { paid: true }); refresh(); U.toast(id + ' marked as paid'); };
    if ($('#dCancel')) $('#dCancel').onclick = () => { if (confirm('Cancel order ' + id + '?')) { U.updateOrder(id, { status: 'cancelled' }); refresh(); } };
  }

  /* ---------- menu view ---------- */
  function viewMenu() {
    const m = U.getMenu();
    $('#admView').innerHTML = `<p class="muted lead">Turn items off when they run out, or change a price. Changes show on the customer site straight away.</p>` +
      IC.categories.map(c => `<section class="mgroup"><h3>${c.name}</h3>
        ${m.filter(x => x.cat === c.id).map(x => `<div class="mrow ${x.available ? '' : 'off'}">
          <div><b>${esc(x.name)}</b><small>${x.veg ? 'Veg' : 'Non-veg'}</small></div>
          <label class="price-in"><span>₹</span><input type="number" min="0" step="1" value="${x.price}" data-price="${x.id}" aria-label="Price for ${esc(x.name)}"></label>
          <label class="switch"><input type="checkbox" data-avail="${x.id}" ${x.available ? 'checked' : ''}><i></i><span>${x.available ? 'Available' : 'Sold out'}</span></label>
        </div>`).join('')}</section>`).join('') +
      `<button class="btn ghost" id="mReset">Reset prices and availability</button>`;
    const v = $('#admView');
    v.onchange = e => {
      const ov = Store.get('ic_menu', {});
      if (e.target.dataset.price) { const id = e.target.dataset.price; ov[id] = Object.assign({}, ov[id], { price: Math.max(0, Number(e.target.value) || 0) }); Store.set('ic_menu', ov); U.toast('Price updated'); }
      if (e.target.dataset.avail) { const id = e.target.dataset.avail; ov[id] = Object.assign({}, ov[id], { available: e.target.checked }); Store.set('ic_menu', ov); viewMenu(); }
    };
    $('#mReset').onclick = () => { Store.set('ic_menu', {}); viewMenu(); U.toast('Menu reset'); };
  }

  /* ---------- QR view ---------- */
  const sticker = k => `<div class="qr-sticker"><b>Irani Canteen</b><div class="qs-qr">${IC_QR[k]}</div>
    <strong>${k === 'takeaway' ? 'Takeaway counter' : 'Table ' + k}</strong><span>Scan to see the menu and order from your seat.</span></div>`;
  function viewQR() {
    const keys = [...Array.from({ length: IC.tables }, (_, i) => String(i + 1)), 'takeaway'];
    $('#admView').innerHTML = `<div class="qr-head"><p class="muted lead">Print one sticker per table. Each QR code holds the table number, so orders arrive with the right table already attached.</p>
      <button class="btn primary" id="qAll">Print all stickers</button></div>
      <div class="qr-grid">${keys.map(k => `<div class="qr-tile">${sticker(k)}<button class="btn ghost sm" data-q="${k}">Print this one</button></div>`).join('')}</div>`;
    $('#qAll').onclick = () => U.printHTML(`<div class="sticker-sheet">${keys.map(sticker).join('')}</div>`);
    $('#admView').onclick = e => { const b = e.target.closest('[data-q]'); if (b) U.printHTML(`<div class="sticker-sheet one">${sticker(b.dataset.q)}</div>`); };
  }

  /* ---------- sales view ---------- */
  function viewSales() {
    const all = orders().filter(o => o.status !== 'cancelled' && U.sameDay(o.createdAt, Date.now()));
    const rev = all.reduce((s, o) => s + o.total, 0);
    const days = [...U.history.map(h => ({ label: h.label, revenue: h.revenue })), { label: 'Today', revenue: Math.round(rev) }];
    const max = Math.max(...days.map(d => d.revenue), 1);
    const top = {}; all.forEach(o => o.items.forEach(i => { top[i.name] = (top[i.name] || 0) + i.qty; }));
    const topList = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const pay = {}; all.forEach(o => { pay[o.payment] = (pay[o.payment] || 0) + o.total; });
    const week = days.reduce((s, d) => s + d.revenue, 0);
    $('#admView').innerHTML = `
      <div class="stats">
        <div class="stat"><span>Sales today</span><b>${money(rev)}</b></div>
        <div class="stat"><span>Orders today</span><b>${all.length}</b></div>
        <div class="stat"><span>Average bill</span><b>${all.length ? money(Math.round(rev / all.length)) : '₹0'}</b></div>
        <div class="stat"><span>Last 7 days</span><b>${money(week)}</b></div>
      </div>
      <div class="panel"><h3>Sales, last 7 days</h3>
        <div class="bars">${days.map(d => `<div class="bar"><i style="height:${Math.max(4, d.revenue / max * 100)}%"></i><b>${money(d.revenue)}</b><span>${d.label}</span></div>`).join('')}</div>
        <p class="muted sm">Earlier days are sample figures for the demo. Today is calculated from the live orders.</p></div>
      <div class="two">
        <div class="panel"><h3>Most ordered today</h3>${topList.length ? `<ul class="rank">${topList.map(([n, q]) => `<li><span>${esc(n)}</span><b>${q}</b></li>`).join('')}</ul>` : '<p class="muted">No orders yet today.</p>'}</div>
        <div class="panel"><h3>Payment split today</h3>${Object.keys(pay).length ? `<ul class="rank">${Object.entries(pay).map(([n, v]) => `<li><span>${esc(n)}</span><b>${money(Math.round(v))}</b></li>`).join('')}</ul>` : '<p class="muted">No payments yet today.</p>'}</div>
      </div>`;
  }

  return { mount };
})();
