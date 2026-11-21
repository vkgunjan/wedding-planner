'use strict';
/* Wedding Planner: budget, functions, guest list and checklist for both families.
   Plain JavaScript, no build step. The plan is saved in this browser straight away and, with a GitHub token,
   in a private repo as data/wedding.json (merged by id, newest change wins, so several phones can edit). */
const APP_VERSION = '2026-11-21.2'; // keep in step with CACHE in sw.js
const C = window.CATALOG;

/* ---------- small helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v ?? '').replace(/[,₹\s]/g, '')); return Number.isFinite(n) ? n : 0; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const pad = n => String(n).padStart(2, '0');
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => new Date(k + 'T00:00:00');
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
const fmtDate = k => k ? parseKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtDay = k => k ? parseKey(k).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return new Date(2000, 0, 1, h, m || 0).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); };
const inr = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
function inrShort(n) {
  n = Math.round(n || 0);
  const a = Math.abs(n), f = (x, u) => '₹' + (+x.toFixed(Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2)).toLocaleString('en-IN') + u;
  if (a >= 1e7) return f(n / 1e7, ' Cr');
  if (a >= 1e5) return f(n / 1e5, ' L');
  if (a >= 1e4) return f(n / 1e3, 'K');
  return inr(n);
}
const fmtQty = q => Number.isInteger(q) ? q.toLocaleString('en-IN') : (+q.toFixed(2)).toString();
const plural = (unit, q) => {
  if (!unit || q === 1 || ['g', 'kg', 'lump sum'].includes(unit) || /s$/.test(unit)) return unit;
  return unit === 'person' ? 'people' : unit + 's';
};
const sumBy = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
const initials = s => String(s).trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
const pctOf = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
function b64encode(str) {
  const bytes = new TextEncoder().encode(str); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
let toastTimer;
function toast(msg, kind = '') {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + kind;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = 'toast', kind === 'err' ? 5000 : 2600);
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function fillSelect(sel, opts, val) {
  sel.innerHTML = opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
  sel.value = val ?? '';
  if (sel.selectedIndex < 0 && opts.length) sel.value = opts[0][0];
}

/* ---------- constants ---------- */
const TIERS = ['low', 'mid', 'high'];
const TIER_NAME = { low: 'Budget', mid: 'Mid-range', high: 'Premium' };
const SIDE = { bride: 'Bride side', groom: 'Groom side', shared: 'Shared' };
const HOST = { bride: 'Bride side', groom: 'Groom side', both: 'Both families' };
const STATUS = { plan: 'Planning', quote: 'Got quotes', booked: 'Booked', paid: 'Fully paid' };
const RSVP = { pending: 'Not asked', yes: 'Coming', maybe: 'Maybe', no: 'Not coming' };
const GROUPS = ['Family', 'Relatives', 'Friends', 'Office', 'Neighbours', 'VIP', 'Other'];
const CAT = Object.fromEntries(C.CATEGORIES.map(c => [c.k, c]));
const FN = Object.fromEntries(C.FUNCTIONS.map(f => [f.k, f]));
const FN_SEQ = Object.fromEntries(C.FUNCTIONS.map((f, i) => [f.k, i])); // catalog order breaks same-day ties
const WHEN = Object.fromEntries(C.WHEN.map(w => [w.k, w]));
const ALL_TPL = (() => { // every catalog item once, for the name suggestions in the expense form
  const m = new Map();
  [...C.FUNCTIONS.flatMap(f => f.items), ...C.GENERAL, ...C.DESTINATION].forEach(t => { if (!m.has(t.name)) m.set(t.name, t); });
  return [...m.values()];
})();
const INFO_DEFAULTS = {
  bride: '', groom: '', brideFamily: '', groomFamily: '', date: '', city: '', type: 'home', venue: '',
  budgetBride: 0, budgetGroom: 0, guestsBride: 300, guestsGroom: 300, sharedPct: 50, buffer: 10,
  gold22: C.GOLD.k22, making: 12, tier: 'mid', useList: false, created: 0,
};

/* ---------- storage ---------- */
const K_DB = 'wedplan.db', K_CFG = 'wedplan.cfg', K_LAST = 'wedplan.lastSync', K_UI = 'wedplan.ui', K_DIRTY = 'wedplan.dirty';
const freshDb = () => ({ schema: 1, info: { _t: {} }, events: [], items: [], guests: [], tasks: [] });
function normalize(d) {
  d = d && typeof d === 'object' ? d : freshDb();
  d.info = d.info && typeof d.info === 'object' ? d.info : {};
  d.info._t = d.info._t || {};
  ['events', 'items', 'guests', 'tasks'].forEach(k => { d[k] = Array.isArray(d[k]) ? d[k] : []; });
  return d;
}
let db = normalize(store.get(K_DB, null));
let dirty = store.get(K_DIRTY, 0);
let cfg = Object.assign({ user: '', owner: 'vkgunjan', repo: 'wedding', branch: 'main', folder: 'data', token: '' }, store.get(K_CFG, {}));
const ui = Object.assign({ view: 'home', fnId: '', bQ: '', bSide: '', bEv: '', bCat: '', bStatus: '', bGroup: 'cat',
  gQ: '', gSide: '', gGroup: '', gRsvp: '', gEv: '', tOwner: '', tHideDone: false }, store.get(K_UI, {}));
const saveUi = () => store.set(K_UI, ui);
const groupState = store.get('wedplan.groups', {}); // which collapsible sections are open
const isOpen = (key, def) => key in groupState ? groupState[key] : def;
document.addEventListener('toggle', e => {
  const k = e.target.dataset && e.target.dataset.gkey; if (!k) return;
  groupState[k] = e.target.open; store.set('wedplan.groups', groupState);
}, true);
function save() { store.set(K_DB, db); store.set(K_DIRTY, dirty); }
function changed() { dirty++; save(); scheduleSync(); render(); }

const live = a => a.filter(x => !x.deleted);
const evById = id => id ? db.events.find(e => e.id === id && !e.deleted) : undefined;
const inf = k => db.info[k] ?? INFO_DEFAULTS[k];
function setInfo(k, v) { db.info[k] = v; db.info._t[k] = Date.now(); }
function stamp(r) { r.updatedAt = Date.now(); r.by = cfg.user || ''; return r; }
const hasPlan = () => !!(inf('created') || live(db.events).length || live(db.items).length);
const tierIx = () => Math.max(0, TIERS.indexOf(inf('tier')));

/* ---------- money & headcount ---------- */
const goldRate = () => num(inf('gold22')) * (1 + (num(inf('making')) + 3) / 100); // + making charges + 3% GST
const expectedAll = () => num(inf('guestsBride')) + num(inf('guestsGroom'));
function listCount(evId) { // people on the guest list (optionally only those invited to one function)
  return sumBy(live(db.guests).filter(g => !evId || (g.events || []).includes(evId)), g => Math.max(1, num(g.count) || 1));
}
function expectedFor(ev) { // estimate from the expected guest numbers in Settings
  if (ev.fixed) return ev.fixed;
  const gb = num(inf('guestsBride')), gg = num(inf('guestsGroom'));
  const pool = ev.pool === 'all' || ev.host === 'both' ? gb + gg : ev.host === 'bride' ? gb : gg;
  return Math.max(1, Math.round(pool * (ev.share ?? 0.5)));
}
function autoCount(ev) { return inf('useList') && listCount(ev.id) ? listCount(ev.id) : expectedFor(ev); }
function headcount(ev) {
  if (!ev) return inf('useList') && listCount('') ? listCount('') : expectedAll();
  return num(ev.guests) > 0 ? num(ev.guests) : autoCount(ev);
}
const itemQty = it => it.perGuest ? headcount(evById(it.eventId)) : num(it.qty);
const itemRate = it => it.gold ? goldRate() : num(it.rate);
const itemEst = it => itemQty(it) * itemRate(it);
const itemCost = it => num(it.actual) > 0 ? num(it.actual) : itemEst(it);
const itemBal = it => Math.max(0, itemCost(it) - num(it.paid));
function totals(items) {
  const t = { est: 0, paid: 0, bal: 0, booked: 0, n: items.length };
  items.forEach(it => {
    const c = itemCost(it); t.est += c; t.paid += num(it.paid); t.bal += Math.max(0, c - num(it.paid));
    if (it.status === 'booked' || it.status === 'paid') t.booked++;
  });
  return t;
}
const evItems = id => live(db.items).filter(it => it.eventId === id);
const isGeneral = it => !evById(it.eventId);
function evDate(ev) {
  if (ev.date) return ev.date;
  return inf('date') && typeof ev.ord === 'number' ? addDays(inf('date'), ev.ord) : '';
}
function sortedEvents() {
  return live(db.events).slice().sort((a, b) => {
    const da = evDate(a), dbb = evDate(b);
    if (da && dbb && da !== dbb) return da < dbb ? -1 : 1;
    if (!!da !== !!dbb) return da ? -1 : 1;
    const oa = typeof a.ord === 'number' ? a.ord : 999, ob = typeof b.ord === 'number' ? b.ord : 999;
    if (oa !== ob) return oa - ob;
    if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
    return (FN_SEQ[a.key] ?? 99) - (FN_SEQ[b.key] ?? 99) || a.name.localeCompare(b.name);
  });
}
const sideOfHost = h => h === 'both' ? 'shared' : h;
// New guests are invited to the big functions of their side (and the joint ones); family also to their side's home functions.
const defaultEventsFor = (side, group) => sortedEvents().filter(e => !e.fixed &&
  (e.pool === 'all' || e.host === 'both' || e.host === side) &&
  (group === 'Family' ? (e.host === side || e.pool === 'all' || (e.share ?? 0.5) >= 0.25) : (e.share ?? 0.5) >= 0.25)).map(e => e.id);

/* ---------- building the plan from the catalog ---------- */
function qtyFor(t) {
  if (t.pg) return 1;
  const gb = num(inf('guestsBride')), gg = num(inf('guestsGroom'));
  if (Array.isArray(t.q)) return t.q[tierIx()];
  if (t.q === 'cards:bride') return Math.ceil(gb / 3);
  if (t.q === 'cards:groom') return Math.ceil(gg / 3);
  if (t.q === 'rooms:all') return Math.ceil((gb + gg) / 2) * 2;
  return t.q ?? 1;
}
// Catalog-made records get fixed ids and updatedAt=1, so a second phone that builds the same plan
// merges into the first one instead of duplicating it, and real edits always win over the template.
function upsertTpl(t, evId, side, prefix) {
  const id = prefix + slug(t.name);
  const ex = db.items.find(x => x.id === id);
  if (ex && !ex.deleted) return ex;
  const it = {
    id, eventId: evId, cat: t.cat, name: t.name, side, qty: qtyFor(t), unit: t.unit,
    rate: t.gold ? 0 : t.r[tierIx()], tpl: t.r || null, tq: Array.isArray(t.q) ? t.q : null,
    perGuest: !!t.pg, gold: !!t.gold, actual: 0, paid: 0, status: 'plan', due: '', vendor: '', phone: '',
    notes: t.note || '', updatedAt: 1, by: '',
  };
  if (ex) { Object.assign(ex, it, { deleted: false }); stamp(ex); return ex; }
  db.items.push(it); return it;
}
function fnIds(f) { return f.host === 'each' ? [`ev-${f.k}-bride`, `ev-${f.k}-groom`] : [`ev-${f.k}`]; }
function addFunction(f) {
  const hosts = f.host === 'each' ? ['bride', 'groom'] : [f.host];
  hosts.forEach((h, i) => {
    const id = fnIds(f)[i];
    let ev = db.events.find(e => e.id === id);
    if (ev && !ev.deleted) return;
    const name = f.host === 'each' ? `${f.name}, ${h === 'bride' ? 'bride\'s' : 'groom\'s'} home` : f.name;
    const fresh = {
      id, key: f.k, name, date: '', time: '', venue: '', city: inf('city') || '', host: h, guests: 0,
      share: f.g ?? 0.5, pool: f.pool || 'side', fixed: f.fixed || 0, ord: f.off, notes: '', updatedAt: 1, by: '',
    };
    if (ev) { Object.assign(ev, fresh, { deleted: false }); stamp(ev); } else db.events.push(ev = fresh);
    f.items.filter(t => !t.opt).forEach(t => upsertTpl(t, id, f.host === 'each' ? h : (t.side || sideOfHost(h)), `it-${id.slice(3)}-`));
  });
}
function addCustomFunction(name, host) {
  db.events.push(stamp({ id: 'ev-' + uid(), key: '', name, date: '', time: '', venue: '', city: inf('city') || '', host,
    guests: 0, share: host === 'both' ? 0.6 : 0.5, pool: host === 'both' ? 'all' : 'side', fixed: 0, ord: null, notes: '' }));
}
function addChecklist() {
  C.CHECKLIST.forEach(([w, title, owner]) => {
    const id = 'tk-' + slug(title);
    const ex = db.tasks.find(t => t.id === id);
    if (ex && !ex.deleted) return;
    const t = { id, when: w, title, owner, done: false, notes: '', updatedAt: 1, by: '' };
    if (ex) { Object.assign(ex, t, { deleted: false }); stamp(ex); } else db.tasks.push(t);
  });
}
function applyTier() {
  const ix = tierIx(); let n = 0;
  live(db.items).forEach(it => {
    if (!['plan', 'quote'].includes(it.status) || num(it.actual) > 0) return;
    let ch = false;
    if (Array.isArray(it.tpl) && !it.gold && it.rate !== it.tpl[ix]) { it.rate = it.tpl[ix]; ch = true; }
    if (Array.isArray(it.tq) && !it.perGuest && it.qty !== it.tq[ix]) { it.qty = it.tq[ix]; ch = true; }
    if (ch) { stamp(it); n++; }
  });
  return n;
}

/* ---------- navigation ---------- */
const PLAN_VIEWS = ['home', 'functions', 'fn', 'budget', 'guests', 'tasks'];
function showView(v, opts = {}) {
  let redirected = false;
  if (!hasPlan() && PLAN_VIEWS.includes(v)) {
    if (ui.view === 'setup' || opts.fromTab) { toast('First create the plan: tick the functions and tap "Create my wedding plan"'); redirected = true; }
    v = 'setup';
  }
  if (v === 'fn') { if (opts.id) ui.fnId = opts.id; if (!evById(ui.fnId)) v = 'functions'; }
  ui.view = v; saveUi();
  $$('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
  const tab = v === 'fn' ? 'functions' : v;
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === tab));
  if (v === 'settings') fillSettings();
  if (v === 'setup') renderSetup();
  if (v === 'fn') renderFnForm();
  render();
  if (redirected && !$('#setupForm').hidden) $('#setupForm').scrollIntoView({ behavior: 'smooth' });
  else if (!opts.keepScroll) window.scrollTo({ top: 0 });
}
function render() {
  renderHeader();
  ({ home: renderHome, functions: renderFunctions, fn: renderFnItems, budget: renderBudget, guests: renderGuests,
    tasks: renderTasks, settings: renderSettingsDynamic }[ui.view] || (() => {}))();
}
function renderHeader() {
  const b = inf('bride'), g = inf('groom'), d = inf('date');
  $('#appTitle').textContent = b || g ? `${b || 'Bride'} & ${g || 'Groom'}` : 'Wedding Planner';
  let sub = 'Budget · Functions · Guests';
  if (d) {
    const n = daysBetween(dateKey(), d);
    sub = [fmtDate(d), n > 0 ? `${n} days to go` : n === 0 ? 'Today! 🎉' : 'Married 🎉', inf('city')].filter(Boolean).join(' · ');
  } else if (inf('city')) sub = inf('city');
  $('#appSub').textContent = sub;
  document.title = b || g ? `${b} & ${g} · Wedding Planner` : 'Wedding Planner';
}

/* ---------- small render pieces ---------- */
const sidePill = s => `<span class="pill ${esc(s)}"><span class="sw"></span>${esc(SIDE[s] || HOST[s] || s)}</span>`;
const hostPill = h => `<span class="pill ${esc(h)}"><span class="sw"></span>${esc(HOST[h] || h)}</span>`;
const statusPill = s => `<span class="pill ${esc(s)}">${esc(STATUS[s] || s)}</span>`;
function dateBox(k) {
  if (!k) return '<span class="datebox none"><b>–</b><span>date</span></span>';
  const d = parseKey(k);
  return `<span class="datebox"><b>${d.getDate()}</b><span>${d.toLocaleDateString('en-IN', { month: 'short' })}</span></span>`;
}
function itemRow(it, showEv = true) {
  const ev = evById(it.eventId), q = itemQty(it), r = itemRate(it);
  const calc = it.unit && it.unit !== 'lump sum' ? `${fmtQty(q)} ${plural(it.unit, q)} × ${inr(r)}` : '';
  const bits = [showEv ? (ev ? ev.name : 'General') : '', calc, it.vendor].filter(Boolean);
  const paid = num(it.paid);
  return `<li><button class="row" type="button" data-item="${esc(it.id)}">
    <span class="grow"><span class="name">${esc(it.name)}</span><span class="sub">${esc(bits.join(' · ') || ' ')}</span>
      <span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${sidePill(it.side)}${statusPill(it.status)}${num(it.actual) > 0 ? '<span class="pill pending">final price</span>' : ''}</span></span>
    <span class="end"><b class="money">${inr(itemCost(it))}</b>${paid > 0 ? `<span class="sub money">paid ${inrShort(paid)}</span>` : ''}</span>
  </button></li>`;
}
function fnRow(ev) {
  const d = evDate(ev), t = totals(evItems(ev.id));
  const sub = [d ? fmtDay(d) + (ev.date ? '' : ' (suggested)') : 'No date yet', fmtTime(ev.time), ev.venue, `👥 ${headcount(ev).toLocaleString('en-IN')}`].filter(Boolean).join(' · ');
  return `<li><button class="row" type="button" data-fn="${esc(ev.id)}">${dateBox(d)}
    <span class="grow"><span class="name" style="white-space:normal">${esc(ev.name)}</span><span class="sub">${esc(sub)}</span>
      <span style="display:flex;gap:6px;margin-top:4px">${hostPill(ev.host)}</span></span>
    <span class="end"><b class="money">${inrShort(t.est)}</b><span class="sub">${t.n} item${t.n === 1 ? '' : 's'}${t.paid ? ' · ' + pctOf(t.paid, t.est) + '% paid' : ''}</span></span>
  </button></li>`;
}

/* ---------- HOME ---------- */
function renderHome() {
  const items = live(db.items), t = totals(items);
  const buf = num(inf('buffer')), withBuf = t.est * (1 + buf / 100);
  const budB = num(inf('budgetBride')), budG = num(inf('budgetGroom')), budget = budB + budG;
  const sides = { bride: 0, groom: 0, shared: 0 }, paidS = { bride: 0, groom: 0, shared: 0 };
  items.forEach(it => { const s = it.side in sides ? it.side : 'shared'; sides[s] += itemCost(it); paidS[s] += num(it.paid); });
  const share = Math.min(100, Math.max(0, num(inf('sharedPct')))) / 100;
  const fam = {
    bride: { est: sides.bride + sides.shared * share, budget: budB, paid: paidS.bride + paidS.shared * share },
    groom: { est: sides.groom + sides.shared * (1 - share), budget: budG, paid: paidS.groom + paidS.shared * (1 - share) },
  };
  const d = inf('date'), people = inf('useList') && listCount('') ? listCount('') : expectedAll();
  let count = '';
  if (d) {
    const n = daysBetween(dateKey(), d);
    count += n > 0 ? `<div><b>${n}</b><span>days to go</span></div>` : n === 0 ? '<div><b>Today</b><span>wedding day</span></div>' : `<div><b>${-n}</b><span>days married</span></div>`;
  }
  count += `<div><b>${live(db.events).length}</b><span>functions</span></div><div><b>${people.toLocaleString('en-IN')}</b><span>guests</span></div>`;
  const names = inf('bride') || inf('groom') ? `${esc(inf('bride') || 'Bride')} <span style="color:#fbbf24">&</span> ${esc(inf('groom') || 'Groom')}` : 'Our Wedding';
  const meta = [d ? fmtDate(d) : 'Wedding date not set', inf('venue'), inf('city'), inf('type') === 'destination' ? 'Destination wedding' : ''].filter(Boolean).map(esc).join(' · ');

  // who pays
  const sumSides = sides.bride + sides.groom + sides.shared;
  const segs = ['bride', 'groom', 'shared'].filter(s => sides[s] > 0)
    .map(s => `<i class="${s}" style="flex:${sides[s]}" title="${SIDE[s]}: ${inr(sides[s])} (${pctOf(sides[s], sumSides)}%)"></i>`).join('');
  const famRow = (k, label) => {
    const f = fam[k], over = f.budget > 0 && f.est > f.budget;
    const meter = f.budget > 0 ? `<div class="meter" title="${pctOf(f.est, f.budget)}% of budget"><i class="${over ? 'over' : ''}" style="width:${Math.min(100, pctOf(f.est, f.budget))}%"></i></div>` : '';
    const note = f.budget > 0 ? (over ? `<span class="pill over">⚠ ${inrShort(f.est - f.budget)} over budget</span>` : `<span class="pill ok">✓ ${inrShort(f.budget - f.est)} within budget</span>`) : '<span class="muted" style="font-size:13px">No budget set</span>';
    return `<div class="fam"><div class="row1"><b>${label}</b><b class="money">${inr(f.est)}</b></div>${meter}
      <div class="row1" style="font-size:13px"><span class="muted">${SIDE[k]} items ${inrShort(sides[k])} + ${Math.round((k === 'bride' ? share : 1 - share) * 100)}% of shared · paid ${inrShort(f.paid)}${f.budget ? ' · budget ' + inrShort(f.budget) : ''}</span>${note}</div></div>`;
  };

  // categories
  const byCat = C.CATEGORIES.map(c => ({ c, v: sumBy(items.filter(it => it.cat === c.k), itemCost) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const maxCat = byCat.length ? byCat[0].v : 1;
  const catBars = byCat.map(({ c, v }) => `<li data-cat-filter="${c.k}" title="${esc(c.name)}: ${inr(v)} (${pctOf(v, t.est)}% of total)">
    <span class="lbl">${c.icon} ${esc(c.name)}</span><span class="val money">${inrShort(v)}<small>${pctOf(v, t.est)}%</small></span>
    <span class="track"><i class="fill" style="display:block;width:${Math.max(1, v / maxCat * 100)}%"></i></span></li>`).join('');

  // payments
  const today = dateKey();
  const due = items.filter(it => itemBal(it) > 0 && it.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
  const dueHtml = due.length ? `<ul class="list">${due.map(it => {
    const od = it.due < today;
    return `<li><button class="row" type="button" data-item="${esc(it.id)}"><span class="grow"><span class="name">${esc(it.name)}</span>
      <span class="sub ${od ? 'overdue' : ''}">${od ? '⚠ Overdue · ' : ''}${fmtDate(it.due)}${it.vendor ? ' · ' + esc(it.vendor) : ''}</span></span>
      <span class="end"><b class="money">${inr(itemBal(it))}</b>${sidePill(it.side)}</span></button></li>`;
  }).join('')}</ul>` : '<p class="empty">No payment dates yet. Add a "Next payment due" date to an expense to see it here.</p>';

  // guests
  const gs = live(db.guests), gPeople = listCount(''), gB = sumBy(gs.filter(g => g.side === 'bride'), g => Math.max(1, num(g.count))),
    gComing = sumBy(gs.filter(g => g.rsvp === 'yes'), g => Math.max(1, num(g.count))), cards = gs.filter(g => g.card).length;

  // checklist
  const tasks = live(db.tasks), done = tasks.filter(x => x.done).length;
  const next = tasks.filter(x => !x.done).sort((a, b) => (WHEN[b.when]?.days ?? 0) - (WHEN[a.when]?.days ?? 0)).slice(0, 4);

  const fns = sortedEvents();
  $('#view-home').innerHTML = `
  <div class="card hero">
    <p class="names">${names}</p>
    <div class="meta">${meta}</div>
    <div class="count">${count}</div>
    ${!d ? '<div style="margin-top:12px"><button class="btn sm" type="button" data-go="settings">Set the wedding date</button></div>' : ''}
  </div>
  <div class="stats">
    <div class="stat"><span>Estimated total</span><b>${inrShort(t.est)}</b><small>with ${buf}% buffer: ${inrShort(withBuf)}</small></div>
    <div class="stat"><span>Budget</span><b>${budget ? inrShort(budget) : '—'}</b><small>${budget ? (withBuf > budget ? `⚠ ${inrShort(withBuf - budget)} short` : `${inrShort(budget - withBuf)} spare`) : '<a href="#" data-go="settings">Set the budget</a>'}</small></div>
    <div class="stat"><span>Paid so far</span><b>${inrShort(t.paid)}</b><small>${pctOf(t.paid, t.est)}% of the estimate</small></div>
    <div class="stat"><span>Still to pay</span><b>${inrShort(t.bal)}</b><small>${t.booked} of ${t.n} items booked</small></div>
  </div>
  <div class="cols two">
    <div class="card"><h2>👪 Who pays</h2>
      ${sumSides > 0 ? `<div class="seg-bar" role="img" aria-label="Bride side ${pctOf(sides.bride, sumSides)}%, groom side ${pctOf(sides.groom, sumSides)}%, shared ${pctOf(sides.shared, sumSides)}%">${segs}</div>
      <div class="legend">${['bride', 'groom', 'shared'].map(s => `<span><span class="sw ${s}"></span>${SIDE[s]} ${inrShort(sides[s])} · ${pctOf(sides[s], sumSides)}%</span>`).join('')}</div>
      ${famRow('bride', 'Bride\'s family')}${famRow('groom', 'Groom\'s family')}` : '<p class="empty">No expenses yet.</p>'}
    </div>
    <div class="card"><h2>📊 Where the money goes</h2>
      ${byCat.length ? `<ul class="hbars">${catBars}</ul><p class="hint">Tap a category to see its items.</p>` : '<p class="empty">No expenses yet.</p>'}
    </div>
  </div>
  <div class="cols two">
    <div class="card"><h2>📅 Functions <span class="grow"></span><button class="btn sm" type="button" data-go="functions">All</button></h2>
      ${fns.length ? `<ul class="list">${fns.map(fnRow).join('')}</ul>` : '<p class="empty">No functions yet.</p>'}
    </div>
    <div>
      <div class="card"><h2>💳 Upcoming payments</h2>${dueHtml}</div>
      <div class="card"><h2>👥 Guests <span class="grow"></span><button class="btn sm" type="button" data-go="guests">Open</button></h2>
        ${gs.length ? `<div class="grid2" style="gap:8px">
          <div><b class="money">${gPeople.toLocaleString('en-IN')}</b> <span class="muted">people on the list</span></div>
          <div><b>${gComing.toLocaleString('en-IN')}</b> <span class="muted">confirmed coming</span></div>
          <div><span class="sw bride" style="display:inline-block;width:10px;height:10px;border-radius:3px"></span> <b>${gB.toLocaleString('en-IN')}</b> <span class="muted">bride side</span></div>
          <div><span class="sw groom" style="display:inline-block;width:10px;height:10px;border-radius:3px"></span> <b>${(gPeople - gB).toLocaleString('en-IN')}</b> <span class="muted">groom side</span></div>
          <div><b>${cards}/${gs.length}</b> <span class="muted">cards sent</span></div>
        </div>` : `<p class="muted" style="margin:0">No names yet. Costs use the expected ${expectedAll().toLocaleString('en-IN')} guests (${num(inf('guestsBride'))} bride side + ${num(inf('guestsGroom'))} groom side).</p>`}
      </div>
      <div class="card"><h2>✅ Checklist <span class="grow"></span><span class="muted" style="font-size:14px;font-weight:600">${done}/${tasks.length}</span></h2>
        ${tasks.length ? `<div class="meter"><i style="width:${pctOf(done, tasks.length)}%"></i></div>
        <ul class="list">${next.map(x => `<li><button class="row" type="button" data-go="tasks"><span class="grow"><span class="name" style="font-weight:500">${esc(x.title)}</span><span class="sub ${taskDue(x) && taskDue(x) < today ? 'overdue' : ''}">${taskDue(x) && taskDue(x) < today ? '⚠ Late · ' : ''}${esc(WHEN[x.when]?.name || '')}${taskDue(x) ? ' · by ' + fmtDate(taskDue(x)) : ''}</span></span></button></li>`).join('')}</ul>`
        : '<p class="empty">No checklist yet.</p>'}
      </div>
    </div>
  </div>`;
}

/* ---------- FUNCTIONS ---------- */
function renderFunctions() {
  const fns = sortedEvents(), t = totals(live(db.items).filter(it => !isGeneral(it)));
  $('#view-functions').innerHTML = `<div class="card">
    <h2>📅 Functions <span class="grow"></span><button class="btn sm primary" type="button" id="fnAdd">+ Add function</button></h2>
    <p class="hint" style="margin:-6px 0 8px">${fns.length} functions · ${inr(t.est)} estimated · ${inr(t.paid)} paid.${inf('date') ? ' Dates marked "suggested" are worked out from the wedding date until you set the real date.' : ''}</p>
    ${fns.length ? `<ul class="list">${fns.map(fnRow).join('')}</ul>` : '<p class="empty">No functions yet. Tap "Add function".</p>'}
  </div>
  <div class="card"><h2>📖 About the functions</h2>
    <p class="muted" style="margin:0 0 8px;font-size:14px">The usual North Indian and Bihari functions, and who traditionally hosts each one. Every family is different, so add, rename or remove freely.</p>
    ${C.PHASES.map(p => `<h3>${p.name}</h3><ul class="list">${C.FUNCTIONS.filter(f => f.phase === p.k).map(f => `<li style="padding:8px 4px"><b>${esc(f.name)}</b> <span class="muted" style="font-size:13px">· ${f.host === 'each' ? 'at each home' : HOST[f.host]}</span><div class="muted" style="font-size:14px">${esc(f.desc)}</div></li>`).join('')}</ul>`).join('')}
  </div>`;
}

/* ---------- ONE FUNCTION ---------- */
function renderFnForm() {
  const ev = evById(ui.fnId); if (!ev) return;
  const f = FN[ev.key];
  const sug = !ev.date && evDate(ev) ? `Suggested: ${fmtDay(evDate(ev))}` : '';
  $('#view-fn').innerHTML = `
  <div style="margin-bottom:12px"><button class="btn ghost sm" type="button" data-go="functions">← All functions</button></div>
  <div class="cols wide-left">
    <div class="card" id="fnItemsCard"></div>
    <form class="card" id="fnForm2" autocomplete="off">
      <h2 id="fnTitle">${esc(ev.name)}</h2>
      ${f ? `<p class="desc"><b>What it is:</b> ${esc(f.desc)}</p>` : ''}
      <div class="field"><label for="evName">Name</label><input id="evName" data-ev="name" value="${esc(ev.name)}" required></div>
      <div class="grid2">
        <div class="field"><label for="evDate">Date</label><input id="evDate" type="date" data-ev="date" value="${esc(ev.date)}"><p class="hint">${esc(sug)}</p></div>
        <div class="field"><label for="evTime">Time</label><input id="evTime" type="time" data-ev="time" value="${esc(ev.time)}"></div>
        <div class="field"><label for="evVenue">Venue / place</label><input id="evVenue" data-ev="venue" value="${esc(ev.venue)}" placeholder="e.g. Groom's home, Hotel …"></div>
        <div class="field"><label for="evCity">City</label><input id="evCity" data-ev="city" value="${esc(ev.city)}"></div>
        <div class="field"><label for="evHost">Hosted by</label><select id="evHost" data-ev="host">${Object.entries(HOST).map(([k, v]) => `<option value="${k}" ${ev.host === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label for="evGuests">Guests</label><input id="evGuests" type="number" min="0" inputmode="numeric" data-ev="guests" value="${num(ev.guests) > 0 ? num(ev.guests) : ''}" placeholder="auto: ${autoCount(ev)}"></div>
      </div>
      <p class="hint" id="evGuestHint" style="margin-top:-6px"></p>
      <div class="field" style="margin-top:12px"><label for="evNotes">Notes (rituals, timings, who is in charge)</label><textarea id="evNotes" data-ev="notes">${esc(ev.notes)}</textarea></div>
      <button class="btn danger sm" type="button" id="evDel">Delete this function</button>
    </form>
  </div>`;
}
function renderFnItems() {
  const ev = evById(ui.fnId);
  if (!ev) { if (ui.view === 'fn') showView('functions'); return; }
  if (!$('#fnItemsCard')) renderFnForm();
  const items = evItems(ev.id).sort((a, b) => itemCost(b) - itemCost(a)), t = totals(items);
  const f = FN[ev.key], prefix = `it-${ev.id.slice(3)}-`;
  const missing = f ? f.items.filter(x => !db.items.some(it => it.id === prefix + slug(x.name) && !it.deleted)) : [];
  const n = listCount(ev.id);
  $('#evGuestHint').textContent = `Leave blank for automatic: ${autoCount(ev)} (${inf('useList') && n ? 'from the guest list' : 'from the expected guest numbers'}). ${n} people on the guest list are invited to this function.`;
  $('#fnTitle').textContent = ev.name;
  $('#evGuests').placeholder = 'auto: ' + autoCount(ev);
  $('#fnItemsCard').innerHTML = `
    <h2>💰 Expenses <span class="grow"></span><button class="btn sm primary" type="button" data-add-item="${esc(ev.id)}">+ Add expense</button></h2>
    <div class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="stat"><span>Estimate</span><b>${inrShort(t.est)}</b><small>${headcount(ev)} guests</small></div>
      <div class="stat"><span>Paid</span><b>${inrShort(t.paid)}</b><small>${pctOf(t.paid, t.est)}%</small></div>
      <div class="stat"><span>To pay</span><b>${inrShort(t.bal)}</b><small>${t.booked}/${t.n} booked</small></div>
    </div>
    ${items.length ? `<ul class="list">${items.map(it => itemRow(it, false)).join('')}</ul>` : '<p class="empty">No expenses yet.</p>'}
    ${missing.length ? `<h3>Suggestions</h3><div class="chips">${missing.map(x => `<button class="chip" type="button" data-add-tpl="${esc(x.name)}">+ ${esc(x.name)}</button>`).join('')}</div>` : ''}`;
}

/* ---------- BUDGET ---------- */
function renderBudget() {
  const evs = sortedEvents();
  fillSelect($('#bSide'), [['', 'Paid by: everyone'], ...Object.entries(SIDE)], ui.bSide);
  fillSelect($('#bEv'), [['', 'All functions'], ['general', 'General (whole wedding)'], ...evs.map(e => [e.id, e.name])], ui.bEv);
  fillSelect($('#bCat'), [['', 'All categories'], ...C.CATEGORIES.map(c => [c.k, `${c.icon} ${c.name}`])], ui.bCat);
  fillSelect($('#bStatus'), [['', 'Any status'], ...Object.entries(STATUS), ['due', 'Booked, balance to pay']], ui.bStatus);
  if ($('#bQ').value !== ui.bQ && document.activeElement !== $('#bQ')) $('#bQ').value = ui.bQ;
  const q = ui.bQ.trim().toLowerCase();
  const items = live(db.items).filter(it =>
    (!ui.bSide || it.side === ui.bSide) &&
    (!ui.bEv || (ui.bEv === 'general' ? isGeneral(it) : it.eventId === ui.bEv)) &&
    (!ui.bCat || it.cat === ui.bCat) &&
    (!ui.bStatus || (ui.bStatus === 'due' ? (it.status === 'booked' && itemBal(it) > 0) : it.status === ui.bStatus)) &&
    (!q || [it.name, it.vendor, it.notes, it.phone, evById(it.eventId)?.name].join(' ').toLowerCase().includes(q)));
  const t = totals(items), filtered = ui.bSide || ui.bEv || ui.bCat || ui.bStatus || q;
  let groups;
  if (ui.bGroup === 'fn') groups = [{ key: 'general', icon: '🧾', name: 'General (whole wedding)', items: items.filter(isGeneral) },
    ...evs.map(e => ({ key: e.id, icon: '📅', name: e.name, items: items.filter(it => it.eventId === e.id) }))];
  else if (ui.bGroup === 'side') groups = Object.entries(SIDE).map(([k, v]) => ({ key: k, icon: `<span class="sw ${k}" style="display:inline-block;width:14px;height:14px;border-radius:4px"></span>`, name: v, items: items.filter(it => it.side === k) }));
  else groups = C.CATEGORIES.map(c => ({ key: c.k, icon: c.icon, name: c.name, items: items.filter(it => it.cat === c.k) }));
  groups = groups.filter(g => g.items.length);
  const genMissing = [...C.GENERAL.map(x => ['it-gen-', x]), ...C.DESTINATION.map(x => ['it-dest-', x])]
    .filter(([p, x]) => !db.items.some(it => it.id === p + slug(x.name) && !it.deleted));
  $('#budgetBody').innerHTML = `
    <div class="stats">
      <div class="stat"><span>${filtered ? 'Estimate (filtered)' : 'Estimated total'}</span><b>${inrShort(t.est)}</b><small>${inr(t.est)}</small></div>
      <div class="stat"><span>Paid</span><b>${inrShort(t.paid)}</b><small>${pctOf(t.paid, t.est)}% paid</small></div>
      <div class="stat"><span>Still to pay</span><b>${inrShort(t.bal)}</b><small>${inr(t.bal)}</small></div>
      <div class="stat"><span>Items</span><b>${t.n}</b><small>${t.booked} booked</small></div>
    </div>
    <div class="btn-row" style="margin-bottom:12px">
      <button class="btn primary" type="button" data-add-item="">+ Add expense</button>
      <button class="btn ghost" type="button" data-act="excel">⬇ Excel</button>
      <button class="btn ghost" type="button" data-act="print">🖨 Print</button>
    </div>
    <div class="seg" id="bGroupSeg">${[['cat', 'By category'], ['fn', 'By function'], ['side', 'By who pays']].map(([k, v]) => `<button type="button" data-bgroup="${k}" class="${ui.bGroup === k ? 'active' : ''}">${v}</button>`).join('')}</div>
    ${groups.length ? groups.map(g => {
      const gt = totals(g.items);
      const gk = `b:${ui.bGroup}:${g.key}`;
      return `<details class="group" data-gkey="${esc(gk)}" ${isOpen(gk, true) ? 'open' : ''}><summary><span class="ico">${g.icon}</span><span class="grow">${esc(g.name)} <span class="muted" style="font-weight:500;font-size:13px">· ${g.items.length}</span></span><span class="money">${inr(gt.est)}</span></summary>
        <ul class="list">${g.items.sort((a, b) => itemCost(b) - itemCost(a)).map(it => itemRow(it, ui.bGroup !== 'fn')).join('')}</ul></details>`;
    }).join('') : `<p class="empty">${filtered ? 'Nothing matches these filters.' : 'No expenses yet.'}</p>`}
    ${genMissing.length ? `<div class="card" style="margin-top:14px"><h2>💡 Not in your plan yet</h2><p class="hint" style="margin:-6px 0 10px">Whole-wedding costs you might add. Tap to add one with a starting price.</p>
      <div class="chips">${genMissing.map(([p, x]) => `<button class="chip" type="button" data-add-gen="${esc(p + slug(x.name))}">+ ${esc(x.name)}</button>`).join('')}</div></div>` : ''}`;
}

/* ---------- GUESTS ---------- */
function renderGuests() {
  const evs = sortedEvents(), all = live(db.guests);
  fillSelect($('#gSide'), [['', 'Both sides'], ['bride', 'Bride side'], ['groom', 'Groom side']], ui.gSide);
  fillSelect($('#gGroup'), [['', 'All groups'], ...GROUPS.map(g => [g, g])], ui.gGroup);
  fillSelect($('#gRsvp'), [['', 'Any reply'], ...Object.entries(RSVP), ['nocard', 'Card not sent'], ['stay', 'Needs a room']], ui.gRsvp);
  fillSelect($('#gEv'), [['', 'All functions'], ...evs.map(e => [e.id, e.name])], ui.gEv);
  if ($('#gQ').value !== ui.gQ && document.activeElement !== $('#gQ')) $('#gQ').value = ui.gQ;
  const ppl = arr => sumBy(arr, g => Math.max(1, num(g.count)));
  const total = ppl(all), bride = ppl(all.filter(g => g.side === 'bride'));
  $('#guestStats').innerHTML = `<div class="stats six">
    <div class="stat"><span>People</span><b>${total.toLocaleString('en-IN')}</b><small>${all.length} entries</small></div>
    <div class="stat"><span>Bride side</span><b>${bride.toLocaleString('en-IN')}</b><small>expected ${num(inf('guestsBride'))}</small></div>
    <div class="stat"><span>Groom side</span><b>${(total - bride).toLocaleString('en-IN')}</b><small>expected ${num(inf('guestsGroom'))}</small></div>
    <div class="stat"><span>Coming</span><b>${ppl(all.filter(g => g.rsvp === 'yes')).toLocaleString('en-IN')}</b><small>${ppl(all.filter(g => g.rsvp === 'no'))} not coming</small></div>
    <div class="stat"><span>Cards sent</span><b>${all.filter(g => g.card).length}</b><small>of ${all.length}</small></div>
    <div class="stat"><span>Need rooms</span><b>${ppl(all.filter(g => g.stay)).toLocaleString('en-IN')}</b><small>people</small></div>
  </div>
  <details class="group" data-gkey="g:head" ${isOpen('g:head', false) ? 'open' : ''}><summary><span class="ico">📋</span><span class="grow">Headcount per function</span></summary>
    <div style="padding:12px 14px">
      <label class="check"><input type="checkbox" id="useList" ${inf('useList') ? 'checked' : ''}> Use the guest list for plate counts (turn on once the list is complete)</label>
      <div class="tbl-wrap"><table><thead><tr><th>Function</th><th class="num">On list</th><th class="num">Coming</th><th class="num">Expected</th><th class="num">Used for costs</th></tr></thead><tbody>
      ${evs.map(e => { const inv = all.filter(g => (g.events || []).includes(e.id)); return `<tr><td>${esc(e.name)}</td><td class="num">${ppl(inv)}</td><td class="num">${ppl(inv.filter(g => g.rsvp === 'yes'))}</td><td class="num">${expectedFor(e)}</td><td class="num"><b>${headcount(e)}</b>${num(e.guests) > 0 ? ' <span class="muted">(set by hand)</span>' : ''}</td></tr>`; }).join('')}
      </tbody></table></div>
    </div></details>`;
  const q = ui.gQ.trim().toLowerCase();
  const list = all.filter(g =>
    (!ui.gSide || g.side === ui.gSide) && (!ui.gGroup || g.group === ui.gGroup) && (!ui.gEv || (g.events || []).includes(ui.gEv)) &&
    (!ui.gRsvp || (ui.gRsvp === 'nocard' ? !g.card : ui.gRsvp === 'stay' ? g.stay : (g.rsvp || 'pending') === ui.gRsvp)) &&
    (!q || [g.name, g.phone, g.city, g.relation, g.notes].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
  $('#guestBody').innerHTML = `
    <div class="btn-row" style="margin-bottom:12px">
      <button class="btn primary" type="button" id="gAdd">+ Add guest</button>
      <button class="btn" type="button" id="gBulk">Add many / import</button>
      <button class="btn" type="button" data-act="guestsCsv">Download list (CSV)</button>
    </div>
    <div class="card" style="padding:6px 12px">
      ${list.length ? `<p class="hint" style="margin:6px 4px">${list.length} entries · ${ppl(list).toLocaleString('en-IN')} people</p><ul class="list">${list.map(g => `<li style="display:flex;align-items:center;gap:6px">
        <button class="row" type="button" data-guest="${esc(g.id)}" style="flex:1;min-width:0"><span class="av ${esc(g.side)}">${esc(initials(g.name))}</span>
          <span class="grow"><span class="name">${esc(g.name)}</span><span class="sub">${esc([g.relation, g.group, g.city, g.phone].filter(Boolean).join(' · ') || SIDE[g.side])}</span></span>
          <span class="end"><b>👥 ${Math.max(1, num(g.count))}</b><span class="pill ${esc(g.rsvp || 'pending')}">${esc(RSVP[g.rsvp || 'pending'])}</span></span></button>
        <button class="btn sm ${g.card ? '' : 'ghost'}" type="button" data-card="${esc(g.id)}" title="${g.card ? 'Card sent, tap to undo' : 'Mark card as sent'}" style="flex:none;padding:5px 8px">${g.card ? '✉ Sent' : '✉ Send'}</button></li>`).join('')}</ul>`
      : `<p class="empty">${all.length ? 'Nobody matches these filters.' : 'No guests yet. Add them one by one, or paste a whole list with "Add many".'}</p>`}
    </div>`;
}

/* ---------- CHECKLIST ---------- */
function taskDue(t) { const d = inf('date'), w = WHEN[t.when]; return d && w ? addDays(d, -w.days) : ''; }
function renderTasks() {
  const all = live(db.tasks), today = dateKey();
  const list = all.filter(t => (!ui.tOwner || t.owner === ui.tOwner || t.owner === 'both') && (!ui.tHideDone || !t.done));
  const done = all.filter(t => t.done).length;
  $('#view-tasks').innerHTML = `
    <div class="card"><h2>✅ Checklist <span class="grow"></span><button class="btn sm primary" type="button" id="tAdd">+ Add task</button></h2>
      <div class="meter"><i style="width:${pctOf(done, all.length)}%"></i></div>
      <p class="hint">${done} of ${all.length} done${inf('date') ? '' : ' · Set the wedding date in Settings to see a "do by" date for each task'}.</p>
    </div>
    <div class="seg">${[['', 'Everyone'], ['bride', 'Bride side'], ['groom', 'Groom side']].map(([k, v]) => `<button type="button" data-towner="${k}" class="${ui.tOwner === k ? 'active' : ''}">${v}</button>`).join('')}</div>
    <label class="check"><input type="checkbox" id="tHide" ${ui.tHideDone ? 'checked' : ''}> Hide finished tasks</label>
    ${all.length ? '' : '<div class="card"><p class="empty">No checklist yet.</p><button class="btn block" type="button" id="tStd">Add the standard wedding checklist</button></div>'}
    ${C.WHEN.map(w => {
      const ts = list.filter(t => t.when === w.k); if (!ts.length) return '';
      const due = taskDue({ when: w.k }), late = due && due < today && ts.some(t => !t.done);
      return `<details class="group" data-gkey="t:${w.k}" ${isOpen('t:' + w.k, true) ? 'open' : ''}><summary><span class="grow">${esc(w.name)} <span class="muted" style="font-weight:500;font-size:13px">${due ? '· by ' + fmtDate(due) : ''}</span></span>
        ${late ? '<span class="pill over">⚠ late</span>' : ''}<span class="muted" style="font-size:13px">${ts.filter(t => t.done).length}/${ts.length}</span></summary>
        <ul class="list">${ts.map(t => `<li class="task ${t.done ? 'done' : ''}"><input type="checkbox" data-tdone="${esc(t.id)}" ${t.done ? 'checked' : ''} aria-label="Done">
          <span class="grow"><span class="t" data-tedit="${esc(t.id)}">${esc(t.title)}</span>${t.notes ? `<span class="sub">${esc(t.notes)}</span>` : ''}</span>
          ${t.owner !== 'both' ? sidePill(t.owner) : ''}</li>`).join('')}</ul></details>`;
    }).join('')}
    ${all.length ? `<p class="hint" style="text-align:center">Tap a task to edit it.</p>` : ''}`;
}

/* ---------- SETUP ---------- */
let suTier = 'mid', pendingJoin = null;
function renderSetup() {
  $('#setupForm').hidden = hasPlan();
  // details already typed in Settings (or synced from another phone) carry over into the form
  const pre = { suBride: 'bride', suGroom: 'groom', suDate: 'date', suCity: 'city', suType: 'type', suGB: 'guestsBride', suGG: 'guestsGroom' };
  Object.entries(pre).forEach(([id, k]) => { if (db.info[k] != null && db.info[k] !== '') $('#' + id).value = db.info[k]; });
  if (db.info.tier) { suTier = db.info.tier; $$('#suTier button').forEach(x => x.classList.toggle('active', x.dataset.tier === suTier)); }
  $('#setupNote').hidden = hasPlan() || !Object.values(pre).some(k => db.info[k]);
  $('#joinCard').hidden = !pendingJoin;
  if (pendingJoin) {
    $('#joinText').textContent = `This link connects the app to the shared wedding plan in the GitHub repository "${pendingJoin.o}/${pendingJoin.r}". The plan downloads here, and any change you make is shared with everyone else.`;
    $('#joinUser').value = cfg.user || '';
  }
  if (!$('#suFns').children.length) {
    $('#suFns').innerHTML = C.PHASES.map(p => `<h3>${p.name}</h3>` + C.FUNCTIONS.filter(f => f.phase === p.k).map(f => `
      <label class="fnpick"><input type="checkbox" value="${f.k}" ${f.on ? 'checked' : ''}><span><b>${esc(f.name)}</b>
      <small>${f.host === 'each' ? 'At each home' : HOST[f.host]} · ${esc(f.desc)}</small></span></label>`).join('')).join('');
  }
}
function createPlan() {
  const v = id => $('#' + id).value.trim();
  setInfo('bride', v('suBride')); setInfo('groom', v('suGroom')); setInfo('date', v('suDate')); setInfo('city', v('suCity'));
  setInfo('type', v('suType')); setInfo('guestsBride', num(v('suGB'))); setInfo('guestsGroom', num(v('suGG')));
  setInfo('tier', suTier); setInfo('created', Date.now());
  $$('#suFns input:checked').forEach(cb => FN[cb.value] && addFunction(FN[cb.value]));
  C.GENERAL.filter(t => !t.opt).forEach(t => upsertTpl(t, '', t.side || 'shared', 'it-gen-'));
  if (inf('type') === 'destination') C.DESTINATION.forEach(t => upsertTpl(t, '', t.side || 'shared', 'it-dest-'));
  if ($('#suTasks').checked) addChecklist();
  dirty++; save(); scheduleSync();
  showView('home');
  toast('Your wedding plan is ready', 'ok');
}

/* ---------- SETTINGS ---------- */
function fillSettings() {
  $$('[data-info]').forEach(el => { const v = inf(el.dataset.info); el.value = v ?? ''; });
  $('#cUser').value = cfg.user || ''; $('#cOwner').value = cfg.owner || ''; $('#cRepo').value = cfg.repo || '';
  $('#cBranch').value = cfg.branch || ''; $('#cFolder').value = cfg.folder || ''; $('#cToken').value = cfg.token || '';
  renderSettingsDynamic();
}
function renderSettingsDynamic() {
  const d = inf('date');
  let hint = '';
  if (d) {
    const m = parseKey(d).getMonth() + 1, day = parseKey(d).getDate();
    if ((m === 12 && day >= 15) || (m === 1 && day <= 14) || (m === 3 && day >= 14) || (m === 4 && day <= 14))
      hint = '⚠ This date may fall in Kharmas (roughly mid-Dec to mid-Jan and mid-Mar to mid-Apr), when weddings are usually not held. Please check with your pandit.';
  }
  $('#sDateHint').textContent = hint;
  $('#noPlanNote').hidden = hasPlan();
  $('#sGoldHint').textContent = `Jewellery is priced at ${inr(goldRate())} per gram (22K rate + ${num(inf('making'))}% making + 3% GST). The 22K rate was ₹${C.GOLD.k22.toLocaleString('en-IN')} per gram on ${C.GOLD.asOf} (${C.GOLD.src}). Update it before you buy.`;
  $('#aboutPrices').innerHTML = C.NOTES.map(n => `<p style="margin:0 0 8px">${esc(n)}</p>`).join('') +
    `<details><summary style="cursor:pointer">Sources</summary><ul style="padding-left:18px;margin:6px 0 0">${C.SOURCES.map(s => `<li><a href="${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70))}</a></li>`).join('')}</ul></details>`;
  renderLastSync();
}

/* ---------- DIALOGS: expense ---------- */
let dlgTpl = null;
function openItem(id, preset = {}) {
  const it = id ? db.items.find(x => x.id === id) : null;
  $('#itemTitle').textContent = it ? 'Edit expense' : 'Add expense';
  fillSelect($('#iCat'), C.CATEGORIES.map(c => [c.k, `${c.icon} ${c.name}`]), it?.cat || preset.cat || 'misc');
  fillSelect($('#iEv'), [['', 'General (whole wedding)'], ...sortedEvents().map(e => [e.id, e.name])], it ? (evById(it.eventId) ? it.eventId : '') : (preset.eventId || ''));
  fillSelect($('#iStatus'), Object.entries(STATUS), it?.status || 'plan');
  const ev = evById($('#iEv').value);
  $('#iSide').value = it?.side || (ev ? sideOfHost(ev.host) : 'shared');
  $('#iId').value = it?.id || '';
  $('#iName').value = it?.name || '';
  $('#iQty').value = it ? (it.qty ?? '') : 1;
  $('#iUnit').value = it?.unit || 'lump sum';
  $('#iRate').value = it && num(it.rate) ? it.rate : '';
  $('#iPerGuest').checked = !!it?.perGuest;
  $('#iGold').checked = !!it?.gold;
  $('#iActual').value = it && num(it.actual) ? it.actual : '';
  $('#iPaid').value = it && num(it.paid) ? it.paid : '';
  $('#iDue').value = it?.due || '';
  $('#iVendor').value = it?.vendor || ''; $('#iPhone').value = it?.phone || ''; $('#iNotes').value = it?.notes || '';
  $('#iDel').hidden = !it;
  $('#iBy').textContent = it && it.updatedAt > 1 ? `Last changed ${new Date(it.updatedAt).toLocaleString('en-IN')}${it.by ? ' by ' + it.by : ''}` : '';
  dlgTpl = it ? (it.tpl ? { r: it.tpl, tq: it.tq } : null) : null;
  $('#iNames').innerHTML = ALL_TPL.map(t => `<option value="${esc(t.name)}">`).join('');
  $('#iUnits').innerHTML = C.UNITS.map(u => `<option value="${esc(u)}">`).join('');
  updateItemEst();
  $('#itemDlg').showModal();
  if (!it) $('#iName').focus();
}
function updateItemEst() {
  const ev = evById($('#iEv').value), pg = $('#iPerGuest').checked, gold = $('#iGold').checked;
  const q = pg ? headcount(ev) : num($('#iQty').value), r = gold ? goldRate() : num($('#iRate').value);
  $('#iQty').disabled = pg; if (pg) $('#iQty').value = q;
  $('#iRate').disabled = gold; if (gold) $('#iRate').value = Math.round(r);
  $('#iGoldRow').hidden = !(gold || $('#iUnit').value.trim() === 'g');
  $('#iEst').textContent = inr(q * r);
  const hints = [];
  if (pg) hints.push(`Uses the ${q} guests of ${ev ? ev.name : 'the whole wedding'}.`);
  if (gold) hints.push(`Gold: ${inr(goldRate())} per gram (22K ${inr(num(inf('gold22')))} + ${num(inf('making'))}% making + 3% GST).`);
  if (dlgTpl?.r) hints.push(`Typical rate: ${dlgTpl.r.map((x, i) => `${inr(x)} ${TIER_NAME[TIERS[i]].toLowerCase()}`).join(' · ')}.`);
  if (num($('#iActual').value) > 0) hints.push('The final amount is used in the totals instead of the estimate.');
  $('#iHint').textContent = hints.join(' ');
}
function applyItemTemplate() { // picking a known item name fills in its usual unit and price
  if ($('#iId').value) return;
  const t = ALL_TPL.find(x => x.name.toLowerCase() === $('#iName').value.trim().toLowerCase());
  if (!t) { dlgTpl = null; updateItemEst(); return; }
  dlgTpl = { r: t.r, tq: Array.isArray(t.q) ? t.q : null };
  $('#iCat').value = t.cat; $('#iUnit').value = t.unit; $('#iQty').value = qtyFor(t);
  $('#iPerGuest').checked = !!t.pg; $('#iGold').checked = !!t.gold;
  $('#iRate').value = t.gold ? '' : t.r[tierIx()];
  if (t.side) $('#iSide').value = t.side;
  if (t.note && !$('#iNotes').value) $('#iNotes').value = t.note;
  updateItemEst();
}
function saveItem() {
  const name = $('#iName').value.trim(); if (!name) { $('#iName').focus(); return; }
  const id = $('#iId').value;
  let it = id ? db.items.find(x => x.id === id) : null;
  const vals = {
    name, cat: $('#iCat').value, eventId: $('#iEv').value, side: $('#iSide').value,
    perGuest: $('#iPerGuest').checked, gold: $('#iGold').checked, unit: $('#iUnit').value.trim() || 'lump sum',
    actual: num($('#iActual').value), paid: num($('#iPaid').value), status: $('#iStatus').value, due: $('#iDue').value,
    vendor: $('#iVendor').value.trim(), phone: $('#iPhone').value.trim(), notes: $('#iNotes').value.trim(),
  };
  if (!vals.perGuest) vals.qty = num($('#iQty').value);
  if (!vals.gold) vals.rate = num($('#iRate').value);
  if (!it) { it = { id: 'it-' + uid(), tpl: dlgTpl?.r || null, tq: dlgTpl?.tq || null, qty: 1, rate: 0 }; db.items.push(it); }
  Object.assign(it, vals, { deleted: false });
  // keep the status in step with payments
  if (vals.paid > 0 && ['plan', 'quote'].includes(it.status)) it.status = 'booked';
  if (vals.paid > 0 && vals.paid >= itemCost(it) && it.status === 'booked') it.status = 'paid';
  stamp(it);
  $('#itemDlg').close(); changed(); toast('Saved', 'ok');
}

/* ---------- DIALOGS: guest ---------- */
function guestEventChecks(selected) {
  const evs = sortedEvents();
  $('#gEvents').innerHTML = evs.length ? evs.map(e => `<label class="check"><input type="checkbox" value="${esc(e.id)}" ${selected.includes(e.id) ? 'checked' : ''}> ${esc(e.name)}</label>`).join('')
    : '<p class="hint">No functions yet.</p>';
}
function openGuest(id) {
  const g = id ? db.guests.find(x => x.id === id) : null;
  $('#guestTitle').textContent = g ? 'Edit guest' : 'Add guest';
  fillSelect($('#gGroupI'), GROUPS.map(x => [x, x]), g?.group || 'Family');
  fillSelect($('#gRsvpI'), Object.entries(RSVP), g?.rsvp || 'pending');
  $('#gId').value = g?.id || ''; $('#gName').value = g?.name || '';
  $('#gSideI').value = g?.side || ui.gSide || 'bride';
  $('#gCount').value = g ? Math.max(1, num(g.count)) : 1;
  $('#gRel').value = g?.relation || ''; $('#gPhone').value = g?.phone || ''; $('#gCity').value = g?.city || '';
  $('#gCard').checked = !!g?.card; $('#gStay').checked = !!g?.stay; $('#gNotes').value = g?.notes || '';
  guestEventChecks(g ? (g.events || []) : defaultEventsFor($('#gSideI').value, $('#gGroupI').value));
  $('#gDel').hidden = !g;
  $('#guestDlg').showModal();
  if (!g) $('#gName').focus();
}
function saveGuest() {
  const name = $('#gName').value.trim(); if (!name) { $('#gName').focus(); return; }
  const id = $('#gId').value;
  let g = id ? db.guests.find(x => x.id === id) : null;
  if (!g) { g = { id: 'gu-' + uid() }; db.guests.push(g); }
  Object.assign(g, {
    name, side: $('#gSideI').value, group: $('#gGroupI').value, count: Math.max(1, num($('#gCount').value) || 1),
    relation: $('#gRel').value.trim(), phone: $('#gPhone').value.trim(), city: $('#gCity').value.trim(),
    events: $$('#gEvents input:checked').map(x => x.value), rsvp: $('#gRsvpI').value, card: $('#gCard').checked,
    stay: $('#gStay').checked, notes: $('#gNotes').value.trim(), deleted: false,
  });
  stamp(g);
  $('#guestDlg').close(); changed(); toast('Guest saved', 'ok');
}
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ',' || ch === '\t' || ch === ';') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(Boolean));
}
function addGuests(rows, side, group) {
  let n = 0;
  rows.forEach(r => {
    if (!r.name) return;
    const s = /groom|var|ladka/i.test(r.side || '') ? 'groom' : /bride|vadhu|ladki/i.test(r.side || '') ? 'bride' : side;
    const grp = GROUPS.find(x => x.toLowerCase() === String(r.group || '').toLowerCase()) || group;
    db.guests.push(stamp({ id: 'gu-' + uid(), name: r.name, side: s, group: grp, count: Math.max(1, num(r.count) || 1),
      relation: r.relation || '', phone: r.phone || '', city: r.city || '', events: defaultEventsFor(s, grp), rsvp: 'pending',
      card: false, stay: false, notes: '' }));
    n++;
  });
  return n;
}
function rowsFromCsv(text) {
  const rows = parseCsv(text); if (!rows.length) return [];
  const head = rows[0].map(h => h.toLowerCase());
  const col = (...names) => head.findIndex(h => names.some(n => h.includes(n)));
  const ix = { name: col('name', 'naam'), side: col('side'), group: col('group'), relation: col('relation', 'rishta'), phone: col('phone', 'mobile', 'contact'), city: col('city', 'place'), count: col('people', 'count', 'members', 'persons', 'pax') };
  const hasHead = ix.name >= 0;
  if (!hasHead) return rows.map(r => ({ name: r[0], phone: r[1], count: r[2], city: r[3] }));
  return rows.slice(1).map(r => Object.fromEntries(Object.entries(ix).filter(([, i]) => i >= 0).map(([k, i]) => [k, r[i] || ''])));
}

/* ---------- DIALOGS: functions & tasks ---------- */
function openFnPicker() {
  $('#fnList').innerHTML = C.PHASES.map(p => `<h3>${p.name}</h3>` + C.FUNCTIONS.filter(f => f.phase === p.k).map(f => {
    const have = fnIds(f).every(evById);
    return `<label class="fnpick"><input type="checkbox" value="${f.k}" ${have ? 'checked disabled' : ''}><span><b>${esc(f.name)} ${have ? '<span class="pill ok">added</span>' : ''}</b>
      <small>${f.host === 'each' ? 'At each home' : HOST[f.host]} · ${esc(f.desc)}</small></span></label>`;
  }).join('')).join('');
  $('#fnCustom').value = '';
  $('#fnDlg').showModal();
}
function openTask(id) {
  const t = id ? db.tasks.find(x => x.id === id) : null;
  $('#taskTitle').textContent = t ? 'Edit task' : 'Add task';
  fillSelect($('#tWhen'), C.WHEN.map(w => [w.k, w.name]), t?.when || '1m');
  $('#tId').value = t?.id || ''; $('#tText').value = t?.title || ''; $('#tOwner').value = t?.owner || 'both'; $('#tNotes').value = t?.notes || '';
  $('#tDel').hidden = !t;
  $('#taskDlg').showModal();
}

/* ---------- EXPORT ---------- */
function exportRows() {
  const items = live(db.items), evs = sortedEvents(), t = totals(items);
  const expenses = [['Category', 'Item', 'Function', 'Paid by', 'Quantity', 'Unit', 'Rate', 'Estimate', 'Final amount', 'Paid', 'Balance', 'Status', 'Payment due', 'Vendor', 'Phone', 'Details']];
  C.CATEGORIES.forEach(c => items.filter(it => it.cat === c.k).forEach(it => expenses.push([c.name, it.name, evById(it.eventId)?.name || 'General', SIDE[it.side] || it.side,
    itemQty(it), it.unit, Math.round(itemRate(it)), Math.round(itemEst(it)), num(it.actual) || '', num(it.paid), Math.round(itemBal(it)), STATUS[it.status] || it.status, it.due || '', it.vendor || '', it.phone || '', it.notes || ''])));
  const functions = [['Function', 'Date', 'Time', 'Venue', 'City', 'Hosted by', 'Guests', 'Estimate', 'Paid', 'Balance', 'Notes']];
  evs.forEach(e => { const et = totals(evItems(e.id)); functions.push([e.name, evDate(e), e.time || '', e.venue || '', e.city || '', HOST[e.host], headcount(e), Math.round(et.est), et.paid, Math.round(et.bal), e.notes || '']); });
  const gt = totals(items.filter(isGeneral));
  functions.push(['General (whole wedding)', '', '', '', '', '', '', Math.round(gt.est), gt.paid, Math.round(gt.bal), '']);
  const guests = [['Name', 'Side', 'Group', 'Relation', 'Phone', 'City', 'People', 'Invited to', 'Card sent', 'Reply', 'Needs room', 'Notes']];
  live(db.guests).sort((a, b) => a.side.localeCompare(b.side) || a.name.localeCompare(b.name)).forEach(g => guests.push([g.name, SIDE[g.side], g.group || '', g.relation || '', g.phone || '', g.city || '',
    Math.max(1, num(g.count)), (g.events || []).map(id => evById(id)?.name).filter(Boolean).join(', '), g.card ? 'Yes' : 'No', RSVP[g.rsvp || 'pending'], g.stay ? 'Yes' : 'No', g.notes || '']));
  const tasks = [['When', 'Do by', 'Task', 'Who', 'Done', 'Notes']];
  C.WHEN.forEach(w => live(db.tasks).filter(x => x.when === w.k).forEach(x => tasks.push([w.name, taskDue(x), x.title, x.owner === 'both' ? 'Both families' : SIDE[x.owner], x.done ? 'Yes' : 'No', x.notes || ''])));
  const sides = Object.keys(SIDE).map(s => [SIDE[s], Math.round(sumBy(items.filter(it => it.side === s), itemCost)), sumBy(items.filter(it => it.side === s), it => num(it.paid))]);
  const summary = [
    ['Wedding planner', `${inf('bride') || 'Bride'} & ${inf('groom') || 'Groom'}`], ['Wedding date', inf('date') || ''], ['City / destination', inf('city') || ''],
    ['Exported', new Date().toLocaleString('en-IN')], [],
    ['Estimated total', Math.round(t.est)], [`With ${num(inf('buffer'))}% buffer`, Math.round(t.est * (1 + num(inf('buffer')) / 100))],
    ['Paid so far', t.paid], ['Still to pay', Math.round(t.bal)],
    ['Budget, bride side', num(inf('budgetBride'))], ['Budget, groom side', num(inf('budgetGroom'))], [],
    ['Paid by', 'Estimate', 'Paid'], ...sides, [],
    ['Category', 'Estimate', '% of total'],
    ...C.CATEGORIES.map(c => { const v = sumBy(items.filter(it => it.cat === c.k), itemCost); return [c.name, Math.round(v), pctOf(v, t.est) + '%']; }).filter(r => r[1] > 0),
  ];
  return { summary, expenses, functions, guests, tasks };
}
function exportExcel() {
  const r = exportRows(), name = `wedding-plan-${dateKey()}`;
  if (!window.XLSX) {
    const csv = r.expenses.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv' }), name + '-expenses.csv');
    toast('Excel library is not loaded (offline?), so a CSV was downloaded instead');
    return;
  }
  const wb = XLSX.utils.book_new();
  const add = (title, rows, widths) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = widths.map(w => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, title); };
  add('Summary', r.summary, [28, 22, 14]);
  add('Expenses', r.expenses, [24, 40, 26, 12, 9, 11, 10, 12, 12, 11, 11, 11, 12, 20, 14, 40]);
  add('Functions', r.functions, [34, 12, 8, 24, 14, 14, 8, 12, 11, 11, 30]);
  add('Guests', r.guests, [30, 11, 11, 18, 14, 14, 7, 50, 9, 11, 10, 24]);
  add('Checklist', r.tasks, [20, 12, 60, 14, 6, 30]);
  XLSX.writeFile(wb, name + '.xlsx');
}
function exportGuestsCsv() {
  const rows = exportRows().guests;
  const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  download(new Blob(['﻿' + csv], { type: 'text/csv' }), `guest-list-${dateKey()}.csv`);
}
function printReport() {
  const items = live(db.items), t = totals(items);
  const row = cells => `<tr>${cells.map((c, i) => `<td${i && typeof c === 'number' ? ' style="text-align:right"' : ''}>${typeof c === 'number' ? inr(c) : esc(c)}</td>`).join('')}</tr>`;
  let h = `<h1>${esc(inf('bride') || 'Bride')} & ${esc(inf('groom') || 'Groom')}: wedding budget</h1>
    <p>${esc([fmtDate(inf('date')), inf('city'), 'printed ' + new Date().toLocaleDateString('en-IN')].filter(Boolean).join(' · '))}</p>
    <table><tbody>${row(['Estimated total', t.est])}${row([`With ${num(inf('buffer'))}% buffer`, t.est * (1 + num(inf('buffer')) / 100)])}${row(['Paid so far', t.paid])}${row(['Still to pay', t.bal])}
    ${Object.keys(SIDE).map(s => row([SIDE[s], sumBy(items.filter(it => it.side === s), itemCost)])).join('')}</tbody></table>
    <h2>Functions</h2><table><thead><tr><th>Function</th><th>Date</th><th>Guests</th><th>Estimate</th><th>Paid</th></tr></thead><tbody>
    ${sortedEvents().map(e => { const et = totals(evItems(e.id)); return `<tr><td>${esc(e.name)}</td><td>${esc(fmtDate(evDate(e)))}</td><td>${headcount(e)}</td><td style="text-align:right">${inr(et.est)}</td><td style="text-align:right">${inr(et.paid)}</td></tr>`; }).join('')}</tbody></table>`;
  C.CATEGORIES.forEach(c => {
    const its = items.filter(it => it.cat === c.k); if (!its.length) return;
    h += `<h2>${esc(c.name)} · ${inr(sumBy(its, itemCost))}</h2><table><thead><tr><th>Item</th><th>Function</th><th>Paid by</th><th>Qty × rate</th><th>Amount</th><th>Paid</th><th>Status</th><th>Vendor</th></tr></thead><tbody>
      ${its.map(it => `<tr><td>${esc(it.name)}</td><td>${esc(evById(it.eventId)?.name || 'General')}</td><td>${esc(SIDE[it.side])}</td><td>${it.unit === 'lump sum' ? '' : `${fmtQty(itemQty(it))} ${esc(plural(it.unit, itemQty(it)))} × ${inr(itemRate(it))}`}</td>
        <td style="text-align:right">${inr(itemCost(it))}</td><td style="text-align:right">${inr(num(it.paid))}</td><td>${esc(STATUS[it.status])}</td><td>${esc([it.vendor, it.phone].filter(Boolean).join(' '))}</td></tr>`).join('')}</tbody></table>`;
  });
  $('#printArea').innerHTML = h;
  document.body.classList.add('printing');
  window.print();
}
window.addEventListener('afterprint', () => document.body.classList.remove('printing'));

/* ---------- GitHub sync ---------- */
const FILE = 'wedding.json';
const ghReady = () => !!(cfg.token && cfg.owner && cfg.repo);
const repoApi = () => `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;
const ghPath = p => { const dir = (cfg.folder || '').replace(/^\/+|\/+$/g, ''); return dir ? `${dir}/${p}` : p; };
const ghUrl = p => `${repoApi()}/contents/${ghPath(p)}`;
const ghHeaders = () => ({ Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
async function ghError(r) {
  let m = ''; try { m = (await r.json()).message; } catch {}
  if (r.status === 401) return 'Token is invalid or expired';
  if (r.status === 403) return 'Token has no write access to this repo';
  if (r.status === 404) return 'Repository not found (check owner/repo/token access)';
  return `GitHub error ${r.status}${m ? ': ' + m : ''}`;
}
async function explainMissingRepo() {
  const full = `${cfg.owner}/${cfg.repo}`;
  const me = await fetch('https://api.github.com/user', { headers: ghHeaders(), cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (me.status === 401) return 'Token is invalid or expired. Create a new one.';
  const login = me.ok ? (await me.json()).login : '';
  return `The token${login ? ' of ' + login : ''} cannot see "${full}". Check the spelling, or on GitHub edit the token → Repository access → add ${cfg.repo}, with Contents: Read and write.`;
}
async function ghGet(path) {
  const r = await fetch(ghUrl(path) + '?ref=' + encodeURIComponent(cfg.branch || 'main'), { headers: ghHeaders(), cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (r.status === 404) { // the file isn't there yet, or the token can't see the repo
    const repo = await fetch(repoApi(), { headers: ghHeaders(), cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (repo.status === 404) throw new Error(await explainMissingRepo());
    if (!repo.ok) throw new Error(await ghError(repo));
    return { sha: null, data: null };
  }
  if (!r.ok) throw new Error(await ghError(r));
  const j = await r.json();
  if (!j.content && j.download_url) { // files over 1 MB come without inline content
    const raw = await fetch(j.git_url, { headers: { ...ghHeaders(), Accept: 'application/vnd.github.raw' }, cache: 'no-store' });
    return { sha: j.sha, data: JSON.parse(await raw.text()) };
  }
  return { sha: j.sha, data: JSON.parse(b64decode(j.content)) };
}
async function ghPut(path, data, sha, message) {
  const body = { message, content: b64encode(JSON.stringify(data, null, 1)), branch: cfg.branch || 'main' };
  if (sha) body.sha = sha;
  const r = await fetch(ghUrl(path), { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  if (r.status === 409 || r.status === 422) return false; // changed meanwhile → re-read, merge, retry
  if (r.status === 404) throw new Error(await explainMissingRepo());
  if (!r.ok) throw new Error(await ghError(r));
  return true;
}
function mergeById(local, remote) {
  const m = new Map();
  [...local, ...(remote || [])].forEach(x => { if (!x || !x.id) return; const e = m.get(x.id); if (!e || (x.updatedAt || 0) > (e.updatedAt || 0)) m.set(x.id, x); });
  return [...m.values()];
}
function mergeInfo(a, b) { // per field, newest wins
  const out = { ...a, _t: { ...(a._t || {}) } };
  Object.entries((b && b._t) || {}).forEach(([k, t]) => { if (t > (out._t[k] || 0)) { out[k] = b[k]; out._t[k] = t; } });
  return out;
}
function mergeAll(r) {
  db.info = mergeInfo(db.info, r.info || {});
  ['events', 'items', 'guests', 'tasks'].forEach(k => { db[k] = mergeById(db[k], r[k]); });
}
const payload = () => ({ app: 'wedding-planner', schema: 1, updated: new Date().toISOString(), by: cfg.user || '',
  info: db.info, events: db.events, items: db.items, guests: db.guests, tasks: db.tasks });

let syncing = false, syncAgain = false, syncTimer, lastError = '';
function scheduleSync(ms = 2000) { clearTimeout(syncTimer); syncTimer = setTimeout(sync, ms); updateSyncBadge(); }
async function sync() {
  if (!ghReady()) { updateSyncBadge(); return; }
  if (syncing) { syncAgain = true; return; }
  if (!navigator.onLine) { setBadge('offline', dirty ? 'Offline · pending' : 'Offline'); return; }
  syncing = true; lastError = ''; setBadge('syncing', 'Syncing…');
  try {
    for (let i = 0; ; i++) {
      if (i >= 4) throw new Error('Someone else was saving at the same moment. Will retry.');
      const snap = dirty;
      const { sha, data } = await ghGet(FILE);
      if (data) mergeAll(data);
      if (!snap && (data || !hasPlan())) break;
      if (await ghPut(FILE, payload(), sha, `${data ? 'Update' : 'Start'} wedding plan (${cfg.user || 'planner app'})`)) {
        if (dirty === snap) dirty = 0;
        break;
      }
    }
    save(); store.set(K_LAST, Date.now());
  } catch (e) {
    save(); lastError = e.message || String(e); setBadge('error', 'Sync failed');
  } finally {
    syncing = false;
    if (!lastError) updateSyncBadge();
    renderLastSync();
    if (ui.view === 'setup' && hasPlan() && !pendingJoin) showView('home');
    else if (!document.querySelector('dialog[open]')) render();
    if (syncAgain) { syncAgain = false; scheduleSync(300); }
  }
}
function setBadge(s, text) { $('#syncBtn').dataset.s = s; $('#syncText').textContent = text; }
function updateSyncBadge() {
  if (!ghReady()) return setBadge('local', 'On this device');
  if (syncing) return;
  if (!navigator.onLine) return setBadge('offline', dirty ? 'Offline · pending' : 'Offline');
  if (lastError) return setBadge('error', 'Sync failed');
  if (dirty) return setBadge('pending', 'Saving…');
  const t = store.get(K_LAST, 0);
  setBadge('ok', t ? 'Synced ' + new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Synced');
}
function renderLastSync() {
  const el = $('#cLast'); if (!el) return;
  const t = store.get(K_LAST, 0);
  el.innerHTML = !ghReady() ? 'Sync is off. The plan is only on this device.'
    : (lastError ? `<span style="color:var(--danger)">Last error: ${esc(lastError)}</span><br>` : '') +
      (t ? 'Last successful sync: ' + new Date(t).toLocaleString('en-IN') : 'Not synced yet.');
}
function shareLink() {
  const j = { o: cfg.owner, r: cfg.repo, b: cfg.branch || 'main', f: cfg.folder ?? 'data', t: cfg.token };
  return `${location.origin}${location.pathname}#join=${b64encode(JSON.stringify(j)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}
function handleJoinHash() {
  const m = location.hash.match(/^#join=([A-Za-z0-9_\-+/=%]+)$/); if (!m) return;
  try {
    let s = decodeURIComponent(m[1]).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const j = JSON.parse(b64decode(s));
    if (j && j.o && j.r && j.t) pendingJoin = j;
  } catch { toast('This setup link is damaged. Ask for a new one.', 'err'); }
  history.replaceState(null, '', location.pathname + location.search);
}

/* ---------- events ---------- */
function bind() {
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button[data-view]'); if (b) showView(b.dataset.view, { fromTab: true }); });
  $('#setBtn').addEventListener('click', () => showView('settings'));
  $('#syncBtn').addEventListener('click', () => {
    if (!ghReady()) { showView('settings'); toast('Add a GitHub token in Settings to share the plan'); return; }
    if (lastError) toast(lastError, 'err');
    sync();
  });

  // clicks anywhere in the app
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-go],[data-fn],[data-item],[data-add-item],[data-add-tpl],[data-add-gen],[data-cat-filter],[data-guest],[data-card],[data-act],[data-bgroup],[data-towner],[data-tedit],[data-close],#fnAdd,#evDel,#gAdd,#gBulk,#tAdd,#tStd');
    if (!el) return;
    const d = el.dataset;
    if (d.close !== undefined) { el.closest('dialog').close(); return; }
    if (d.go) { e.preventDefault(); showView(d.go); return; }
    if (d.fn) { showView('fn', { id: d.fn }); return; }
    if (d.item) { openItem(d.item); return; }
    if (d.addItem !== undefined) { openItem(null, { eventId: d.addItem }); return; }
    if (d.addTpl) {
      const ev = evById(ui.fnId), f = ev && FN[ev.key], t = f && f.items.find(x => x.name === d.addTpl);
      if (t) { const it = upsertTpl(t, ev.id, f.host === 'each' ? ev.host : (t.side || sideOfHost(ev.host)), `it-${ev.id.slice(3)}-`); stamp(it); changed(); toast(`Added ${t.name}`, 'ok'); }
      return;
    }
    if (d.addGen) {
      const pair = [...C.GENERAL.map(x => ['it-gen-', x]), ...C.DESTINATION.map(x => ['it-dest-', x])].find(([p, x]) => p + slug(x.name) === d.addGen);
      if (pair) { const it = upsertTpl(pair[1], '', pair[1].side || 'shared', pair[0]); stamp(it); changed(); toast(`Added ${pair[1].name}`, 'ok'); }
      return;
    }
    if (d.catFilter) { Object.assign(ui, { bCat: d.catFilter, bSide: '', bEv: '', bStatus: '', bQ: '', bGroup: 'cat' }); showView('budget'); return; }
    if (d.guest) { openGuest(d.guest); return; }
    if (d.card) { const g = db.guests.find(x => x.id === d.card); if (g) { g.card = !g.card; stamp(g); changed(); } return; }
    if (d.bgroup) { ui.bGroup = d.bgroup; saveUi(); renderBudget(); return; }
    if (d.towner !== undefined) { ui.tOwner = d.towner; saveUi(); renderTasks(); return; }
    if (d.tedit) { openTask(d.tedit); return; }
    if (d.act === 'excel') { exportExcel(); return; }
    if (d.act === 'print') { printReport(); return; }
    if (d.act === 'guestsCsv') { exportGuestsCsv(); return; }
    switch (el.id) {
      case 'fnAdd': openFnPicker(); break;
      case 'gAdd': openGuest(null); break;
      case 'gBulk': fillSelect($('#kGroup'), GROUPS.map(x => [x, x]), 'Family'); $('#kSide').value = ui.gSide || 'bride'; $('#kText').value = ''; $('#bulkDlg').showModal(); break;
      case 'tAdd': openTask(null); break;
      case 'tStd': addChecklist(); changed(); break;
      case 'evDel': {
        const ev = evById(ui.fnId); if (!ev) break;
        const n = evItems(ev.id).length;
        if (!confirm(`Delete "${ev.name}"${n ? ` and its ${n} expenses` : ''}?`)) break;
        ev.deleted = true; stamp(ev);
        evItems(ev.id).forEach(it => { it.deleted = true; stamp(it); });
        live(db.guests).forEach(g => { if ((g.events || []).includes(ev.id)) { g.events = g.events.filter(x => x !== ev.id); stamp(g); } });
        changed(); showView('functions'); toast('Function deleted');
        break;
      }
    }
  });

  // function detail form: save each field as it changes
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.ev) {
      const ev = evById(ui.fnId); if (!ev) return;
      const k = el.dataset.ev;
      if (k === 'name' && !el.value.trim()) { el.value = ev.name; return; }
      ev[k] = k === 'guests' ? num(el.value) : el.value.trim();
      stamp(ev); changed();
      return;
    }
    if (el.dataset.tdone) { const t = db.tasks.find(x => x.id === el.dataset.tdone); if (t) { t.done = el.checked; stamp(t); changed(); } return; }
    if (el.id === 'useList') { setInfo('useList', el.checked); changed(); return; }
    if (el.id === 'tHide') { ui.tHideDone = el.checked; saveUi(); renderTasks(); return; }
    if (el.dataset.info) {
      const k = el.dataset.info;
      if (el.dataset.num !== undefined) setInfo(k, el.value === '' ? null : num(el.value));
      else setInfo(k, el.value.trim());
      changed();
      if (el.dataset.num !== undefined && el.value === '') el.value = inf(k);
    }
  });

  // budget & guest filters
  [['bQ', 'bQ'], ['bSide', 'bSide'], ['bEv', 'bEv'], ['bCat', 'bCat'], ['bStatus', 'bStatus']].forEach(([id, k]) =>
    $('#' + id).addEventListener(id === 'bQ' ? 'input' : 'change', e => { ui[k] = e.target.value; saveUi(); renderBudget(); }));
  [['gQ', 'gQ'], ['gSide', 'gSide'], ['gGroup', 'gGroup'], ['gRsvp', 'gRsvp'], ['gEv', 'gEv']].forEach(([id, k]) =>
    $('#' + id).addEventListener(id === 'gQ' ? 'input' : 'change', e => { ui[k] = e.target.value; saveUi(); renderGuests(); }));

  // setup
  $('#suTier').addEventListener('click', e => {
    const b = e.target.closest('button[data-tier]'); if (!b) return;
    suTier = b.dataset.tier; $$('#suTier button').forEach(x => x.classList.toggle('active', x === b));
  });
  $('#setupForm').addEventListener('submit', e => { e.preventDefault(); createPlan(); });
  $('#joinGo').addEventListener('click', () => {
    if (!pendingJoin) return;
    Object.assign(cfg, { owner: pendingJoin.o, repo: pendingJoin.r, branch: pendingJoin.b || 'main', folder: pendingJoin.f ?? 'data', token: pendingJoin.t, user: $('#joinUser').value.trim() || cfg.user });
    store.set(K_CFG, cfg); pendingJoin = null; renderSetup();
    toast('Connected. Downloading the plan…', 'ok');
    sync();
  });

  // expense dialog
  ['iQty', 'iRate', 'iActual'].forEach(id => $('#' + id).addEventListener('input', updateItemEst));
  ['iPerGuest', 'iGold', 'iEv', 'iUnit'].forEach(id => $('#' + id).addEventListener('change', () => {
    if (id === 'iEv' && !$('#iId').value) { const ev = evById($('#iEv').value); $('#iSide').value = ev ? sideOfHost(ev.host) : 'shared'; }
    if (id === 'iPerGuest' && !$('#iPerGuest').checked) $('#iQty').value = 1;
    updateItemEst();
  }));
  $('#iName').addEventListener('change', applyItemTemplate);
  $('#itemForm').addEventListener('submit', e => { e.preventDefault(); saveItem(); });
  $('#iDel').addEventListener('click', () => {
    const it = db.items.find(x => x.id === $('#iId').value); if (!it) return;
    if (!confirm(`Delete "${it.name}"?`)) return;
    it.deleted = true; stamp(it); $('#itemDlg').close(); changed(); toast('Expense deleted');
  });

  // guest dialogs
  ['gSideI', 'gGroupI'].forEach(id => $('#' + id).addEventListener('change', () => { if (!$('#gId').value) guestEventChecks(defaultEventsFor($('#gSideI').value, $('#gGroupI').value)); }));
  $('#guestForm').addEventListener('submit', e => { e.preventDefault(); saveGuest(); });
  $('#gDel').addEventListener('click', () => {
    const g = db.guests.find(x => x.id === $('#gId').value); if (!g) return;
    if (!confirm(`Remove ${g.name} from the guest list?`)) return;
    g.deleted = true; stamp(g); $('#guestDlg').close(); changed(); toast('Guest removed');
  });
  $('#bulkForm').addEventListener('submit', e => {
    e.preventDefault();
    const rows = $('#kText').value.split(/\r?\n/).map(l => l.split(/[,\t]/).map(x => x.trim())).filter(r => r[0])
      .map(r => ({ name: r[0], phone: r[1], count: r[2], city: r[3] }));
    const n = addGuests(rows, $('#kSide').value, $('#kGroup').value);
    $('#bulkDlg').close();
    if (n) { changed(); toast(`${n} guests added`, 'ok'); }
  });
  $('#kCsv').addEventListener('click', () => $('#kFile').click());
  $('#kFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const n = addGuests(rowsFromCsv(await f.text()), $('#kSide').value, $('#kGroup').value);
    $('#bulkDlg').close();
    if (n) { changed(); toast(`${n} guests imported`, 'ok'); } else toast('No names found in that file', 'err');
  });
  $('#kSample').addEventListener('click', () => {
    const csv = 'Name,Side,Group,Relation,Phone,City,People\r\nRamesh Sharma & family,Bride,Relatives,Mama ji,9876543210,Patna,4\r\nSunita Devi,Groom,Family,Bua ji,,Gaya,2\r\nOffice friends,Groom,Office,,,Patna,10\r\n';
    download(new Blob(['﻿' + csv], { type: 'text/csv' }), 'guest-list-sample.csv');
  });

  // functions dialog
  $('#fnForm').addEventListener('submit', e => {
    e.preventDefault();
    let n = 0;
    $$('#fnList input:checked:not(:disabled)').forEach(cb => { if (FN[cb.value]) { addFunction(FN[cb.value]); n++; } });
    const name = $('#fnCustom').value.trim();
    if (name) { addCustomFunction(name, $('#fnCustomHost').value); n++; }
    $('#fnDlg').close();
    if (n) { changed(); toast('Added', 'ok'); }
  });

  // task dialog
  $('#taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#tText').value.trim(); if (!title) return;
    let t = db.tasks.find(x => x.id === $('#tId').value);
    if (!t) { t = { id: 'tk-' + uid(), done: false }; db.tasks.push(t); }
    Object.assign(t, { title, when: $('#tWhen').value, owner: $('#tOwner').value, notes: $('#tNotes').value.trim(), deleted: false });
    stamp(t); $('#taskDlg').close(); changed();
  });
  $('#tDel').addEventListener('click', () => {
    const t = db.tasks.find(x => x.id === $('#tId').value); if (!t) return;
    t.deleted = true; stamp(t); $('#taskDlg').close(); changed();
  });

  // settings
  $('#sApplyTier').addEventListener('click', () => { const n = applyTier(); if (n) changed(); toast(n ? `${n} items re-priced at ${TIER_NAME[inf('tier')].toLowerCase()} rates` : 'Nothing to re-price', n ? 'ok' : ''); });
  $('#cfgForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = id => $('#' + id).value.trim();
    Object.assign(cfg, { user: v('cUser'), owner: v('cOwner').replace(/\s+/g, ''), repo: v('cRepo').replace(/\s+/g, ''), branch: v('cBranch').replace(/\s+/g, '') || 'main', folder: v('cFolder').replace(/\s+/g, ''), token: v('cToken').replace(/\s+/g, '') });
    cfg.repo = cfg.repo.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$|\/$/i, '');
    if (cfg.repo.includes('/')) [cfg.owner, cfg.repo] = cfg.repo.split('/').slice(-2);
    store.set(K_CFG, cfg);
    if (ghReady() && hasPlan()) { dirty++; save(); } // make sure this device's plan is uploaded too
    lastError = ''; fillSettings(); toast('Sync settings saved', 'ok'); sync();
  });
  $('#cSyncNow').addEventListener('click', () => { if (!ghReady()) toast('Enter the owner, repository and token first', 'err'); else sync(); });
  $('#cShare').addEventListener('click', async () => {
    if (!ghReady()) { toast('Save the GitHub token first', 'err'); return; }
    if (location.protocol === 'file:') { toast('Open the app from its GitHub Pages address to share a link', 'err'); return; }
    const link = shareLink();
    try { await navigator.clipboard.writeText(link); toast('Link copied. Send it to family on WhatsApp.', 'ok'); }
    catch {
      let ta = $('#cShareOut');
      if (!ta) { ta = document.createElement('textarea'); ta.id = 'cShareOut'; ta.readOnly = true; ta.style.marginTop = '10px'; $('#cShare').parentElement.after(ta); }
      ta.value = link; ta.select(); toast('Copy the link below');
    }
  });
  $('#xExcel').addEventListener('click', exportExcel);
  $('#xPrint').addEventListener('click', printReport);
  $('#xBackup').addEventListener('click', () => download(new Blob([JSON.stringify({ exported: new Date().toISOString(), ...payload() }, null, 1)], { type: 'application/json' }), `wedding-backup-${dateKey()}.json`));
  $('#xRestore').addEventListener('click', () => $('#xFile').click());
  $('#xFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.items)) throw new Error('not a wedding planner backup');
      mergeAll(data); changed(); toast('Backup restored', 'ok'); if (ui.view === 'setup') showView('home');
    } catch (err) { toast('Could not read that file: ' + err.message, 'err'); }
  });
  $('#xReset').addEventListener('click', () => {
    if (!confirm('Erase the wedding plan from this device?')) return;
    if (!ghReady() && !confirm('Sync is OFF, so this cannot be undone. Download a backup first if you need it. Erase anyway?')) return;
    db = freshDb(); dirty = 0; save(); store.del(K_LAST);
    showView('setup'); sync();
  });

  // dialogs: close on backdrop click
  $$('dialog').forEach(dl => dl.addEventListener('click', e => { if (e.target === dl) dl.close(); }));

  window.addEventListener('online', () => sync());
  window.addEventListener('offline', updateSyncBadge);
  setInterval(() => { if (!document.hidden) sync(); }, 60000); // pick up changes from other phones
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
}

/* ---------- start ---------- */
function start() {
  $('#appVer').textContent = 'App version ' + APP_VERSION;
  const setHdr = () => document.documentElement.style.setProperty('--hdr', $('.top').offsetHeight + 'px');
  setHdr(); window.addEventListener('resize', setHdr);
  bind();
  handleJoinHash();
  showView(pendingJoin ? 'setup' : (hasPlan() ? (ui.view === 'setup' ? 'home' : ui.view) : 'setup'));
  updateSyncBadge();
  sync();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
start();
