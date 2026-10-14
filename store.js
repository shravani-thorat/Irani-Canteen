/* Shared state (localStorage with in-memory fallback), helpers and bill template.
   Customer site and admin portal both read and write the same keys, so an order
   placed in one tab shows up in the admin portal in another tab straight away. */
(function () {
  const mem = {};
  const subs = [];
  let storageOK = true;
  try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch (e) { storageOK = false; }

  const Store = {
    get(k, def) {
      try {
        if (storageOK) { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); }
      } catch (e) { /* fall through */ }
      return k in mem ? mem[k] : def;
    },
    set(k, v) {
      mem[k] = v;
      try { if (storageOK) localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* memory only */ }
      subs.forEach(fn => fn(k));
    },
    session: {
      get(k) { try { return sessionStorage.getItem(k); } catch (e) { return mem['s_' + k] || null; } },
      set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { mem['s_' + k] = v; } },
      del(k) { try { sessionStorage.removeItem(k); } catch (e) { delete mem['s_' + k]; } }
    },
    on(fn) { subs.push(fn); }
  };
  window.addEventListener('storage', e => { if (e.key) subs.forEach(fn => fn(e.key)); });

  const money = n => { n = Number(n); const d = Number.isInteger(n) ? 0 : 2; return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: 2 }); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const timeStr = t => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const dateStr = t => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

  const STATUS = {
    new: 'Received', preparing: 'Preparing', ready: 'Ready', served: 'Served', cancelled: 'Cancelled'
  };
  const FLOW = ['new', 'preparing', 'ready', 'served'];

  /* menu with admin overrides (price / availability) */
  function getMenu() {
    const ov = Store.get('ic_menu', {});
    return IC.menu.map(m => {
      const o = ov[m.id] || {};
      return Object.assign({}, m, { price: o.price != null ? o.price : m.price, available: o.available !== false });
    });
  }

  function totals(items) {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const gst = Math.round(subtotal * IC.gstRate * 100) / 100;
    return { subtotal, gst, total: Math.round((subtotal + gst) * 100) / 100 };
  }

  function getOrders() { seed(); return Store.get('ic_orders', []); }
  function saveOrders(list) { Store.set('ic_orders', list); }
  function nextId() {
    const n = Store.get('ic_seq', 1048) + 1;
    Store.set('ic_seq', n);
    return 'IC-' + n;
  }

  function addOrder(o) {
    const list = getOrders();
    list.unshift(o);
    saveOrders(list);
    return o;
  }
  function updateOrder(id, patch) {
    const list = getOrders().map(o => o.id === id ? Object.assign({}, o, patch) : o);
    saveOrders(list);
  }

  /* demo data so the admin portal is not empty on first open */
  function seed() {
    if (Store.get('ic_seeded', false)) return;
    const mk = (id, minsAgo, type, table, name, phone, lines, status, pay, paid, note) => {
      const menu = IC.menu;
      const items = lines.map(([mid, qty]) => { const m = menu.find(x => x.id === mid); return { id: m.id, name: m.name, price: m.price, qty }; });
      return Object.assign({
        id, createdAt: Date.now() - minsAgo * 60000, type, table, name, phone, items,
        status, payment: pay, paid, note: note || ''
      }, totals(items));
    };
    const list = [
      mk('IC-1048', 4, 'dine-in', 5, 'Aarav Mehta', '9820011122', [['irani-chai', 2], ['bun-maska', 2], ['egg-kejriwal', 1]], 'new', 'Pay at counter', false, 'Less sugar in the chai please'),
      mk('IC-1047', 12, 'dine-in', 2, 'Sneha Kulkarni', '9930022233', [['mutton-kheema-pao', 1], ['caramel-custard', 1], ['raspberry-soda', 1]], 'preparing', 'UPI', true),
      mk('IC-1046', 21, 'takeaway', null, 'Imran Shaikh', '9769033344', [['chicken-puff', 3], ['irani-chai', 2]], 'ready', 'UPI', true),
      mk('IC-1045', 38, 'dine-in', 8, 'Priya Nair', '9004044455', [['akuri-pao', 1], ['bun-maska-tea', 2], ['mawa-cupcake', 2]], 'served', 'Card at counter', true),
      mk('IC-1044', 63, 'dine-in', 11, 'Rohan Desai', '9833055566', [['chicken-farcha', 1], ['marghi-dhansak', 1], ['steamed-rice', 2]], 'served', 'UPI', true),
      mk('IC-1043', 95, 'takeaway', null, 'Farah Irani', '9821066677', [['bread-pudding', 2], ['choco-cookies', 2]], 'served', 'Cash at counter', true),
      mk('IC-1042', 140, 'dine-in', 3, 'Kunal Joshi', '9870077788', [['chicken-kheema-pao', 2], ['ice-cream-soda', 2]], 'cancelled', 'Pay at counter', false, 'Guest left before the order was prepared')
    ];
    Store.set('ic_orders', list);
    Store.set('ic_seq', 1048);
    Store.set('ic_seeded', true);
  }

  /* previous six days, for the sales chart (sample figures) */
  const history = [
    { d: -6, orders: 61, revenue: 18420 }, { d: -5, orders: 68, revenue: 21350 }, { d: -4, orders: 64, revenue: 19780 },
    { d: -3, orders: 77, revenue: 24610 }, { d: -2, orders: 72, revenue: 22900 }, { d: -1, orders: 91, revenue: 28640 }
  ].map(h => { const t = new Date(); t.setDate(t.getDate() + h.d); return Object.assign(h, { label: t.toLocaleDateString('en-IN', { weekday: 'short' }) }); });

  function billHTML(o) {
    const rows = o.items.map(i => `<tr><td>${esc(i.name)}</td><td class="n">${i.qty}</td><td class="n">${money(i.price)}</td><td class="n">${money(i.price * i.qty)}</td></tr>`).join('');
    const half = o.gst / 2;
    return `<div class="bill">
      <div class="bill-head"><strong>${esc(IC.brand.name)}</strong>
        <span>${esc(IC.brand.address)}</span>
        <span>Phone ${esc(IC.brand.phone)}</span>
        <span>GSTIN ${esc(IC.brand.gstin)}</span></div>
      <div class="bill-meta">
        <div><span>Bill no.</span><b>${esc(o.id)}</b></div>
        <div><span>Date</span><b>${dateStr(o.createdAt)}, ${timeStr(o.createdAt)}</b></div>
        <div><span>Service</span><b>${o.type === 'dine-in' ? 'Dine-in, Table ' + esc(o.table) : 'Takeaway'}</b></div>
        <div><span>Guest</span><b>${esc(o.name)}</b></div>
      </div>
      <table class="bill-table"><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="bill-sum">
        <div><span>Subtotal</span><b>${money(o.subtotal)}</b></div>
        <div><span>CGST 2.5%</span><b>${money(half)}</b></div>
        <div><span>SGST 2.5%</span><b>${money(half)}</b></div>
        <div class="grand"><span>Total</span><b>${money(o.total)}</b></div>
      </div>
      <div class="bill-foot"><span>${esc(o.payment)}: ${o.paid ? 'Paid' : 'Payment due'}</span><span>Thank you. See you for chai tomorrow.</span></div>
    </div>`;
  }

  function printHTML(html) {
    let root = document.getElementById('printRoot');
    if (!root) { root = document.createElement('div'); root.id = 'printRoot'; document.body.appendChild(root); }
    root.innerHTML = html;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 60);
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  window.Store = Store;
  window.U = { money, esc, timeStr, dateStr, sameDay, STATUS, FLOW, getMenu, totals, getOrders, saveOrders, nextId, addOrder, updateOrder, history, billHTML, printHTML, toast };
})();
