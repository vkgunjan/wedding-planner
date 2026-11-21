/* Wedding Planner catalog: the functions, expense items, typical prices and checklist the app starts from.
   Prices are INR, researched Nov 2026 from Patna/tier-2 vendor listings and 2025-26 Indian wedding price guides
   (WedMeGood, WeddingWire India, WeddingBazaar, Goodreturns and others; see SOURCES at the bottom).
   r: [Budget, Mid-range, Premium] rate per unit. q: quantity (a number, [B,M,P], or a rule like 'cards:bride').
   pg: quantity = guests at that function. gold: rate follows the 22K gold rate in Settings. opt: a suggestion only, not added automatically.
   Everything here is only a starting point. Families change any amount to their real quotes in the app. */
(function () {
  const I = (cat, name, unit, r, o = {}) => ({ cat, name, unit, r, ...o });

  const CATEGORIES = [
    { k: 'venue', name: 'Venue & Destination', icon: '🏛️' },
    { k: 'catering', name: 'Catering & Food', icon: '🍽️' },
    { k: 'decor', name: 'Decoration, Tent & Lights', icon: '🌸' },
    { k: 'photo', name: 'Photography & Video', icon: '📷' },
    { k: 'attire', name: 'Clothes & Outfits', icon: '👗' },
    { k: 'jewellery', name: 'Jewellery', icon: '💍' },
    { k: 'beauty', name: 'Makeup & Mehendi', icon: '💄' },
    { k: 'music', name: 'Music & Entertainment', icon: '🎶' },
    { k: 'baraat', name: 'Baraat', icon: '🐎' },
    { k: 'invites', name: 'Wedding Cards & Invites', icon: '💌' },
    { k: 'rituals', name: 'Pandit & Rituals', icon: '🪔' },
    { k: 'stay', name: 'Guest Stay & Hospitality', icon: '🏨' },
    { k: 'travel', name: 'Travel & Transport', icon: '🚌' },
    { k: 'gifts', name: 'Gifts, Shagun & Customs', icon: '🎁' },
    { k: 'honeymoon', name: 'Honeymoon', icon: '✈️' },
    { k: 'misc', name: 'Other', icon: '🧾' },
  ];

  const UNITS = ['lump sum', 'plate', 'person', 'piece', 'set', 'day', 'function', 'package', 'g', 'card', 'box', 'room-night',
    'vehicle-day', 'hand', 'kit', 'look', 'hour', 'kg'];

  const PHASES = [
    { k: 'pre', name: 'Pre-wedding' },
    { k: 'day', name: 'Wedding day' },
    { k: 'post', name: 'Post-wedding' },
  ];

  /* host: 'bride' | 'groom' | 'both' | 'each' (held separately at both homes → two entries)
     off: days from the wedding date (used to suggest a date). g: share of the guest pool invited.
     pool: 'side' = the host side's guests, 'all' = both sides. fixed: a set number of people. on: ticked by default in setup. */
  const FUNCTIONS = [
    {
      k: 'roka', name: 'Roka / Cheka', phase: 'pre', host: 'both', off: -300, g: 0.05, pool: 'all', on: false,
      desc: 'The families confirm the match and exchange shagun (sweets, dry fruits, cash, clothes). In Bihar the bride\'s family usually pays a return visit soon after.',
      items: [
        I('gifts', 'Sweets & dry fruits', 'lump sum', [3000, 8000, 20000]),
        I('gifts', 'Shagun (cash & clothes)', 'lump sum', [5100, 11000, 31000]),
        I('catering', 'Family meal', 'plate', [300, 500, 900], { pg: 1 }),
      ],
    },
    {
      k: 'sagai', name: 'Sagai / Ring Ceremony', phase: 'pre', host: 'bride', off: -180, g: 0.3, pool: 'all', on: true,
      desc: 'Rings are exchanged after a Ganesh puja. Usually hosted by the bride\'s family; each side buys the ring it gives.',
      items: [
        I('venue', 'Venue / banquet hall', 'day', [30000, 75000, 200000]),
        I('catering', 'Catering', 'plate', [450, 750, 1500], { pg: 1 }),
        I('decor', 'Stage & entrance decoration', 'function', [15000, 50000, 150000]),
        I('jewellery', 'Ring for the groom (from bride side)', 'g', null, { gold: 1, q: [3, 5, 10], side: 'bride' }),
        I('jewellery', 'Ring for the bride (from groom side)', 'piece', [20000, 50000, 150000], { side: 'groom', note: 'Gold or diamond ring' }),
        I('photo', 'Photography & video', 'function', [15000, 40000, 100000]),
        I('music', 'DJ / music', 'function', [8000, 20000, 45000]),
        I('attire', 'Bride\'s outfit', 'piece', [8000, 25000, 80000], { side: 'bride' }),
        I('attire', 'Groom\'s outfit', 'piece', [6000, 20000, 60000], { side: 'groom' }),
        I('beauty', 'Bride\'s makeup', 'look', [5000, 12000, 30000], { side: 'bride' }),
        I('rituals', 'Pandit & Ganesh puja', 'lump sum', [1100, 2100, 5100]),
        I('music', 'Anchor / emcee', 'function', [7000, 15000, 25000], { opt: 1 }),
      ],
    },
    {
      k: 'tilak', name: 'Tilak', phase: 'pre', host: 'groom', off: -30, g: 0.3, pool: 'side', on: true,
      desc: 'The bride\'s father, brother and male relatives (usually an odd number, 11–21) go to the groom\'s home, apply tilak and give gifts. The groom\'s family hosts the venue and the feast.',
      items: [
        I('venue', 'Venue / tent at the groom\'s home', 'day', [20000, 50000, 150000]),
        I('catering', 'Feast for the tilak party & guests', 'plate', [300, 500, 900], { pg: 1 }),
        I('decor', 'Decoration', 'function', [10000, 30000, 80000]),
        I('gifts', 'Tilak thaal, sweets, fruit & dry fruits', 'lump sum', [5000, 12000, 30000], { side: 'bride', note: 'Khaja, laddoo, barfi, dry fruits, fruit' }),
        I('gifts', 'Tilak shagun (voluntary gift)', 'lump sum', [5100, 21000, 51000], { side: 'bride' }),
        I('gifts', 'Clothes & gifts for the groom (voluntary)', 'lump sum', [10000, 30000, 75000], { side: 'bride', note: 'Voluntary gifts only. Asking for dowry is illegal (Dowry Prohibition Act, 1961).' }),
        I('gifts', 'Return gifts for the tilak party', 'lump sum', [10000, 25000, 50000], { side: 'groom' }),
        I('travel', 'Travel for the tilak party', 'vehicle-day', [3000, 4500, 8000], { q: 2, side: 'bride' }),
        I('rituals', 'Pandit dakshina', 'lump sum', [1100, 2100, 5100]),
        I('photo', 'Photography & video', 'function', [10000, 25000, 60000]),
        I('music', 'DJ / music', 'function', [8000, 15000, 30000]),
      ],
    },
    {
      k: 'prewed', name: 'Pre-wedding Photoshoot', phase: 'pre', host: 'both', off: -60, fixed: 2, on: true,
      desc: 'A photo or video shoot of the couple, often used in the wedding invite and on the big screen at the venue.',
      items: [
        I('photo', 'Photographer / film package', 'package', [15000, 40000, 120000]),
        I('attire', 'Outfits for the shoot', 'set', [3000, 8000, 20000], { q: 2 }),
        I('beauty', 'Makeup & hair', 'look', [3000, 6000, 15000], { q: 2 }),
        I('travel', 'Location, travel & stay', 'lump sum', [5000, 20000, 60000]),
        I('photo', 'Drone', 'day', [5000, 8000, 15000], { opt: 1 }),
      ],
    },
    {
      k: 'katha', name: 'Satyanarayan Katha', phase: 'pre', host: 'each', off: -7, g: 0.1, pool: 'side', on: false,
      desc: 'A puja at home before the wedding functions begin.',
      items: [
        I('rituals', 'Pandit dakshina', 'lump sum', [1100, 2100, 5100]),
        I('rituals', 'Puja samagri & prasad', 'lump sum', [1000, 2500, 5000]),
        I('catering', 'Family meal', 'plate', [200, 350, 600], { pg: 1 }),
      ],
    },
    {
      k: 'matkor', name: 'Matkor (Matikor)', phase: 'pre', host: 'each', off: -3, g: 0.08, pool: 'side', on: true,
      desc: 'Married women of the family go out with folk songs, worship Dharti Mata and dig earth for the wedding chulha and havan.',
      items: [
        I('rituals', 'Puja samagri & earthen pots', 'lump sum', [1000, 2000, 4000]),
        I('music', 'Dhol', 'function', [2000, 3500, 6000]),
        I('catering', 'Sweets & snacks', 'person', [80, 150, 250], { pg: 1 }),
      ],
    },
    {
      k: 'madwa', name: 'Madwa (Mandap ritual)', phase: 'pre', host: 'each', off: -2, g: 0.12, pool: 'side', on: true,
      desc: 'Mandappachadan: the bamboo madwa is raised in the courtyard with banana plants, mango leaves and kalash, followed by puja and a family meal.',
      items: [
        I('rituals', 'Bamboo, banana plants, mango leaves & kalash', 'lump sum', [3000, 6000, 12000]),
        I('decor', 'Tent / shamiana & labour', 'lump sum', [8000, 20000, 50000]),
        I('rituals', 'Pandit dakshina', 'lump sum', [1100, 2100, 5100]),
        I('catering', 'Family meal', 'plate', [250, 400, 700], { pg: 1 }),
      ],
    },
    {
      k: 'haldi', name: 'Haldi', phase: 'pre', host: 'each', off: -2, g: 0.15, pool: 'side', on: true,
      desc: 'Haldi paste (ground by married women while singing) is applied to the bride and the groom at their own homes.',
      items: [
        I('decor', 'Haldi decoration', 'function', [3500, 8000, 15000]),
        I('rituals', 'Haldi, flowers & samagri', 'lump sum', [1500, 3000, 6000]),
        I('catering', 'Lunch / snacks', 'plate', [250, 450, 800], { pg: 1 }),
        I('music', 'Dhol / music', 'function', [2000, 5000, 12000]),
        I('attire', 'Yellow outfit', 'piece', [2500, 6000, 15000]),
        I('photo', 'Photography', 'function', [5000, 12000, 25000]),
      ],
    },
    {
      k: 'mehendi', name: 'Mehendi', phase: 'pre', host: 'bride', off: -3, g: 0.15, pool: 'side', on: true,
      desc: 'Mehendi is applied to the bride and the women of the family, with music and food.',
      items: [
        I('beauty', 'Bridal mehendi', 'piece', [2100, 4800, 10000]),
        I('beauty', 'Guest mehendi', 'hand', [150, 250, 350], { q: 30 }),
        I('decor', 'Decoration', 'function', [4000, 9000, 15000]),
        I('catering', 'Snacks & dinner', 'plate', [300, 500, 900], { pg: 1 }),
        I('music', 'DJ / music', 'function', [5000, 12000, 25000]),
        I('attire', 'Bride\'s mehendi outfit', 'piece', [3000, 10000, 30000]),
        I('photo', 'Photography', 'function', [5000, 12000, 25000]),
      ],
    },
    {
      k: 'sangeet', name: 'Sangeet', phase: 'pre', host: 'bride', off: -1, g: 0.3, pool: 'all', on: false,
      desc: 'An evening of songs and dance performances by both families.',
      items: [
        I('venue', 'Venue', 'day', [25000, 75000, 200000]),
        I('catering', 'Dinner', 'plate', [450, 750, 1400], { pg: 1 }),
        I('music', 'DJ, sound & lights', 'function', [15000, 30000, 60000]),
        I('music', 'Choreographer', 'package', [10000, 30000, 75000]),
        I('music', 'Anchor / emcee', 'function', [7000, 15000, 25000]),
        I('decor', 'Stage & decoration', 'function', [15000, 50000, 150000]),
        I('attire', 'Outfits for the bride & groom', 'set', [5000, 15000, 40000], { q: 2, side: 'shared' }),
        I('photo', 'Photography & video', 'function', [10000, 25000, 60000]),
        I('music', 'Live singer', 'function', [15000, 25000, 60000], { opt: 1 }),
      ],
    },
    {
      k: 'bhaat', name: 'Bhaat / Mayra (Imli Ghutai)', phase: 'pre', host: 'each', off: -1, g: 0.08, pool: 'side', on: false,
      desc: 'The maternal uncle (mama) and his family arrive with gifts. In Bihar the mama also does Imli Ghutai with the groom. The family hosts them.',
      items: [
        I('catering', 'Welcome & meal for mama\'s family', 'plate', [250, 400, 700], { pg: 1 }),
        I('gifts', 'Return gifts for mama\'s family', 'lump sum', [3000, 8000, 20000]),
      ],
    },
    {
      k: 'bachelor', name: 'Bachelor / Bachelorette Party', phase: 'pre', host: 'both', off: -10, fixed: 20, on: false,
      desc: 'A party or short trip with friends.',
      items: [
        I('misc', 'Party venue / trip', 'lump sum', [10000, 30000, 100000]),
        I('catering', 'Food & drinks', 'person', [800, 1500, 3000], { pg: 1 }),
      ],
    },
    {
      k: 'baraat', name: 'Baraat & Sehrabandi', phase: 'day', host: 'groom', off: 0, g: 0.6, pool: 'side', on: true,
      desc: 'The sehra is tied, the groom\'s mother does Paricchavan (aarti) and the groom rides out on the ghodi with the baraat: band, roshni, fireworks and dancing.',
      items: [
        I('music', 'Band baaja', 'lump sum', [10000, 30000, 100000]),
        I('baraat', 'Ghodi / baggi', 'lump sum', [6000, 18000, 60000]),
        I('baraat', 'Decorated / vintage car', 'day', [6000, 15000, 40000]),
        I('baraat', 'Roshni (light carriers)', 'lump sum', [3000, 8000, 15000]),
        I('baraat', 'Fireworks', 'lump sum', [3000, 10000, 30000]),
        I('travel', 'Buses / tempo travellers for baraatis', 'vehicle-day', [5000, 7000, 12000], { q: 3 }),
        I('attire', 'Groom\'s wedding sherwani', 'piece', [10000, 40000, 120000]),
        I('attire', 'Sehra, safa & kalgi for the groom', 'set', [2500, 6000, 15000]),
        I('attire', 'Safas for baraatis', 'piece', [150, 300, 600], { q: 20 }),
        I('beauty', 'Groom styling', 'look', [3000, 7000, 15000]),
        I('rituals', 'Paricchavan & sehrabandi puja', 'lump sum', [1100, 2100, 5100]),
        I('music', 'DJ on wheels', 'lump sum', [8000, 15000, 30000], { opt: 1 }),
      ],
    },
    {
      k: 'wedding', name: 'Wedding (Dwar Puja, Jaimala, Phere)', phase: 'day', host: 'bride', off: 0, g: 1, pool: 'all', on: true,
      desc: 'The bride\'s family welcomes the baraat (Dwar Puja), then Jaimala, Kanyadaan, Phere and Sindoor daan, followed by Kohbar rituals.',
      items: [
        I('venue', 'Marriage hall / lawn', 'day', [45000, 120000, 400000]),
        I('catering', 'Wedding dinner', 'plate', [500, 800, 1500], { pg: 1 }),
        I('catering', 'Live counters (chaat, etc.)', 'person', [100, 200, 350], { pg: 1 }),
        I('catering', 'Tea, coffee & welcome drinks', 'person', [40, 80, 150], { pg: 1 }),
        I('catering', 'Waiters & service staff', 'person', [500, 650, 800], { q: 10 }),
        I('catering', 'Paan counter', 'lump sum', [5000, 10000, 15000]),
        I('stay', 'Janwasa (baraat stay & snacks)', 'lump sum', [10000, 30000, 80000]),
        I('decor', 'Stage, entrance & venue decoration', 'function', [30000, 100000, 300000]),
        I('decor', 'Mandap', 'piece', [15000, 40000, 100000]),
        I('decor', 'Lighting', 'function', [10000, 25000, 60000]),
        I('decor', 'Tent house & furniture', 'lump sum', [20000, 60000, 150000]),
        I('decor', 'Generator', 'day', [8000, 12000, 18000]),
        I('decor', 'Jaimala garlands & flowers', 'lump sum', [2000, 5000, 15000]),
        I('decor', 'Kohbar painting & decoration', 'lump sum', [2000, 5000, 12000], { note: 'Mithila / Madhubani kohbar art' }),
        I('rituals', 'Pandit dakshina (vivah)', 'lump sum', [5100, 11000, 31000]),
        I('rituals', 'Puja samagri & havan', 'lump sum', [2000, 5000, 15000]),
        I('rituals', 'Dwar puja & dwar dakhina', 'lump sum', [2100, 5100, 11000]),
        I('attire', 'Bridal lehenga / wedding saree', 'piece', [25000, 75000, 250000]),
        I('attire', 'Chooda & kaleere', 'set', [2000, 6000, 15000]),
        I('beauty', 'Bridal makeup (HD / airbrush)', 'look', [8000, 18000, 50000]),
        I('beauty', 'Makeup for family members', 'person', [2000, 2500, 4000], { q: 6 }),
        I('photo', 'Photography & video', 'day', [25000, 60000, 150000]),
        I('music', 'DJ / music', 'function', [10000, 20000, 45000]),
        I('photo', 'Drone', 'day', [5000, 10000, 15000], { opt: 1 }),
        I('music', 'Shehnai', 'function', [3000, 8000, 15000], { opt: 1 }),
        I('decor', 'Coolers / heaters', 'day', [1500, 2000, 3000], { q: 10, opt: 1 }),
        I('misc', 'Security & valet parking', 'lump sum', [5000, 15000, 30000], { opt: 1 }),
      ],
    },
    {
      k: 'vidaai', name: 'Vidaai', phase: 'post', host: 'bride', off: 1, g: 0.1, pool: 'side', on: true,
      desc: 'The bride leaves with the groom\'s family. Elders give the groom salami (cash and gifts).',
      items: [
        I('baraat', 'Car decoration', 'lump sum', [2000, 5000, 10000]),
        I('gifts', 'Salami for the groom & elders (voluntary)', 'lump sum', [5000, 15000, 40000]),
        I('gifts', 'Sweets for the vidaai', 'lump sum', [3000, 8000, 15000]),
        I('baraat', 'Doli', 'lump sum', [5000, 12000, 25000], { opt: 1 }),
      ],
    },
    {
      k: 'griha', name: 'Griha Pravesh & Muh Dikhai', phase: 'post', host: 'groom', off: 1, g: 0.08, pool: 'side', on: true,
      desc: 'The bride is welcomed into the groom\'s home with aarti and the kalash. Relatives see the bride and give gifts (muh dikhai). Pehli rasoi follows.',
      items: [
        I('decor', 'Swagat aarti & decoration', 'lump sum', [2000, 6000, 15000]),
        I('gifts', 'Muh dikhai gift for the bride', 'lump sum', [5000, 25000, 75000]),
        I('catering', 'Family meal', 'plate', [250, 400, 700], { pg: 1 }),
      ],
    },
    {
      k: 'reception', name: 'Reception / Bahu Bhoj', phase: 'post', host: 'groom', off: 3, g: 0.9, pool: 'all', on: true,
      desc: 'The groom\'s family introduces the bride to their relatives and friends with a big dinner.',
      items: [
        I('venue', 'Venue', 'day', [40000, 100000, 300000]),
        I('catering', 'Dinner', 'plate', [450, 750, 1500], { pg: 1 }),
        I('decor', 'Stage & decoration', 'function', [25000, 75000, 250000]),
        I('music', 'DJ & music', 'function', [10000, 20000, 45000]),
        I('photo', 'Photography & video', 'day', [20000, 50000, 120000]),
        I('attire', 'Bride\'s reception outfit', 'piece', [10000, 35000, 120000]),
        I('attire', 'Groom\'s suit / indo-western', 'piece', [8000, 25000, 75000]),
        I('beauty', 'Bride\'s makeup', 'look', [6000, 15000, 40000]),
        I('music', 'Anchor / emcee', 'function', [7000, 15000, 25000], { opt: 1 }),
      ],
    },
    {
      k: 'chauthari', name: 'Chauthari & Pag Phera', phase: 'post', host: 'groom', off: 4, g: 0.05, pool: 'side', on: false,
      desc: 'A Satyanarayan puja around the fourth day (Chauthari). After it the couple visits the bride\'s home for Pag Phera.',
      items: [
        I('rituals', 'Pandit & Satyanarayan puja', 'lump sum', [1100, 2100, 5100]),
        I('gifts', 'Gifts', 'lump sum', [2000, 5000, 15000]),
        I('catering', 'Family meal', 'plate', [250, 400, 700], { pg: 1 }),
      ],
    },
  ];

  /* Costs that belong to the whole wedding rather than to one function.
     q rules: 'cards:bride' / 'cards:groom' = about one card per 3 guests; 'rooms:all' = one room per 2 guests for 2 nights. */
  const GENERAL = [
    // Jewellery: gold items follow the 22K rate in Settings (grams × rate + making charges + 3% GST)
    I('jewellery', 'Bridal gold set (necklace / rani haar & earrings)', 'g', null, { gold: 1, q: [20, 50, 150], side: 'bride', note: 'Grams of 22K gold. If old family gold is being reused or exchanged, reduce the grams.' }),
    I('jewellery', 'Kangan / bangles', 'g', null, { gold: 1, q: [10, 30, 80], side: 'bride' }),
    I('jewellery', 'Maang tikka, nath & earrings', 'g', null, { gold: 1, q: [5, 15, 35], side: 'bride' }),
    I('jewellery', 'Rings for the bride', 'g', null, { gold: 1, q: [3, 6, 15], side: 'bride' }),
    I('jewellery', 'Mangalsutra', 'g', null, { gold: 1, q: [4, 8, 20], side: 'groom' }),
    I('jewellery', 'Jewellery from the groom\'s family (chadhawa)', 'g', null, { gold: 1, q: [10, 25, 100], side: 'groom' }),
    I('jewellery', 'Payal & bichhiya (silver)', 'lump sum', [3000, 8000, 20000], { side: 'bride', note: 'Silver was about ₹175–190 per gram in Nov 2026' }),
    I('jewellery', 'Groom\'s chain', 'g', null, { gold: 1, q: [6, 12, 30], side: 'groom' }),
    I('jewellery', 'Groom\'s kada / bracelet', 'g', null, { gold: 1, q: [10, 20, 50], side: 'groom', opt: 1 }),
    // Clothes
    I('attire', 'Bride\'s trousseau (clothes for after the wedding)', 'lump sum', [50000, 150000, 400000], { side: 'bride' }),
    I('attire', 'Sarees & clothes for the bride from the groom\'s family', 'lump sum', [15000, 40000, 100000], { side: 'groom' }),
    I('attire', 'Family clothes, bride side', 'person', [2000, 5000, 12000], { q: 10, side: 'bride' }),
    I('attire', 'Family clothes, groom side', 'person', [2000, 5000, 12000], { q: 10, side: 'groom' }),
    I('attire', 'Bride\'s footwear & accessories', 'lump sum', [5000, 15000, 40000], { side: 'bride' }),
    I('attire', 'Groom\'s mojari & accessories', 'lump sum', [2000, 5000, 15000], { side: 'groom' }),
    // Invitations
    I('invites', 'Wedding cards, bride side', 'card', [25, 80, 250], { q: 'cards:bride', side: 'bride' }),
    I('invites', 'Wedding cards, groom side', 'card', [25, 80, 250], { q: 'cards:groom', side: 'groom' }),
    I('invites', 'Mithai boxes with cards, bride side', 'box', [100, 160, 300], { q: 'cards:bride', side: 'bride' }),
    I('invites', 'Mithai boxes with cards, groom side', 'box', [100, 160, 300], { q: 'cards:groom', side: 'groom' }),
    I('invites', 'Video / e-invite design', 'piece', [1000, 6500, 15000], { side: 'shared' }),
    I('invites', 'Card distribution & courier', 'lump sum', [3000, 8000, 15000], { side: 'shared' }),
    // Photography
    I('photo', 'Printed albums', 'set', [10000, 30000, 80000], { side: 'shared' }),
    I('photo', 'Cinematic wedding film', 'package', [20000, 60000, 200000], { side: 'shared', opt: 1 }),
    I('photo', 'Candid photographer', 'day', [8000, 20000, 35000], { q: 2, side: 'shared', opt: 1 }),
    // Guests
    I('stay', 'Hotel rooms for outstation guests', 'room-night', [1800, 3500, 8000], { q: 15, side: 'shared' }),
    I('stay', 'Welcome kits / room hampers', 'kit', [300, 800, 2000], { q: 15, side: 'shared' }),
    I('gifts', 'Return gifts for guests', 'person', [50, 300, 1000], { pg: 1, side: 'shared' }),
    I('travel', 'Local transport for guests (cars / tempo travellers)', 'vehicle-day', [3000, 4500, 8000], { q: 4, side: 'shared' }),
    // Gifts & customs
    I('gifts', 'Shagun & gifts for relatives, bride side', 'lump sum', [20000, 75000, 200000], { side: 'bride' }),
    I('gifts', 'Shagun & gifts for relatives, groom side', 'lump sum', [20000, 75000, 200000], { side: 'groom' }),
    I('gifts', 'Gifts for the in-laws (samdhi milan)', 'lump sum', [20000, 75000, 200000], { side: 'bride' }),
    I('gifts', 'Household gifts for the couple (voluntary)', 'lump sum', [25000, 75000, 200000], { side: 'bride', note: 'Voluntary gifts only. Asking for dowry is illegal (Dowry Prohibition Act, 1961).' }),
    I('misc', 'Neg for helpers (naai, kahar, dhobi, staff tips)', 'lump sum', [5000, 15000, 40000], { side: 'shared' }),
    // Others
    I('honeymoon', 'Honeymoon package', 'package', [60000, 120000, 300000], { side: 'groom', note: 'Goa 4 nights under ₹60K · Kerala ₹70K–1.2L · Bali / Phuket ₹80K–1.4L · Maldives about ₹2.4L' }),
    I('misc', 'Marriage registration', 'lump sum', [1000, 2500, 5000], { side: 'shared' }),
    I('misc', 'Wedding planner / coordinator', 'lump sum', [100000, 200000, 500000], { side: 'shared', opt: 1, note: 'Usually 8–15% of the budget' }),
    I('misc', 'Wedding insurance', 'lump sum', [1500, 3000, 8000], { side: 'shared', opt: 1 }),
  ];

  // Added only for destination weddings (and offered as suggestions otherwise)
  const DESTINATION = [
    I('venue', 'Destination resort / palace venue', 'day', [300000, 800000, 2500000], { q: 2, side: 'shared', note: 'Udaipur 2-day, 200 guests: ₹60L–1.5Cr+ · Jaipur ₹30–90L · Goa ₹20–50L · Rishikesh resort buyout ₹7–18L per day · Bodh Gaya ₹1–2.5L per event' }),
    I('stay', 'Rooms at the destination', 'room-night', [4000, 9000, 25000], { q: 'rooms:all', side: 'shared' }),
    I('travel', 'Guest travel to the destination (tickets)', 'person', [3000, 6000, 12000], { pg: 1, side: 'shared' }),
    I('travel', 'Airport / station transfers', 'vehicle-day', [3000, 4500, 8000], { q: 6, side: 'shared' }),
  ];

  const WHEN = [
    { k: '12m', name: '12+ months before', days: 365 },
    { k: '9m', name: '9 months before', days: 270 },
    { k: '6m', name: '6 months before', days: 180 },
    { k: '5m', name: '5 months before', days: 150 },
    { k: '4m', name: '4 months before', days: 120 },
    { k: '3m', name: '3 months before', days: 90 },
    { k: '2m', name: '2 months before', days: 60 },
    { k: '1m', name: '1 month before', days: 30 },
    { k: '2w', name: '2 weeks before', days: 14 },
    { k: '1w', name: '1 week before', days: 7 },
    { k: '1d', name: 'Day before', days: 1 },
    { k: '0d', name: 'Wedding day', days: 0 },
    { k: 'after', name: 'After the wedding', days: -7 },
  ];

  // [when, task, who]
  const CHECKLIST = [
    ['12m', 'Set the total budget and how the two families will share it', 'both'],
    ['12m', 'Fix the muhurat / date with the pandit (avoid Kharmas)', 'both'],
    ['12m', 'Draft the guest list for both sides', 'both'],
    ['12m', 'Decide: wedding in the home city or a destination wedding', 'both'],
    ['12m', 'Decide whether to hire a wedding planner', 'both'],
    ['12m', 'Shortlist and visit venues; estimate the rooms needed', 'both'],
    ['12m', 'Start buying gold in parts, or a gold savings plan', 'both'],
    ['9m', 'Book the wedding venue', 'bride'],
    ['9m', 'Book the reception venue', 'groom'],
    ['9m', 'Book the caterer (taste the menu first)', 'both'],
    ['9m', 'Book the decorator and tent house', 'both'],
    ['9m', 'Book the photographer / videographer', 'both'],
    ['9m', 'Book the bridal makeup artist', 'bride'],
    ['9m', 'Fix the Roka / Sagai date', 'both'],
    ['6m', 'Hold the Sagai / ring ceremony', 'both'],
    ['6m', 'Shop for the bridal lehenga / saree (designers can take 4 months)', 'bride'],
    ['6m', 'Shop for the groom\'s sherwani and safa', 'groom'],
    ['6m', 'Book the band, ghodi / baggi, DJ and anchor', 'groom'],
    ['6m', 'Block hotel rooms for outstation guests', 'both'],
    ['6m', 'Plan the pre-wedding shoot', 'both'],
    ['5m', 'Choose the invitation card and e-invite designer', 'both'],
    ['5m', 'Send save-the-date e-invites', 'both'],
    ['4m', 'Send printed cards to outstation guests', 'both'],
    ['4m', 'Order the jewellery', 'both'],
    ['4m', 'Confirm the pandit and the list of rituals', 'both'],
    ['3m', 'Book the mehendi artist and sangeet choreographer', 'bride'],
    ['3m', 'Finalise the menu for every function', 'both'],
    ['3m', 'Distribute local cards with mithai', 'both'],
    ['3m', 'Buy tilak items and gifts', 'bride'],
    ['3m', 'Buy clothes for the family', 'both'],
    ['3m', 'Make the function-wise schedule', 'both'],
    ['2m', 'Book guest transport and baraat buses', 'groom'],
    ['2m', 'Order return gifts and welcome kits', 'both'],
    ['2m', 'Send playlists to the DJ', 'both'],
    ['2m', 'Hold the Tilak ceremony', 'groom'],
    ['1m', 'Confirm RSVPs, plate counts and room counts', 'both'],
    ['1m', 'Get written contracts from every vendor; note all payments here', 'both'],
    ['1m', 'Outfit fittings', 'both'],
    ['1m', 'Book bamboo and labour for the madwa; arrange the kohbar painter', 'both'],
    ['1m', 'Arrange a weather backup and the generator', 'both'],
    ['1m', 'Give duties to relatives (guests, food, gifts, cash)', 'both'],
    ['1m', 'Book the honeymoon', 'groom'],
    ['1m', 'Buy wedding insurance (optional)', 'both'],
    ['2w', 'Collect the jewellery', 'both'],
    ['2w', 'Sangeet rehearsals', 'both'],
    ['2w', 'Make puja samagri lists for each ritual', 'both'],
    ['2w', 'Follow up on pending RSVPs', 'both'],
    ['2w', 'Prepare shagun envelopes', 'both'],
    ['1w', 'Pay the final vendor balances (keep receipts)', 'both'],
    ['1w', 'Pack the trousseau', 'bride'],
    ['1w', 'Beauty and grooming appointments', 'both'],
    ['1w', 'Haldi, Matkor and Madwa', 'both'],
    ['1w', 'Mehendi and Sangeet', 'bride'],
    ['1d', 'Brief vendors and family coordinators', 'both'],
    ['1d', 'Give the cash envelopes to a trusted person', 'both'],
    ['1d', 'Check the decor, mandap and generator', 'bride'],
    ['1d', 'Bhaat / Mayra', 'both'],
    ['0d', 'Paricchavan and baraat', 'groom'],
    ['0d', 'Dwar puja and jaimala', 'bride'],
    ['0d', 'Kanyadaan, phere and sindoor daan', 'both'],
    ['0d', 'Kohbar rituals', 'bride'],
    ['after', 'Vidaai', 'bride'],
    ['after', 'Griha pravesh and muh dikhai', 'groom'],
    ['after', 'Reception / bahu bhoj', 'groom'],
    ['after', 'Chauthari and pag phera', 'both'],
    ['after', 'Settle all vendor dues and return rentals', 'both'],
    ['after', 'Record the shagun received', 'both'],
    ['after', 'Collect the album and the wedding film', 'both'],
    ['after', 'Register the marriage', 'both'],
  ];

  const GOLD = { k22: 11465, k24: 12508, silver: 175, asOf: '21 Nov 2026', src: 'Goodreturns (excl. GST)' };

  const NOTES = [
    'Starting prices are for Patna and similar tier-2 cities, from 2025–26 vendor listings and price guides. Peak season (Nov–Feb) can be 10–20% higher. Vendors usually add 18% GST.',
    'Gold is ₹11,465 per gram for 22K and ₹12,508 for 24K (21 Nov 2026, Goodreturns, excluding GST). Jewellery cost = grams × rate + making charges (8–20%) + 3% GST. Update the rate in Settings before you buy.',
    'Typical total (both families, all functions, without gold): 200 guests ₹4–7L budget, ₹10–18L mid-range, ₹25–40L premium; 400 guests ₹8–11L / ₹18–28L / ₹40–60L.',
    'Typical split: catering is about 24%, jewellery 19%, venue 11%, clothes 10%, decoration 10%, photography 6%, gifts and shagun 4%, and the rest 16%. Keep 5–10% extra for surprises.',
    'Tilak, salami and household gifts should only be voluntary. Asking for dowry is illegal under the Dowry Prohibition Act, 1961.',
  ];

  const SOURCES = [
    'https://www.wedmegood.com/blog/wedmegood-annual-wedding-industry-report-2025-2026',
    'https://www.weddingwire.in/wedding-venues/patna',
    'https://www.weddingwire.in/caterers/patna',
    'https://weddingwire.in/wedding-tips/bihari-wedding--c2615',
    'https://www.perniaspopupshop.com/wedding-encyclopedia/bihar-jharkhand',
    'https://www.goodreturns.in/gold-rates/',
    'https://blog.bluestone.com/bridal-jewellery-set-gold-2026/',
    'https://vishakhacollections.com/blogs/wedding-cards/how-much-do-wedding-cards-cost-in-india',
    'https://www.wedmegood.com/blog/sangeet-ceremony-guide-meaning-choreographer-options-costs/',
    'https://www.weddingwire.in/wedding-tips/destination-wedding-cost--c692',
    'https://samaro.ai/blogs/how-to-plan-wedding-budget-india-2025',
    'https://www.weddingwire.in/wedding-tips/wedding-planning-checklist--c11204',
  ];

  window.CATALOG = { CATEGORIES, UNITS, PHASES, FUNCTIONS, GENERAL, DESTINATION, WHEN, CHECKLIST, GOLD, NOTES, SOURCES };
})();
