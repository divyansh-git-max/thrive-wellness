// All data lives on this device in localStorage. Export/import gives you backups.
const KEY = 'thrive.v1';

export const DEFAULT_HABITS = [
  { id: 'h-walk', name: '10-minute walk', icon: '🚶', kind: 'body' },
  { id: 'h-stretch', name: 'Stretch or mobility', icon: '🤸', kind: 'body', link: 'mobility' },
  { id: 'h-sun', name: 'Morning sunlight', icon: '🌤️', kind: 'body' },
  { id: 'h-nojunk', name: 'No junk food', icon: '🥗', kind: 'body' },
  { id: 'h-breathe', name: 'Breathe or meditate', icon: '🌬️', kind: 'mind', link: 'breathe' },
  { id: 'h-gratitude', name: 'Gratitude', icon: '🙏', kind: 'mind', link: 'gratitude' },
  { id: 'h-read', name: 'Read 10 pages', icon: '📖', kind: 'mind' },
  { id: 'h-screens', name: 'No screens 1h before bed', icon: '📵', kind: 'mind' },
];

function defaults() {
  return {
    version: 1,
    profile: { name: '', heightCm: null, waterGoal: 8, glassMl: 250, sleepGoal: 8, weightGoal: null, onboarded: false },
    settings: { theme: 'auto', voice: true, sound: true },
    habits: structuredClone(DEFAULT_HABITS),
    days: {},       // 'YYYY-MM-DD' -> day record
    metrics: [],    // [{ date, weight, waist, hips, chest, arm, bodyFat, rhr }]
    routines: [],   // custom routines
    plan: null,     // { id, start } of the plan being followed
    recentMeals: [], // recently typed meal descriptions for quick re-log
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = defaults(), s = JSON.parse(raw);
    return { ...d, ...s, profile: { ...d.profile, ...s.profile }, settings: { ...d.settings, ...s.settings } };
  } catch (e) {
    console.error('Could not load saved data', e);
    return defaults();
  }
}

export let state = load();

let saveTimer = 0;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 50);
}
export function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.error('Save failed', e); alertStorage(); }
}
let warned = false;
function alertStorage() { if (!warned) { warned = true; window.dispatchEvent(new CustomEvent('storage-error')); } }
window.addEventListener('pagehide', flush);

// ---------- dates ----------
const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => keyOf(new Date());
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
export const lastNDays = (n, end = todayKey()) => Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));

// ---------- day records ----------
const EMPTY = Object.freeze({});
/** Read a day (never creates one). */
export const getDay = (k = todayKey()) => state.days[k] || EMPTY;
/** Mutate a day (creates it if needed) and save. */
export function editDay(k, fn) {
  const d = (state.days[k] ||= {});
  fn(d);
  save();
  return d;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- habits ----------
export const activeHabits = () => state.habits.filter((h) => !h.archived);
export function setHabit(k, id, on) { editDay(k, (d) => { d.habits ||= {}; if (on) d.habits[id] = true; else delete d.habits[id]; }); }
/** Auto-tick habits linked to an activity (e.g. 'breathe', 'gratitude', 'mobility'). */
export function autoHabit(link) {
  const k = todayKey();
  for (const h of activeHabits()) if (h.link === link) setHabit(k, h.id, true);
}
export function habitStreak(id, upto = todayKey()) {
  let n = 0, k = upto;
  if (!getDay(k).habits?.[id]) k = addDays(k, -1); // today not done yet doesn't break the streak
  while (getDay(k).habits?.[id]) { n++; k = addDays(k, -1); }
  return n;
}

// ---------- workouts ----------
export function addWorkout(entry, k = todayKey()) {
  editDay(k, (d) => { (d.workouts ||= []).push({ id: uid(), at: Date.now(), ...entry }); });
}
export function activeMinutes(k) {
  return (getDay(k).workouts || []).reduce((s, w) => s + (Number(w.minutes) || 0), 0);
}
export function workoutStreak() {
  let n = 0, k = todayKey();
  if (!(getDay(k).workouts || []).length) k = addDays(k, -1);
  while ((getDay(k).workouts || []).length) { n++; k = addDays(k, -1); }
  return n;
}
/** Logged sets for one exercise, newest first: [{ date, sets }] */
export function exerciseHistory(exId, limit = 5) {
  const out = [];
  for (const k of Object.keys(state.days).sort().reverse()) {
    for (const w of state.days[k].workouts || []) {
      if (w.kind !== 'sets') continue;
      const it = (w.items || []).find((i) => i.ex === exId);
      if (it?.sets?.length) out.push({ date: k, sets: it.sets });
    }
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- sleep / mood ----------
export function sleepHours(bed, wake) {
  if (!bed || !wake) return null;
  const [bh, bm] = bed.split(':').map(Number), [wh, wm] = wake.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
}
export const latestMood = (k = todayKey()) => { const m = getDay(k).moods || []; return m[m.length - 1] || null; };
export function avgMood(k) { const m = getDay(k).moods || []; return m.length ? m.reduce((s, x) => s + x.score, 0) / m.length : null; }

// ---------- nutrition ----------
export const MEALS = [
  { id: 'breakfast', name: 'Breakfast', icon: '🍳' },
  { id: 'lunch', name: 'Lunch', icon: '🍛' },
  { id: 'snack', name: 'Snacks', icon: '🍎' },
  { id: 'dinner', name: 'Dinner', icon: '🍲' },
];
export const MEAL_TAGS = [
  { id: 'protein', label: 'Protein', icon: '💪', good: true },
  { id: 'veg', label: 'Veggies', icon: '🥦', good: true },
  { id: 'fruit', label: 'Fruit', icon: '🍊', good: true },
  { id: 'whole', label: 'Whole grains', icon: '🌾', good: true },
  { id: 'fried', label: 'Fried / junk', icon: '🍟', good: false },
  { id: 'sweet', label: 'Sweets', icon: '🍰', good: false },
  { id: 'sugary', label: 'Sugary drink', icon: '🥤', good: false },
];
/** A friendly 0–10 "plate score" for a day, or null when nothing logged. */
export function plateScore(k) {
  const meals = Object.values(getDay(k).meals || {}).filter((m) => m && !m.skipped);
  if (!meals.length) return null;
  let s = 0;
  for (const m of meals) {
    const t = new Set(m.tags || []);
    let p = 5;
    if (t.has('protein')) p += 2;
    if (t.has('veg') || t.has('fruit')) p += 2;
    if (t.has('whole')) p += 1;
    if (m.src === 'home') p += 1;
    if (t.has('fried')) p -= 2;
    if (t.has('sweet')) p -= 1;
    if (t.has('sugary')) p -= 1;
    if (m.portion === 'heavy') p -= 1;
    s += Math.max(0, Math.min(10, p));
  }
  return Math.round((s / meals.length) * 10) / 10;
}

// ---------- body ----------
export const latestMetric = (field) => {
  for (let i = state.metrics.length - 1; i >= 0; i--) if (state.metrics[i][field] != null) return state.metrics[i];
  return null;
};
export function sortMetrics() { state.metrics.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)); }

// ---------- backup ----------
export function exportData() { return JSON.stringify({ app: 'thrive', exportedAt: new Date().toISOString(), data: state }, null, 1); }
export function importData(text) {
  const parsed = JSON.parse(text);
  const data = parsed?.data ?? parsed;
  if (!data || typeof data !== 'object' || !data.days || !data.profile) throw new Error('This doesn\'t look like a Thrive backup file.');
  const d = defaults();
  state = { ...d, ...data, profile: { ...d.profile, ...data.profile }, settings: { ...d.settings, ...data.settings } };
  flush();
}
export function resetAll() { state = defaults(); flush(); }
