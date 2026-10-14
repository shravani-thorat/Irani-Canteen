# Irani Canteen: demo website with admin portal and QR ordering

One project folder, every file sits directly inside it (no sub-folders). Plain HTML, CSS and JavaScript, no build step, no server.

## Open it
- Double-click `index.html` (keep all files together in this folder), or upload the folder to any static host (GitHub Pages, Netlify).
- `Irani-Canteen-Demo.html` (shipped next to this folder) is the same site as one self-contained file for sending by email or WhatsApp.

## Demo workflow
1. Customer site: browse the menu, tap **Scan table** (camera QR scan, or tap a table to simulate), add items, place the order.
2. The customer sees a live tracker (Received, Preparing, Ready, Served) and a GST bill to print or save as PDF.
3. Admin portal: click **Staff login** in the footer, or the **Admin portal** button in the bar at the bottom (or open `admin.html`).
   - Username `admin`, password `irani@123` (already filled in on the login screen).
4. In the portal: see orders and bills, accept / mark ready / mark served, mark paid, cancel, print bills, switch menu items on or off, edit prices, print table QR stickers, view sales.

Tip: open the customer site in one tab and the admin portal in another; new orders show up within seconds.

## Files
```
index.html      customer site + admin portal
admin.html      shortcut to the admin portal
styles.css      site styles, bill and print styles
admin.css       admin portal styles
data.js         brand details, menu, prices, admin login (edit here)
store.js        shared storage, bill template, demo seed orders
app.js          menu, cart, scanner, order tracking
admin.js        login, orders, menu, QR codes, sales
qr-data.js      generated table QR codes (tables 1 to 12 + takeaway)
chai.jpg, egg.jpg, bakes.jpg, cookies.jpg, interior-brick.jpg, interior-wood.jpg   photos
make_qr.py      regenerates qr-data.js (no libraries needed)
build_demo.py   rebuilds the single-file demo
```

## Good to know
- Demo only: data is kept in the browser, with no real server, payment or SMS.
- Prices marked "listed" on Zomato are real; the rest are sample prices. Edit them in `data.js`.
- Each QR holds text like `IRANI-CANTEEN:TABLE:5`. Camera scanning needs a browser with BarcodeDetector (Chrome, Edge, Android); others use the demo table buttons.
- Change the admin login in `data.js`. For a real launch, authenticate on a server.
