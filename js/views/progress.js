import { state, save, getDay, todayKey, lastNDays, activeMinutes, avgMood, activeHabits, habitStreak, latestMetric, plateScore } from '../store.js';
import { esc, icon, barChart, lineChart, dow, shortDate, fmtHours, moodEmoji, niceDate } from '../ui.js';
import { METRIC_FIELDS } from '../sheets.js';
import { rerender } from '../router.js';

const TABS = [['overview', 'Overview'], ['body', 'Body'], ['habits', 'Habits']];
let range = 7;

export function view(sub = 'overview') {
  return `
  <header class="top"><h1>Progress</h1></header>
  <nav class="seg">${TABS.map(([id, l]) => `<a href="#/progress/${id}" class="${sub === id ? 'on' : ''}">${l}</a>`).join('')}</nav>
  ${sub === 'body' ? bodyView() : sub === 'habits' ? habitsView() : overview()}`;
}

const avg = (arr) => { const v = arr.filter((x) => x != null && !Number.isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const lbl = (k, n) => (n <= 7 ? dow(k)[0] : shortDate(k).split(' ')[0]);

function overview() {
  const days = lastNDays(range), p = state.profile;
  const prev = lastNDays(range, days[0]).slice(0, -1);
  const mins = days.reduce((s, k) => s + activeMinutes(k), 0), prevMins = prev.reduce((s, k) => s + activeMinutes(k), 0);
  const sessions = days.reduce((s, k) => s + (getDay(k).workouts || []).length, 0);
  const sleep = avg(days.map((k) => getDay(k).sleep?.hours));
  const mood = avg(days.map(avgMood));
  const water = avg(days.map((k) => getDay(k).water ?? null));
  const habits = activeHabits();
  const habitPct = habits.length ? Math.round(100 * days.reduce((s, k) => s + habits.filter((h) => getDay(k).habits?.[h.id]).length, 0) / (habits.length * days.length)) : 0;
  const trend = (a, b) => (b ? (a >= b ? `<span class="up">▲ ${Math.round(((a - b) / b) * 100)}%</span>` : `<span class="down">▼ ${Math.round(((b - a) / b) * 100)}%</span>`) : '');

  return `
  <div class="seg small range">${[7, 30].map((n) => `<button class="${range === n ? 'on' : ''}" data-act="range" data-n="${n}">${n} days</button>`).join('')}</div>
  <div class="stat-grid">
    <div class="stat c-move"><span>${icon('flame')} Active</span><b>${mins}<small> min</small></b><em>${sessions} sessions ${trend(mins, prevMins)}</em></div>
    <div class="stat c-sleep"><span>${icon('moon')} Avg sleep</span><b>${fmtHours(sleep != null ? Math.round(sleep * 10) / 10 : null)}</b><em>goal ${p.sleepGoal}h</em></div>
    <div class="stat c-mind"><span>${icon('heart')} Avg mood</span><b>${mood != null ? moodEmoji(mood) + ' ' + mood.toFixed(1) : '–'}</b><em>out of 5</em></div>
    <div class="stat c-water"><span>${icon('drop')} Avg water</span><b>${water != null ? water.toFixed(1) : '–'}<small> glasses</small></b><em>goal ${p.waterGoal}</em></div>
  </div>
  <div class="card"><div class="card-head"><h2>Active minutes</h2></div>${barChart(days.map((k) => ({ label: lbl(k, range), value: activeMinutes(k) })), { color: 'var(--move)', goal: 30, unit: ' min' })}</div>
  <div class="card"><div class="card-head"><h2>Sleep</h2></div>${barChart(days.map((k) => ({ label: lbl(k, range), value: getDay(k).sleep?.hours || 0 })), { color: 'var(--sleep)', goal: p.sleepGoal, max: Math.max(10, p.sleepGoal + 1), fmt: fmtHours })}</div>
  <div class="card"><div class="card-head"><h2>Mood</h2></div>${lineChart(days.map((k) => ({ label: lbl(k, range), value: avgMood(k) })), { color: 'var(--mind)', min: 1, max: 5, fmt: (v) => moodEmoji(v) })}</div>
  <div class="card"><div class="card-head"><h2>Water</h2></div>${barChart(days.map((k) => ({ label: lbl(k, range), value: getDay(k).water || 0 })), { color: 'var(--water)', goal: p.waterGoal })}</div>
  <div class="card"><div class="card-head"><h2>Plate score</h2></div>${barChart(days.map((k) => ({ label: lbl(k, range), value: plateScore(k) || 0 })), { color: 'var(--eat)', max: 10 })}</div>
  <div class="card"><div class="card-head"><h2>Habits</h2><span class="pill">${habitPct}% done</span></div>${barChart(days.map((k) => ({ label: lbl(k, range), value: habits.filter((h) => getDay(k).habits?.[h.id]).length })), { color: 'var(--accent)', max: habits.length || 1 })}</div>`;
}

function bodyView() {
  const p = state.profile, m = state.metrics;
  const w = latestMetric('weight');
  const first = m.find((x) => x.weight != null);
  const bmi = w && p.heightCm ? w.weight / Math.pow(p.heightCm / 100, 2) : null;
  const bmiLabel = bmi == null ? '' : bmi < 18.5 ? 'Underweight' : bmi < 23 ? 'Healthy range' : bmi < 25 ? 'Slightly above (Asian cut-off 23)' : bmi < 30 ? 'Overweight' : 'Obese range';
  const series = (field) => m.filter((x) => x[field] != null).slice(-30).map((x) => ({ label: shortDate(x.date), value: x[field] }));
  const charts = METRIC_FIELDS.filter(([k]) => k !== 'weight' && m.some((x) => x[k] != null));
  return `
  <div class="card body-hero">
    <div><span class="muted small">Weight</span><b class="big">${w ? w.weight + '<small> kg</small>' : '–'}</b>
      ${w && first && first !== w ? `<span class="${w.weight <= first.weight ? 'up' : 'down'} small">${w.weight - first.weight > 0 ? '+' : ''}${(w.weight - first.weight).toFixed(1)} kg since ${esc(shortDate(first.date))}</span>` : ''}</div>
    <div><span class="muted small">BMI</span><b class="big">${bmi ? bmi.toFixed(1) : '–'}</b><span class="small muted">${bmi ? esc(bmiLabel) : p.heightCm ? 'Log your weight' : '<a class="link" href="#/settings">Add your height</a>'}</span></div>
  </div>
  <button class="btn btn-primary btn-block" data-act="metrics-open">${icon('plus')} Log measurements</button>
  <div class="card"><div class="card-head"><h2>Weight trend</h2>${p.weightGoal ? `<span class="pill">Goal ${p.weightGoal} kg</span>` : ''}</div>${lineChart(series('weight'), { color: 'var(--progress)', fmt: (v) => v + ' kg' })}</div>
  ${charts.map(([k, l, u]) => `<div class="card"><div class="card-head"><h2>${l}</h2></div>${lineChart(series(k), { color: 'var(--accent)', fmt: (v) => v + ' ' + u })}</div>`).join('')}
  ${m.length ? `<div class="section-head"><h2>History</h2></div><div class="card list">${[...m].reverse().slice(0, 30).map((x) => `
    <button class="log-row" data-act="metrics-open" data-date="${x.date}">
      <div class="grow"><b>${esc(niceDate(x.date))}</b><span class="muted small">${METRIC_FIELDS.filter(([k]) => x[k] != null).map(([k, l, u]) => `${l} ${x[k]}${u === '%' ? '%' : ' ' + u}`).join(' · ')}</span></div>${icon('edit', 'chev')}
    </button>`).join('')}</div>` : ''}
  <p class="fine">BMI is a rough guide. For South Asian adults, health risk starts rising at a lower BMI (≈23), so waist size is a useful second measure — aim for under half your height.</p>`;
}

function habitsView() {
  const days = lastNDays(28);
  const habits = activeHabits();
  if (!habits.length) return `<div class="empty"><p>No habits yet.</p><a class="btn btn-primary" href="#/settings/habits">Add habits</a></div>`;
  return `
  ${habits.map((h) => {
    const done = days.filter((k) => getDay(k).habits?.[h.id]).length;
    const best = bestStreak(h.id);
    return `<div class="card habit-card">
      <div class="card-head"><h2>${h.icon} ${esc(h.name)}</h2><span class="streak big">${icon('flame')}${habitStreak(h.id)}</span></div>
      <div class="heat">${days.map((k) => `<i class="${getDay(k).habits?.[h.id] ? 'on' : ''} ${k === todayKey() ? 'today' : ''}" title="${esc(niceDate(k))}"></i>`).join('')}</div>
      <p class="muted small">${done}/28 days · best streak ${best} day${best === 1 ? '' : 's'}</p>
    </div>`; }).join('')}
  <a class="btn btn-soft btn-block" href="#/settings/habits">${icon('edit')} Edit habits</a>`;
}
function bestStreak(id) {
  const keys = Object.keys(state.days).filter((k) => state.days[k].habits?.[id]).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    const d = new Date(k), p = prev && new Date(prev);
    run = p && (d - p) / 864e5 < 1.5 ? run + 1 : 1;
    best = Math.max(best, run); prev = k;
  }
  return best;
}

export const actions = {
  range: (el) => { range = Number(el.dataset.n); rerender(); },
};
