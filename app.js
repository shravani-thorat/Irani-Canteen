/* Customer site: menu, cart, QR scanner, order placing and live tracking, plus hash routing. */
window.App = (function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const { money, esc } = U;

  let cart = Store.get('ic_cart', {});
  let ctx = Store.get('ic_ctx', { type: 'dine-in', table: null, name: '', phone: '', pay: 'Pay at counter', note: '' });
  let activeCat = IC.categories[0].id;
  let trackedId = Store.get('ic_last', null);
  let openModalId = null, lastOrderSig = '';
  let stream = null, scanTimer = null;
  let adminOn = location.hash.indexOf('#/admin') === 0;

  const menu = () => U.getMenu();
  const byId = id => menu().find(m => m.id === id);
  const saveCart = () => Store.set('ic_cart', cart);
  const saveCtx = () => Store.set('ic_ctx', ctx);

  /* ---------- overlays ---------- */
  function openLayer(el, withScrim) {
    el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
    if (withScrim) { $('#scrim').hidden = false; }
    document.body.classList.add('locked');
    const f = el.querySelector('button, input, select'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
  }
  function closeLayers() {
    $$('.drawer.open, .modal.open').forEach(el => { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); });
    $('#scrim').hidden = true; document.body.classList.remove('locked');
    stopCamera(); openModalId = null;
  }

  /* ---------- hero, signature, reviews ---------- */
  function renderStatic() {
    $('#sigGrid').innerHTML = IC.featured.map((id, i) => {
      const m = byId(id);
      return `<article class="sig sig-${i + 1}">
        <img src="${m.img}" alt="">
        <div class="sig-shade"></div>
        <div class="sig-body">
          <h3>${esc(m.name)}</h3>
          <p>${esc(m.desc)}</p>
          <div class="sig-row"><b>${money(m.price)}</b>
          <button class="btn primary sm" data-add="${m.id}" ${m.available ? '' : 'disabled'}>${m.available ? 'Add to cart' : 'Sold out'}</button></div>
        </div>
      </article>`;
    }).join('');

    $('#ratingRow').innerHTML = IC.ratings.map(r =>
      `<div class="rating"><b>${r.score}</b><span>${r.src}</span><small>${r.count}</small></div>`).join('');
    $('#quoteRow').innerHTML = IC.reviews.map(r =>
      `<blockquote><p>${esc(r.text)}</p><footer>${esc(r.who)}, Google review</footer></blockquote>`).join('');
  }

  /* ---------- menu ---------- */
  function renderTabs() {
    $('#menuTabs').innerHTML = IC.categories.map(c =>
      `<button role="tab" class="tab ${c.id === activeCat ? 'on' : ''}" data-cat="${c.id}" aria-selected="${c.id === activeCat}">${c.name}</button>`).join('');
  }
  function stepper(m) {
    const q = cart[m.id] || 0;
    if (!m.available) return `<button class="btn sm" disabled>Sold out</button>`;
    if (!q) return `<button class="btn primary sm" data-add="${m.id}">Add</button>`;
    return `<div class="stepper"><button data-dec="${m.id}" aria-label="Remove one ${esc(m.name)}">−</button><b>${q}</b><button data-add="${m.id}" aria-label="Add one ${esc(m.name)}">+</button></div>`;
  }
  function renderMenu() {
    const items = menu().filter(m => m.cat === activeCat);
    $('#menuList').innerHTML = items.map(m => `
      <article class="item ${m.available ? '' : 'off'}">
        ${m.img ? `<img class="thumb" src="${m.img}" alt="">` : `<div class="thumb mono" aria-hidden="true">${esc(m.name[0])}</div>`}
        <div class="item-main">
          <h4><i class="dot ${m.veg ? 'veg' : 'nonveg'}" title="${m.veg ? 'Vegetarian' : 'Non-vegetarian'}"></i>${esc(m.name)}${m.tag ? ` <span class="tag">${esc(m.tag)}</span>` : ''}</h4>
          <p>${esc(m.desc)}</p>
        </div>
        <div class="item-side"><b>${money(m.price)}</b>${stepper(m)}</div>
      </article>`).join('');
  }

  /* ---------- cart ---------- */
  function lines() {
    return Object.entries(cart).map(([id, qty]) => { const m = byId(id); return m ? { id, name: m.name, price: m.price, qty } : null; }).filter(Boolean);
  }
  function renderCount() {
    const n = lines().reduce((s, l) => s + l.qty, 0);
    $('#cartCount').textContent = n; $('#cartCount').classList.toggle('on', n > 0);
  }
  function renderBadge() {
    const b = $('#tableBadge');
    if (ctx.type === 'dine-in' && ctx.table) { b.hidden = false; b.textContent = 'Table ' + ctx.table; }
    else if (ctx.type === 'takeaway' && ctx.fromScan) { b.hidden = false; b.textContent = 'Takeaway'; }
    else b.hidden = true;
  }
  function renderCart() {
    const ls = lines(); const body = $('#cartBody');
    if (!ls.length) {
      body.innerHTML = `<div class="empty"><h4>Your cart is empty</h4><p>Add chai, bun maska or kheema pav from the menu.</p><button class="btn primary" data-go="menu">Browse the menu</button></div>`;
      return;
    }
    const t = U.totals(ls);
    const tableOpts = Array.from({ length: IC.tables }, (_, i) => `<option value="${i + 1}" ${ctx.table == i + 1 ? 'selected' : ''}>Table ${i + 1}</option>`).join('');
    body.innerHTML = `
      <ul class="cart-lines">${ls.map(l => `<li><div><b>${esc(l.name)}</b><small>${money(l.price)} each</small></div>
        <div class="stepper"><button data-dec="${l.id}" aria-label="Remove one">−</button><b>${l.qty}</b><button data-add="${l.id}" aria-label="Add one">+</button></div>
        <span class="line-total">${money(l.price * l.qty)}</span></li>`).join('')}</ul>

      <div class="seg" role="group" aria-label="Order type">
        <button class="${ctx.type === 'dine-in' ? 'on' : ''}" data-type="dine-in">Dine-in</button>
        <button class="${ctx.type === 'takeaway' ? 'on' : ''}" data-type="takeaway">Takeaway</button>
      </div>
      ${ctx.type === 'dine-in' ? `<label class="field"><span>Table</span>
        <select id="fTable"><option value="">Choose your table</option>${tableOpts}</select>
        <small>Scan the QR on your table to fill this in.</small></label>` : ''}
      <div class="field-row">
        <label class="field"><span>Your name</span><input id="fName" autocomplete="name" value="${esc(ctx.name)}" placeholder="Name for the order"></label>
        <label class="field"><span>Mobile number</span><input id="fPhone" inputmode="numeric" maxlength="10" autocomplete="tel" value="${esc(ctx.phone)}" placeholder="10 digits"></label>
      </div>
      <label class="field"><span>Note for the kitchen</span><textarea id="fNote" rows="2" placeholder="Less sugar, no onion, and so on">${esc(ctx.note)}</textarea></label>
      <fieldset class="pay"><legend>Payment</legend>
        ${['Pay at counter', 'UPI', 'Card at counter'].map(p => `<label class="radio"><input type="radio" name="pay" value="${p}" ${ctx.pay === p ? 'checked' : ''}><span>${p}${p === 'UPI' ? ' (demo, marked paid)' : ''}</span></label>`).join('')}
      </fieldset>
      <div class="sum">
        <div><span>Subtotal</span><b>${money(t.subtotal)}</b></div>
        <div><span>GST 5%</span><b>${money(t.gst)}</b></div>
        <div class="grand"><span>Total</span><b>${money(t.total)}</b></div>
      </div>
      <p class="form-err" id="cartErr" role="alert"></p>
      <button class="btn primary block" id="placeBtn">Place order, ${money(t.total)}</button>`;
  }
  function add(id) { const m = byId(id); if (!m || !m.available) return; cart[id] = (cart[id] || 0) + 1; afterCart(); }
  function dec(id) { if (!cart[id]) return; cart[id]--; if (cart[id] <= 0) delete cart[id]; afterCart(); }
  function afterCart() {
    saveCart(); renderCount(); renderMenu(); renderStatic();
    if ($('#cartDrawer').classList.contains('open')) { keepCartForm(); renderCart(); }
  }
  function keepCartForm() {
    const g = id => $('#' + id);
    if (g('fName')) ctx.name = g('fName').value; if (g('fPhone')) ctx.phone = g('fPhone').value;
    if (g('fNote')) ctx.note = g('fNote').value; if (g('fTable')) ctx.table = g('fTable').value || null;
    const p = $('input[name=pay]:checked'); if (p) ctx.pay = p.value; saveCtx();
  }

  function placeOrder() {
    keepCartForm();
    const err = m => { $('#cartErr').textContent = m; };
    const ls = lines();
    if (!ls.length) return err('Add at least one item.');
    if (ctx.type === 'dine-in' && !ctx.table) return err('Choose your table, or scan the QR on it.');
    if (!ctx.name.trim()) return err('Enter your name so we can call you.');
    if (!/^\d{10}$/.test(ctx.phone.trim())) return err('Enter a 10 digit mobile number.');
    const t = U.totals(ls);
    const order = {
      id: U.nextId(), createdAt: Date.now(), type: ctx.type, table: ctx.type === 'dine-in' ? Number(ctx.table) : null,
      name: ctx.name.trim(), phone: ctx.phone.trim(), items: ls, note: ctx.note.trim(),
      subtotal: t.subtotal, gst: t.gst, total: t.total, payment: ctx.pay, paid: ctx.pay === 'UPI', status: 'new'
    };
    U.addOrder(order);
    cart = {}; ctx.note = ''; saveCart(); saveCtx(); renderCount(); renderMenu(); renderStatic();
    trackedId = order.id; Store.set('ic_last', trackedId);
    closeLayers(); showOrder(order.id);
  }

  /* ---------- order modal (confirmation, tracking, bill) ---------- */
  function showOrder(id) {
    openModalId = id; lastOrderSig = ''; renderOrder(); openLayer($('#orderModal'), true);
  }
  function renderOrder() {
    if (!openModalId) return;
    const o = U.getOrders().find(x => x.id === openModalId);
    const body = $('#orderBody');
    const sig = openModalId + JSON.stringify(o || null);
    if (sig === lastOrderSig) return;
    lastOrderSig = sig;
    if (!o) { $('#orderTitle').textContent = 'Order not found'; body.innerHTML = '<p class="muted">We could not find that order. Check the order ID and try again.</p>' + trackForm(); wireTrack(); return; }
    $('#orderTitle').textContent = 'Order ' + o.id;
    const idx = U.FLOW.indexOf(o.status);
    const msg = {
      new: 'We have your order. The kitchen will accept it in a moment.',
      preparing: 'The kitchen is preparing your order.',
      ready: o.type === 'dine-in' ? 'Your order is ready and on its way to your table.' : 'Your order is ready. Collect it at the counter.',
      served: 'Enjoy your meal. Thank you for visiting.',
      cancelled: 'This order was cancelled. Please speak to the staff at the counter.'
    }[o.status];
    const track = o.status === 'cancelled' ? `<div class="cancelled">Order cancelled</div>` :
      `<ol class="track">${U.FLOW.map((s, i) => `<li class="${i < idx ? 'done' : ''} ${i === idx ? 'now' : ''}"><i></i><span>${U.STATUS[s]}</span></li>`).join('')}</ol>`;
    body.innerHTML = `
      <p class="order-msg">${msg}</p>
      ${track}
      <div class="bill-wrap">${U.billHTML(o)}</div>
      <div class="modal-actions">
        <button class="btn ghost" id="printBill">Print or save bill</button>
        <button class="btn primary" data-go="menu">Order more</button>
      </div>`;
    $('#printBill').onclick = () => U.printHTML(U.billHTML(o));
  }
  function trackForm() {
    return `<div class="track-form" id="trackForm"><label class="field"><span>Order ID</span><input id="trackId" placeholder="For example IC-1049" value="${esc(trackedId || '')}"></label><button type="button" class="btn primary" id="trackGo">Track order</button></div>`;
  }
  function wireTrack() {
    const f = $('#trackForm'); if (!f) return;
    const go = () => { const v = $('#trackId').value.trim().toUpperCase(); if (v) { openModalId = v; lastOrderSig = ''; renderOrder(); } };
    $('#trackGo').onclick = go;
    $('#trackId').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
  function openTrack() {
    if (trackedId && U.getOrders().some(o => o.id === trackedId)) return showOrder(trackedId);
    openModalId = '__ask'; $('#orderTitle').textContent = 'Track your order';
    $('#orderBody').innerHTML = '<p class="muted">Enter the order ID shown after you placed your order.</p>' + trackForm();
    wireTrack(); openLayer($('#orderModal'), true);
    openModalId = null;
  }

  /* ---------- QR scanner ---------- */
  function applyScan(text) {
    const mt = /TABLE[:\/=](\d+)/i.exec(text || '');
    const tk = /TAKEAWAY/i.test(text || '');
    if (!mt && !tk) { setScanMsg('That QR code is not from Irani Canteen. Try the one on your table.', true); return false; }
    if (mt) {
      const n = Number(mt[1]);
      if (n < 1 || n > IC.tables) { setScanMsg('That table number does not exist here.', true); return false; }
      ctx.type = 'dine-in'; ctx.table = n; ctx.fromScan = true;
    } else { ctx.type = 'takeaway'; ctx.table = null; ctx.fromScan = true; }
    saveCtx(); renderBadge(); closeLayers();
    U.toast(mt ? `Table ${ctx.table} linked. Pick what you would like.` : 'Takeaway selected. Pick what you would like.');
    document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
    return true;
  }
  function setScanMsg(t, bad) { const m = $('#scanMsg'); m.textContent = t; m.classList.toggle('bad', !!bad); }
  async function startCamera() {
    const v = $('#scanVideo');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setScanMsg('Camera is not available here. Use the demo buttons below.'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      v.srcObject = stream; await v.play(); $('#viewfinder').classList.add('live');
      if (!('BarcodeDetector' in window)) { setScanMsg('This browser cannot read QR codes from the camera. Use the demo buttons below.'); return; }
      const det = new BarcodeDetector({ formats: ['qr_code'] });
      setScanMsg('Point your camera at the QR code on your table.');
      scanTimer = setInterval(async () => {
        try { const r = await det.detect(v); if (r.length && applyScan(r[0].rawValue)) clearInterval(scanTimer); } catch (e) { /* keep trying */ }
      }, 350);
    } catch (e) { setScanMsg('Camera permission was blocked. Use the demo buttons below.'); }
  }
  function stopCamera() {
    clearInterval(scanTimer);
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    const v = $('#scanVideo'); if (v) v.srcObject = null;
    const vf = $('#viewfinder'); if (vf) vf.classList.remove('live');
  }
  function openScanner() {
    $('#scanChips').innerHTML = Array.from({ length: IC.tables }, (_, i) => `<button class="chip" data-scan="IRANI-CANTEEN:TABLE:${i + 1}">Table ${i + 1}</button>`).join('') +
      `<button class="chip" data-scan="IRANI-CANTEEN:TAKEAWAY">Takeaway</button>`;
    setScanMsg('Point your camera at the QR code on your table.');
    openLayer($('#scanModal'), true); startCamera();
  }

  /* ---------- QR preview card ---------- */
  let demoTable = '5';
  function renderQR() {
    $('#qrDemo').innerHTML = IC_QR[demoTable];
    $('#qrCap').textContent = demoTable === 'takeaway' ? 'Takeaway counter' : 'Table ' + demoTable;
    $('#qrPick').innerHTML = Array.from({ length: IC.tables }, (_, i) => `<button class="chip ${demoTable == i + 1 ? 'on' : ''}" data-qr="${i + 1}">${i + 1}</button>`).join('');
  }

  /* ---------- routing ---------- */
  function route() {
    const h = location.hash;
    const isAdmin = adminOn;
    $('#site').hidden = isAdmin; $('#admin').hidden = !isAdmin;
    document.body.classList.toggle('is-admin', isAdmin);
    $('#dbSite').classList.toggle('on', !isAdmin); $('#dbAdmin').classList.toggle('on', isAdmin);
    if (isAdmin) { closeLayers(); Admin.mount(); window.scrollTo(0, 0); return; }
    const t = /^#\/table\/(\d+)/.exec(h);
    if (t) { applyScan('TABLE:' + t[1]); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ } }
  }
  /* Switch between site and admin without depending on URL hash changes (works in sandboxed viewers too) */
  function go(toAdmin) {
    adminOn = !!toAdmin;
    try { history.replaceState(null, '', location.pathname + location.search + (adminOn ? '#/admin' : '')); } catch (e) { /* ignore */ }
    route();
  }

  /* ---------- wiring ---------- */
  function wire() {
    document.addEventListener('click', e => {
      const t = e.target.closest('button, a'); if (!t) return;
      if (t.tagName === 'A' && (t.getAttribute('href') || '').charAt(0) === '#') {
        const href = t.getAttribute('href');
        if (href === '#/admin') { e.preventDefault(); return go(true); }
        if (href.length > 1 && href.indexOf('#/') !== 0) { e.preventDefault(); const el = href === '#top' ? document.body : document.getElementById(href.slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
      }
      if (t.dataset.add) return add(t.dataset.add);
      if (t.dataset.dec) return dec(t.dataset.dec);
      if (t.dataset.cat) { activeCat = t.dataset.cat; renderTabs(); renderMenu(); return; }
      if (t.dataset.go) { closeLayers(); const el = document.getElementById(t.dataset.go); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
      if (t.dataset.type) { keepCartForm(); ctx.type = t.dataset.type; ctx.fromScan = false; saveCtx(); renderCart(); renderBadge(); return; }
      if (t.dataset.scan) return applyScan(t.dataset.scan);
      if (t.dataset.qr) { demoTable = t.dataset.qr; return renderQR(); }
      if (t.hasAttribute('data-close')) return closeLayers();
      if (t.id === 'placeBtn') return placeOrder();
    });
    $('#scrim').addEventListener('click', closeLayers);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLayers(); });
    $('#openCart').onclick = () => { renderCart(); openLayer($('#cartDrawer'), true); };
    $('#openScan').onclick = openScanner; $('#heroScan').onclick = openScanner; $('#scanBtn2').onclick = openScanner;
    $('#openTrack').onclick = openTrack;
    $('#tableBadge').onclick = openScanner;
    $('#cartBody').addEventListener('change', e => { if (e.target.name === 'pay' || e.target.id === 'fTable') keepCartForm(); });
    $('#dbSite').onclick = () => go(false);
    $('#dbAdmin').onclick = () => go(true);
    window.addEventListener('hashchange', () => { adminOn = location.hash.indexOf('#/admin') === 0; route(); });
    window.addEventListener('scroll', () => $('#nav').classList.toggle('solid', window.scrollY > 40), { passive: true });
    Store.on(k => {
      if (k === 'ic_orders') renderOrder();
      if (k === 'ic_menu') { renderMenu(); renderStatic(); }
    });
  }

  function boot() {
    renderStatic(); renderTabs(); renderMenu(); renderCount(); renderBadge(); renderQR();
    $('#demoBar').hidden = !IC.showDemoBar;
    wire(); route(); U.getOrders();
    setInterval(() => { if (openModalId) renderOrder(); }, 3000);
  }
  return { boot, route, go };
})();
