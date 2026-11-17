import { EXERCISES } from './data/exercises.js';
import { mountFigure } from './figure.js';
import { parseKey, todayKey, addDays } from './store.js';

// ---------- basics ----------
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---------- icons (24px stroke icons) ----------
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  move: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  leaf: '<path d="M5 20c0-9 6-15 15-15 0 9-6 15-15 15z"/><path d="M5 20 14 11"/>',
  mind: '<path d="M12 21c-4.5-2.5-8-6-8-10a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 4-3.5 7.5-8 10z"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/>',
  gear: '<path d="M4 7h8M17 7h3M4 17h3M12 17h8"/><circle cx="14.5" cy="7" r="2.5"/><circle cx="9.5" cy="17" r="2.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  next: '<path d="M6 5l9 7-9 7zM18 5v14"/>',
  prev: '<path d="M18 5l-9 7 9 7zM6 5v14"/>',
  drop: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-3-2 2-3 4-3 7a6 6 0 0 0 6 6z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  bed: '<path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h6"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0l-2.2 2.2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
};
export const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

// ---------- formatting ----------
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dow = (k) => DOW[parseKey(k).getDay()];
export function niceDate(k) {
  if (k === todayKey()) return 'Today';
  if (k === addDays(todayKey(), -1)) return 'Yesterday';
  const d = parseKey(k);
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
}
export const shortDate = (k) => { const d = parseKey(k); return `${d.getDate()} ${MON[d.getMonth()]}`; };
export const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const fmtSecs = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export function fmtHours(h) { if (h == null) return '–'; const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return mm ? `${hh}h ${mm}m` : `${hh}h`; }

export const MOODS = [
  { v: 1, e: '😣', l: 'Awful' }, { v: 2, e: '😕', l: 'Low' }, { v: 3, e: '😐', l: 'Okay' }, { v: 4, e: '🙂', l: 'Good' }, { v: 5, e: '😄', l: 'Great' },
];
export const moodEmoji = (v) => MOODS[Math.max(0, Math.min(4, Math.round(v) - 1))]?.e || '·';

// ---------- exercise helpers ----------
export const EQ_LABEL = { none: 'No equipment', bar: 'Pull-up bar', dumbbell: 'Dumbbells', band: 'Band', kettlebell: 'Kettlebell', gym: 'Gym', other: 'Other gear' };
export const KIND_LABEL = { strength: 'Strength', stretch: 'Stretch', cardio: 'Cardio' };
export const PARTS = {
  chest: { name: 'Chest', muscles: 'Pecs' },
  back: { name: 'Back', muscles: 'Lats, upper & lower back' },
  shoulders: { name: 'Shoulders', muscles: 'Delts, rotator cuff' },
  arms: { name: 'Arms', muscles: 'Biceps, triceps, forearms' },
  core: { name: 'Core', muscles: 'Abs, obliques' },
  glutes: { name: 'Glutes & Hips', muscles: 'Glutes, hip muscles' },
  legs: { name: 'Legs', muscles: 'Quads, hamstrings' },
  calves: { name: 'Calves & Ankles', muscles: 'Calves, ankle mobility' },
  neck: { name: 'Neck', muscles: 'Neck, upper traps' },
  cardio: { name: 'Cardio', muscles: 'Heart & lungs, full body' },
};
export const imgSrc = (id, n) => `assets/ex/${encodeURIComponent(id)}/${n}.jpg`;

/** Markup for an exercise's animated demo. Figures are mounted by hydrateMedia(). */
export function mediaHTML(ex, { size = 'lg', still = false } = {}) {
  if (!ex) return `<div class="media media-${size}"></div>`;
  if (ex.img) {
    const a = `<img src="${imgSrc(ex.id, 0)}" alt="" loading="lazy" decoding="async">`;
    return still
      ? `<div class="media media-${size} photo">${a}</div>`
      : `<div class="media media-${size} photo anim" role="img" aria-label="${esc(ex.name)} demonstration">${a}<img class="f1" src="${imgSrc(ex.id, 1)}" alt="" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="media media-${size} figure" data-fig="${ex.fig}" data-still="${still ? 1 : 0}"></div>`;
}
export function hydrateMedia(root = document) {
  for (const el of $$('[data-fig]:not([data-mounted])', root)) {
    el.dataset.mounted = '1';
    mountFigure(el, el.dataset.fig, { animate: el.dataset.still !== '1' });
  }
}

/** YouTube search links (no hard-coded video IDs, so links never go stale). */
export const squatUniUrl = (q) => `https://www.youtube.com/@SquatUniversity/search?query=${encodeURIComponent(q)}`;
export const youtubeUrl = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' proper form')}`;

// ---------- sheets ----------
let sheetStack = [];
export function openSheet(html, { onClose, cls = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop" data-act="close-sheet"></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="sheet-grip"></div><button class="icon-btn sheet-close" data-act="close-sheet" aria-label="Close">${icon('x')}</button><div class="sheet-body">${html}</div></div>`;
  document.body.append(wrap);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => wrap.classList.add('open'));
  sheetStack.push({ wrap, onClose });
  hydrateMedia(wrap);
  const first = wrap.querySelector('[autofocus]');
  if (first) setTimeout(() => first.focus(), 250);
  return wrap.querySelector('.sheet-body');
}
export function closeSheet() {
  const top = sheetStack.pop();
  if (!top) return;
  top.wrap.classList.remove('open');
  setTimeout(() => top.wrap.remove(), 250);
  if (!sheetStack.length) document.body.classList.remove('no-scroll');
  top.onClose?.();
}
export function closeAllSheets() { while (sheetStack.length) closeSheet(); }
export const sheetOpen = () => sheetStack.length > 0;
/** Replace the content of the top-most sheet. */
export function updateSheet(html) {
  const top = sheetStack[sheetStack.length - 1];
  if (!top) return;
  const body = top.wrap.querySelector('.sheet-body');
  body.innerHTML = html;
  hydrateMedia(body);
}

// ---------- toast ----------
let toastTimer = 0;
export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------- charts (inline SVG) ----------
/** Bar chart. data: [{ label, value, sub? }]. */
export function barChart(data, { max, goal, color = 'var(--accent)', h = 120, fmt = (v) => v, unit = '' } = {}) {
  const W = 320, H = h, pad = 18, n = data.length;
  const m = max ?? Math.max(goal || 0, ...data.map((d) => d.value || 0), 1);
  const bw = (W - 8) / n, gap = Math.min(8, bw * 0.3);
  const y = (v) => H - pad - ((v || 0) / m) * (H - pad - 8);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
  if (goal) s += `<line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" class="chart-goal"/>`;
  data.forEach((d, i) => {
    const x = 4 + i * bw + gap / 2, bh = H - pad - y(d.value);
    if (d.value) s += `<rect x="${x}" y="${y(d.value)}" width="${bw - gap}" height="${Math.max(bh, 2)}" rx="${Math.min(4, (bw - gap) / 2)}" fill="${d.color || color}" opacity="${d.dim ? 0.45 : 1}"><title>${esc(d.label)}: ${esc(fmt(d.value))}${unit}</title></rect>`;
    else s += `<rect x="${x}" y="${H - pad - 2}" width="${bw - gap}" height="2" rx="1" class="chart-empty"/>`;
    if (n <= 14 || i % 2 === 0) s += `<text x="${x + (bw - gap) / 2}" y="${H - 4}" class="chart-label" text-anchor="middle">${esc(d.label)}</text>`;
  });
  return s + '</svg>';
}
/** Line chart. points: [{ label, value }] (value may be null). */
export function lineChart(points, { color = 'var(--accent)', h = 140, min, max, fmt = (v) => v, labelEvery } = {}) {
  const W = 320, H = h, padX = 10, padTop = 16, padBot = 20;
  const vals = points.map((p) => p.value).filter((v) => v != null);
  if (!vals.length) return `<div class="chart-empty-msg">No data yet</div>`;
  let lo = min ?? Math.min(...vals), hi = max ?? Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const n = points.length;
  const x = (i) => padX + (n === 1 ? (W - 2 * padX) / 2 : (i / (n - 1)) * (W - 2 * padX));
  const y = (v) => padTop + (1 - (v - lo) / (hi - lo)) * (H - padTop - padBot);
  const pts = points.map((p, i) => (p.value == null ? null : [x(i), y(p.value), p]));
  const real = pts.filter(Boolean);
  let path = '';
  real.forEach((p, i) => { path += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); });
  const every = labelEvery || Math.ceil(n / 7);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
  s += `<text x="${W - 2}" y="10" class="chart-label" text-anchor="end">${esc(fmt(hi))}</text><text x="${W - 2}" y="${H - padBot - 2}" class="chart-label" text-anchor="end">${esc(fmt(lo))}</text>`;
  if (real.length > 1) {
    s += `<path d="${path} L${real[real.length - 1][0]} ${H - padBot} L${real[0][0]} ${H - padBot}Z" fill="${color}" opacity="0.10"/>`;
    s += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  real.forEach((p) => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--surface)" stroke="${color}" stroke-width="2.5"><title>${esc(p[2].label)}: ${esc(fmt(p[2].value))}</title></circle>`; });
  points.forEach((p, i) => { if (i % every === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - 4}" class="chart-label" text-anchor="middle">${esc(p.label)}</text>`; });
  return s + '</svg>';
}
/** Progress ring. */
export function ring(frac, { size = 64, stroke = 7, color = 'var(--accent)', inner = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
  const arc = f > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : '';
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}"/>${arc}</svg><div class="ring-inner">${inner}</div></div>`;
}

// ---------- sound, voice, vibration ----------
let actx;
export function beep(freq = 880, dur = 0.12, vol = 0.15) {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch {}
}
export function say(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1;
    speechSynthesis.speak(u);
  } catch {}
}
export const buzz = (p = 30) => { try { navigator.vibrate?.(p); } catch {} };

/** Exercises done as timed holds even though they're "strength". */
const HOLDS = new Set(['Plank', 'Side_Bridge', 'wall-sit', 'Isometric_Neck_Exercise_-_Front_And_Back', 'Isometric_Neck_Exercise_-_Sides']);
export const isTimed = (ex) => ex.kind !== 'strength' || HOLDS.has(ex.id);
/** Default routine item for an exercise. */
export const defaultItem = (exId) => (isTimed(EX[exId]) ? { ex: exId, secs: 30 } : { ex: exId, reps: 10 });
