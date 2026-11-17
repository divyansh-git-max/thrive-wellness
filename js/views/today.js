import { state, getDay, editDay, todayKey, activeHabits, setHabit, habitStreak, activeMinutes, latestMood, MEALS, MEAL_TAGS, plateScore } from '../store.js';
import { esc, icon, ring, MOODS, moodEmoji, fmtHours, plural } from '../ui.js';
import { DAILY_TIPS } from '../data/mind.js';
import { ROUTINES } from '../data/routines.js';
import { routineMins, planDayMins } from '../sheets.js';
import { todaysPlanDay } from './move.js';
import { daysPerWeek } from '../data/plans.js';
import { rerender } from '../router.js';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
const dayIndex = () => Math.floor(new Date(todayKey()).getTime() / 864e5);

/** Suggest a routine depending on the time of day and the day of week. */
function suggestion() {
  const h = new Date().getHours(), dowN = new Date().getDay();
  const doneToday = (getDay().workouts || []).map((w) => w.routineId);
  const pick = (id) => ROUTINES.find((r) => r.id === id);
  let order;
  if (h < 11) order = ['morning-mobility', 'desk-reset'];
  else if (h >= 20) order = ['evening-yoga', 'neck-shoulder'];
  else order = [[1, 4].includes(dowN) ? 'beginner-full' : [2, 5].includes(dowN) ? 'knee-friendly' : dowN === 3 ? 'cardio-blast' : 'yoga-flow', 'desk-reset'];
  return order.map(pick).find((r) => r && !doneToday.includes(r.id)) || pick('desk-reset');
}

export function view() {
  const k = todayKey(), d = getDay(k), p = state.profile;
  const water = d.water || 0, goal = p.waterGoal || 8;
  const habits = activeHabits(), doneH = habits.filter((h) => d.habits?.[h.id]).length;
  const mins = activeMinutes(k);
  const mood = latestMood(k);
  const tip = DAILY_TIPS[dayIndex() % DAILY_TIPS.length];
  const sug = suggestion();
  const plan = todaysPlanDay();
  const meals = d.meals || {};
  const score = plateScore(k);
  const date = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

  return `
  <header class="top">
    <div>
      <div class="muted small">${esc(date)}</div>
      <h1>${greeting()}${p.name ? ', ' + esc(p.name) : ''}</h1>
    </div>
    <div class="top-actions"><button class="icon-btn view-toggle" data-act="layout-toggle" aria-label="Switch to web view" title="Switch to web view">${icon('monitor')}</button><a class="icon-btn" href="#/settings" aria-label="Settings">${icon('gear')}</a></div>
  </header>

  <section class="glance">
    <button class="glance-item" data-act="nav" data-href="#/nourish">${ring(water / goal, { color: 'var(--water)', inner: icon('drop') })}<b>${water}/${goal}</b><span>Water</span></button>
    <button class="glance-item" data-act="nav" data-href="#/move/log">${ring(mins / 30, { color: 'var(--move)', inner: icon('flame') })}<b>${mins} min</b><span>Active</span></button>
    <button class="glance-item" data-act="scroll" data-to="habits">${ring(habits.length ? doneH / habits.length : 0, { color: 'var(--accent)', inner: icon('check') })}<b>${doneH}/${habits.length}</b><span>Habits</span></button>
    <button class="glance-item" data-act="mood-open">${ring(mood ? mood.score / 5 : 0, { color: 'var(--mind)', inner: mood ? `<span class="ring-emoji">${moodEmoji(mood.score)}</span>` : icon('heart') })}<b>${mood ? MOODS[mood.score - 1].l : '—'}</b><span>Mood</span></button>
  </section>

  <div class="tip card">
    <div class="eyebrow">${esc(tip.area)} tip</div>
    <p>${esc(tip.text)}</p>
  </div>

  ${!d.sleep ? `
  <button class="card card-row prompt c-sleep" data-act="sleep-open">
    <span class="prompt-ic">${icon('moon')}</span>
    <div><b>How did you sleep?</b><span class="muted small">Log last night in 10 seconds</span></div>
    ${icon('right', 'chev')}
  </button>` : ''}

  ${!mood ? `
  <div class="card">
    <div class="card-head"><h2>How are you feeling?</h2></div>
    <div class="mood-quick">${MOODS.map((m) => `<button class="mood-btn" data-act="mood-quick" data-v="${m.v}" aria-label="${m.l}"><span>${m.e}</span><small>${m.l}</small></button>`).join('')}</div>
  </div>` : ''}

  <div class="card c-move">
    <div class="card-head"><h2>Move today</h2><a class="link" href="${plan ? '#/move/plan/' + plan.plan.id : '#/move/plans'}">${plan ? 'My plan' : 'Plans'}</a></div>
    ${plan && plan.day ? `
    <button class="routine-hero c-${plan.plan.color}" data-act="plan-start" data-id="${plan.plan.id}" data-day="${plan.key}">
      <div><div class="eyebrow">${esc(plan.plan.name)} · ${plan.weekDone}/${daysPerWeek(plan.plan)} this week</div><b>${esc(plan.day.name)}${plan.doneToday ? ' ✓' : ''}</b><span>${plan.day.exercises.length} exercises · ~${planDayMins(plan.plan, plan.key)} min</span></div>
      <span class="play-btn">${icon('play')}</span>
    </button>` : `
    ${plan ? `<p class="muted small plan-rest">😌 Rest day on <b>${esc(plan.plan.name)}</b>. Light movement helps recovery:</p>` : ''}
    <button class="routine-hero c-${sug.color}" data-act="routine-open" data-id="${sug.id}">
      <div><div class="eyebrow">Suggested</div><b>${esc(sug.name)}</b><span>${routineMins(sug)} min · ${esc(sug.level)}</span></div>
      <span class="play-btn">${icon('play')}</span>
    </button>
    ${!plan ? `<a class="plan-nudge" href="#/move/plans">${icon('list')} Want a weekly plan with sets & reps? <b>Choose a plan</b></a>` : ''}`}
    <div class="btn-row">
      <button class="btn btn-soft btn-grow" data-act="activity-open">${icon('plus')} Log activity</button>
      <a class="btn btn-soft btn-grow" href="#/move">${icon('move')} Exercises</a>
    </div>
    ${(d.workouts || []).length ? `<div class="mini-list">${d.workouts.map((w) => `<div>${icon('check', 'ok')} ${esc(w.name)} <span class="muted">· ${w.minutes} min</span></div>`).join('')}</div>` : ''}
  </div>

  <div class="card c-water">
    <div class="card-head"><h2>Water</h2><span class="muted small">${water * (p.glassMl || 250)} ml</span></div>
    <div class="glasses">${Array.from({ length: Math.max(goal, water) }, (_, i) => `<button class="glass ${i < water ? 'full' : ''}" data-act="water-set" data-n="${i < water && i === water - 1 ? i : i + 1}" aria-label="Glass ${i + 1}">${icon('drop')}</button>`).join('')}</div>
    <div class="btn-row">
      <button class="btn btn-soft" data-act="water" data-d="-1" aria-label="Remove a glass">${icon('minus')}</button>
      <button class="btn btn-water btn-grow" data-act="water" data-d="1">${icon('plus')} Add a glass</button>
    </div>
  </div>

  <div class="card c-eat">
    <div class="card-head"><h2>Meals</h2>${score != null ? `<span class="pill">Plate score ${score}/10</span>` : ''}</div>
    <div class="meal-grid">
      ${MEALS.map((m) => { const x = meals[m.id]; return `
        <button class="meal-tile ${x ? (x.skipped ? 'skipped' : 'logged') : ''}" data-act="meal-open" data-meal="${m.id}">
          <span class="meal-ic">${m.icon}</span><b>${m.name}</b>
          <span class="small">${x ? (x.skipped ? 'Skipped' : (x.tags || []).map((t) => MEAL_TAGS.find((z) => z.id === t)?.icon || '').join('') || '✓ Logged') : 'Tap to log'}</span>
        </button>`; }).join('')}
    </div>
  </div>

  <div class="card" id="habits">
    <div class="card-head"><h2>Habits</h2><a class="link" href="#/settings/habits">Edit</a></div>
    ${['body', 'mind'].map((kind) => {
      const hs = habits.filter((h) => h.kind === kind);
      if (!hs.length) return '';
      return `<div class="habit-group"><div class="label">${kind === 'body' ? 'Body' : 'Mind'}</div>${hs.map((h) => {
        const on = !!d.habits?.[h.id], st = habitStreak(h.id);
        return `<button class="habit ${on ? 'on' : ''}" data-act="habit" data-id="${h.id}" aria-pressed="${on}">
          <span class="habit-ic">${h.icon}</span><span class="habit-name">${esc(h.name)}</span>
          ${st > 1 ? `<span class="streak">${icon('flame')}${st}</span>` : ''}
          <span class="check">${icon('check')}</span>
        </button>`; }).join('')}</div>`;
    }).join('')}
  </div>

  ${d.sleep ? `
  <button class="card card-row c-sleep" data-act="sleep-open">
    <span class="prompt-ic">${icon('moon')}</span>
    <div><b>${fmtHours(d.sleep.hours)} sleep</b><span class="muted small">${d.sleep.bed} → ${d.sleep.wake} · quality ${d.sleep.quality}/5</span></div>
    ${icon('edit', 'chev')}
  </button>` : ''}

  ${mood ? `
  <button class="card card-row c-mind" data-act="mood-open">
    <span class="prompt-ic emoji">${moodEmoji(mood.score)}</span>
    <div><b>Feeling ${MOODS[mood.score - 1].l.toLowerCase()}</b><span class="muted small">${plural((d.moods || []).length, 'check-in')} today · tap to add another</span></div>
    ${icon('plus', 'chev')}
  </button>` : ''}
  `;
}

export const actions = {
  water: (el) => {
    editDay(todayKey(), (d) => { d.water = Math.max(0, (d.water || 0) + Number(el.dataset.d)); });
    rerender();
  },
  'water-set': (el) => { editDay(todayKey(), (d) => { d.water = Number(el.dataset.n); }); rerender(); },
  habit: (el) => {
    const k = todayKey(), id = el.dataset.id;
    setHabit(k, id, !getDay(k).habits?.[id]);
    rerender();
  },
  'mood-quick': (el) => {
    editDay(todayKey(), (d) => { (d.moods ||= []).push({ at: Date.now(), score: Number(el.dataset.v), energy: 3, stress: 2, tags: [], note: '' }); });
    rerender();
  },
  scroll: (el) => document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
};
