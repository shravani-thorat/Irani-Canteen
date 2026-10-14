/* Irani Canteen: brand details, menu and demo settings.
   Prices marked "listed" come from the public Zomato listing; the rest are sample prices. */
window.IC = {
  brand: {
    name: 'Irani Canteen',
    phone: '099673 17996',
    tel: '+919967317996',
    address: 'Shop No. 14/15, Sita Vihar Building, Damani Estate, Teen Hath Naka Flyover, Thane West, Maharashtra 400602',
    hours: '8 AM to 11 PM, every day',
    gstin: '27AAAAA0000A1Z5 (demo)',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Irani+Canteen+Teen+Hath+Naka+Thane'
  },
  gstRate: 0.05,
  tables: 12,
  admin: { user: 'admin', pass: 'irani@123' },
  showDemoBar: true,

  categories: [
    { id: 'chai', name: 'Chai and drinks' },
    { id: 'bun', name: 'Bun and pav' },
    { id: 'egg', name: 'Egg dishes' },
    { id: 'kheema', name: 'Kheema and mains' },
    { id: 'snacks', name: 'Puffs and snacks' },
    { id: 'sweet', name: 'Bakes and sweets' }
  ],

  menu: [
    { id: 'irani-chai', cat: 'chai', name: 'Irani chai', desc: 'Strong, milky chai served in a glass.', price: 79, veg: true, img: 'chai.jpg' },
    { id: 'bun-maska-tea', cat: 'chai', name: 'Bun maska and tea', desc: 'Soft bun, generous butter, one glass of chai.', price: 120, veg: true, img: 'chai.jpg' },
    { id: 'hot-coffee', cat: 'chai', name: 'Hot coffee', desc: 'Milky filter-style coffee.', price: 90, veg: true },
    { id: 'raspberry-soda', cat: 'chai', name: "Pallonji's raspberry soda", desc: 'Fizzy, sweet and tart. An old Bombay favourite.', price: 99, veg: true },
    { id: 'ice-cream-soda', cat: 'chai', name: 'Ice cream soda', desc: 'Soda with a scoop of vanilla.', price: 80, veg: true },

    { id: 'bun-maska', cat: 'bun', name: 'Bun maska pav', desc: 'Toasted pav with a thick swipe of butter.', price: 60, veg: true, img: 'chai.jpg' },
    { id: 'chicken-cutlet-pao', cat: 'bun', name: 'Chicken cutlet pao', desc: 'Crumb-fried chicken cutlet in a soft pav.', price: 125, veg: false },
    { id: 'veg-cutlet-pao', cat: 'bun', name: 'Veg cutlet pao', desc: 'Crisp vegetable cutlet in a soft pav.', price: 105, veg: true },

    { id: 'egg-kejriwal', cat: 'egg', name: 'Egg Kejriwal', desc: 'Fried egg over cheesy toast with green chilli.', price: 240, veg: false, img: 'egg.jpg', tag: 'Popular' },
    { id: 'akuri-pao', cat: 'egg', name: 'Akuri Parsi style pao', desc: 'Spiced, soft scrambled eggs with pav.', price: 215, veg: false, img: 'egg.jpg' },
    { id: 'omelette-pav', cat: 'egg', name: 'Omelette pav', desc: 'Masala omelette with buttered pav.', price: 130, veg: false, img: 'egg.jpg' },

    { id: 'mutton-kheema-pao', cat: 'kheema', name: 'Mutton kheema pao', desc: 'Slow-cooked mutton mince with soft pav.', price: 350, veg: false, tag: 'Most loved' },
    { id: 'chicken-kheema-pao', cat: 'kheema', name: 'Chicken kheema pao', desc: 'Spiced chicken mince with soft pav.', price: 300, veg: false },
    { id: 'marghi-dhansak', cat: 'kheema', name: 'Marghi dhansak', desc: 'Chicken and lentil curry, Parsi style.', price: 380, veg: false },
    { id: 'salli-boti', cat: 'kheema', name: 'Salli boti', desc: 'Tender mutton in gravy topped with fried potato sticks.', price: 360, veg: false },
    { id: 'berry-pulao', cat: 'kheema', name: 'Berry pulao chicken', desc: 'Fragrant rice with barberries and chicken.', price: 600, veg: false },
    { id: 'steamed-rice', cat: 'kheema', name: 'Steamed rice', desc: 'A plain bowl to go with your gravy.', price: 120, veg: true },

    { id: 'chicken-puff', cat: 'snacks', name: 'Chicken puff', desc: 'Flaky pastry filled with spiced chicken.', price: 100, veg: false },
    { id: 'veg-puff', cat: 'snacks', name: 'Veg puff', desc: 'Flaky pastry filled with spiced vegetables.', price: 75, veg: true },
    { id: 'chicken-farcha', cat: 'snacks', name: 'Chicken farcha (2 pcs)', desc: 'Parsi-style fried chicken, crisp outside.', price: 325, veg: false },
    { id: 'chicken-sandwich', cat: 'snacks', name: 'Chicken sandwich', desc: 'Grilled sandwich with a creamy chicken filling.', price: 160, veg: false },

    { id: 'caramel-custard', cat: 'sweet', name: 'Caramel custard', desc: 'Silky baked custard with burnt-sugar caramel.', price: 130, veg: true },
    { id: 'bread-pudding', cat: 'sweet', name: 'Arabic bread pudding', desc: 'Warm bread pudding with cream.', price: 185, veg: true },
    { id: 'mawa-cupcake', cat: 'sweet', name: 'Mawa cupcake', desc: 'Soft cupcake made with milk solids.', price: 70, veg: true, img: 'bakes.jpg' },
    { id: 'choco-cookies', cat: 'sweet', name: 'Choco chip cookies (3)', desc: 'Chunky, golden, still a little soft inside.', price: 90, veg: true, img: 'cookies.jpg' }
  ],

  featured: ['bun-maska-tea', 'egg-kejriwal', 'mawa-cupcake', 'choco-cookies'],

  reviews: [
    { who: 'Satyajit Patil', text: 'Authentic Irani food, the place gives good vibes and the staff is super friendly.' },
    { who: 'Sonal', text: 'We ordered Irani chai with bun maska, hot coffee and a chicken sandwich.' }
  ],
  ratings: [
    { src: 'Google', score: '4.4', count: '4,651 reviews' },
    { src: 'Swiggy', score: '4.6', count: '3,400 ratings' },
    { src: 'Zomato', score: '4.1', count: '447 votes' },
    { src: 'Justdial', score: '4.0', count: '5,033 votes' }
  ]
};
