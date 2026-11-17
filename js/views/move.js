import { state, save, getDay, todayKey, editDay, lastNDays, workoutStreak, activeMinutes } from '../store.js';
import { esc, icon, EX, PARTS, EQ_LABEL, KIND_LABEL, mediaHTML, niceDate, dow, plural, openSheet, closeSheet, toast, cap, defaultItem } from '../ui.js';
import { EXERCISES } from '../data/exercises.js';
import { muscleSummary } from '../data/muscles.js';
import { allRoutines, routineMins, routineEquipment, itemAmount, activityLabel, planDayRoutine, planDayMins, setsReps } from '../sheets.js';
import { rerender, go } from '../router.js';
import { PLANS, findPlan, DAY_NAMES, scheduleIndex, daysPerWeek } from '../data/plans.js';
import { startRoutine } from '../player.js';
import { addDays } from '../store.js';

const TABS = [['body', 'Body'], ['plans', 'Plans'], ['routines', 'Routines'], ['yoga', 'Posture & Yoga']];
let bodySide = 'front';
const filters = { kind: 'all', eq: 'all' };

export function view(sub = 'body', arg) {
  if (sub === 'part') return partView(arg);
  if (sub === 'build') return buildView(arg);
  if (sub === 'plan') return planView(arg);
  if (sub === 'log') return `<header class="top"><a class="icon-btn" href="#/move/body" aria-label="Back">${icon('left')}</a><h1 class="grow">Workout log</h1><button class="icon-btn" data-act="activity-open" aria-label="Log activity">${icon('plus')}</button></header>${logView()}`;
  return `
  <header class="top"><h1>Move</h1>
    <a class="icon-btn" href="#/move/log" aria-label="Workout log">${icon('clock')}</a>
    <button class="icon-btn" data-act="activity-open" aria-label="Log activity">${icon('plus')}</button></header>
  <nav class="seg" role="tablist">${TABS.map(([id, l]) => `<a href="#/move/${id}" class="${sub === id ? 'on' : ''}" role="tab">${l}</a>`).join('')}</nav>
  ${sub === 'routines' ? routinesView() : sub === 'yoga' ? yogaView() : sub === 'plans' ? plansView() : bodyView()}`;
}

// ---------------- PLANS ----------------
function planWeekDone(plan) {
  const idx = scheduleIndex();
  const monday = addDays(todayKey(), -idx);
  let n = 0;
  for (let i = 0; i <= idx; i++) n += (getDay(addDays(monday, i)).workouts || []).filter((w) => w.planId === plan.id).length;
  return n;
}
export function todaysPlanDay() {
  const plan = state.plan && findPlan(state.plan.id);
  if (!plan) return null;
  const key = plan.schedule[scheduleIndex()];
  const doneToday = (getDay().workouts || []).some((w) => w.planId === plan.id);
  return { plan, key, day: key ? plan.days[key] : null, doneToday, weekDone: planWeekDone(plan) };
}
const planCard = (p) => {
  const active = state.plan?.id === p.id;
  return `<a class="plan-card c-${p.color}" href="#/move/plan/${p.id}">
    <div class="plan-card-top"><span class="eyebrow">${esc(p.goal)}</span>${active ? '<span class="pill on">Following</span>' : ''}</div>
    <b>${esc(p.name)}</b>
    <span class="muted small">${esc(p.blurb)}</span>
    <div class="plan-meta"><span>${icon('clock')} ${daysPerWeek(p)} days/week</span><span>${p.weeks} weeks</span><span>${esc(p.level)}</span></div>
    <div class="plan-meta"><span>${esc(p.equipment)}</span></div>
  </a>`;
};
function plansView() {
  const t = todaysPlanDay();
  return `
  ${t ? `<div class="card c-${t.plan.color} plan-now">
    <div class="eyebrow">Your plan · week progress ${t.weekDone}/${daysPerWeek(t.plan)}</div>
    <h2>${esc(t.plan.name)}</h2>
    ${t.day ? `<p class="muted">Today: <b>${esc(t.day.name)}</b> · ~${planDayMins(t.plan, t.key)} min${t.doneToday ? ' · done ✓' : ''}</p>
      <button class="btn btn-primary btn-block" data-act="plan-start" data-id="${t.plan.id}" data-day="${t.key}">${icon('play')} ${t.doneToday ? 'Do it again' : 'Start today\'s workout'}</button>`
      : `<p class="muted">Rest day today. A walk or the Desk Posture Reset is a great way to recover.</p>`}
    <a class="link" href="#/move/plan/${t.plan.id}">View full plan</a>
  </div>` : `<p class="muted small intro-text">Pick a plan that matches your goal. Each one tells you what to do on which day, with sets, reps and rest. Follow it and Today shows you each day's workout.</p>`}
  <div class="plan-list">${PLANS.map(planCard).join('')}</div>`;
}
function planView(id) {
  const p = findPlan(id);
  if (!p) return `<header class="top"><a class="icon-btn" href="#/move/plans">${icon('left')}</a><h1>Not found</h1></header>`;
  const active = state.plan?.id === p.id;
  const ti = scheduleIndex();
  const keys = Object.keys(p.days);
  const avgMins = Math.round(keys.reduce((s, k) => s + planDayMins(p, k), 0) / keys.length);
  return `
  <header class="top"><a class="icon-btn" href="#/move/plans" aria-label="Back">${icon('left')}</a><div class="grow"><div class="eyebrow">${esc(p.goal)}</div><h1>${esc(p.name)}</h1></div></header>
  <p class="muted">${esc(p.blurb)}</p>
  <div class="stat-row">
    <div><b>${daysPerWeek(p)}</b><span>days / week</span></div>
    <div><b>~${avgMins}</b><span>min / session</span></div>
    <div><b>${p.weeks}</b><span>weeks</span></div>
  </div>
  <p class="muted small">${esc(p.level)} · ${esc(p.equipment)}</p>
  <div class="card">
    <h2>Your week</h2>
    <div class="week-plan">${p.schedule.map((k, i) => `<div class="wp ${k ? 'on' : ''} ${i === ti ? 'today' : ''}"><span>${DAY_NAMES[i]}</span><b>${k ? esc(p.days[k].name.split(' (')[0]) : 'Rest'}</b></div>`).join('')}</div>
    ${active ? `<button class="btn btn-danger-ghost btn-block" data-act="plan-stop">Stop following this plan</button>`
      : `<button class="btn btn-primary btn-block" data-act="plan-follow" data-id="${p.id}">${icon('check')} Follow this plan</button>`}
  </div>
  ${keys.map((k) => { const d = p.days[k]; return `
  <div class="card plan-day">
    <div class="card-head"><div><div class="eyebrow">Day ${esc(k)}</div><h2>${esc(d.name)}</h2></div><span class="pill">~${planDayMins(p, k)} min</span></div>
    ${d.circuit ? `<p class="circuit-note">${icon('clock')} <span><b>Circuit:</b> do one set of each move in order (${d.rest ?? 20}s between moves), rest ${d.roundRest ?? 60}s, then repeat for ${Math.max(...d.exercises.map((e) => e.sets))} rounds.</span></p>` : ''}
    ${d.note ? `<p class="muted small">${esc(d.note)}</p>` : ''}
    <div class="plan-ex">${d.exercises.map((e) => { const ex = EX[e.ex]; return `
      <button class="plan-ex-row" data-act="ex-open" data-id="${ex.id}">
        ${mediaHTML(ex, { size: 'sm', still: true })}
        <div class="grow"><b>${esc(ex.name)}</b><span>${esc(muscleSummary(ex))}${e.note ? ' · ' + esc(e.note) : ''}</span></div>
        <div class="sr"><b>${esc(setsReps(e))}</b>${!d.circuit && e.rest ? `<span>rest ${e.rest}s</span>` : ''}</div>
      </button>`; }).join('')}</div>
    <button class="btn btn-soft btn-block" data-act="plan-start" data-id="${p.id}" data-day="${k}">${icon('play')} Start ${esc(d.name)}</button>
  </div>`; }).join('')}
  <div class="card"><h2>How to progress</h2><ul class="cues good">${p.tips.map((t) => `<li>${icon('check')}<span>${esc(t)}</span></li>`).join('')}</ul></div>`;
}

// ---------------- BODY MAP ----------------
const count = (part) => EXERCISES.filter((e) => e.parts.includes(part)).length;
function bodySvg(side) {
  const r = (part, x, y, w, h, rx = 10, extra = '') => `<rect class="bm-part" data-act="part" data-part="${part}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${extra}><title>${PARTS[part].name}</title></rect>`;
  const e = (part, cx, cy, rx, ry) => `<ellipse class="bm-part" data-act="part" data-part="${part}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"><title>${PARTS[part].name}</title></ellipse>`;
  const base = `<circle class="bm-head" cx="100" cy="34" r="21"/><ellipse class="bm-head" cx="85" cy="386" rx="11" ry="6"/><ellipse class="bm-head" cx="115" cy="386" rx="11" ry="6"/>`;
  const common = r('neck', 89, 55, 22, 18, 7) + e('shoulders', 61, 88, 17, 15) + e('shoulders', 139, 88, 17, 15) +
    r('arms', 38, 103, 19, 54, 9.5) + r('arms', 143, 103, 19, 54, 9.5) + r('arms', 32, 160, 17, 58, 8.5) + r('arms', 151, 160, 17, 58, 8.5);
  if (side === 'front') return base + common +
    r('chest', 71, 76, 28, 38, 11) + r('chest', 101, 76, 28, 38, 11) +
    r('core', 75, 118, 50, 62, 13) +
    r('glutes', 72, 183, 56, 24, 11) +
    r('legs', 70, 210, 28, 92, 14) + r('legs', 102, 210, 28, 92, 14) +
    r('calves', 74, 307, 21, 72, 10) + r('calves', 105, 307, 21, 72, 10);
  return base + common +
    r('back', 71, 76, 58, 72, 16) + r('back', 77, 151, 46, 29, 11) +
    r('glutes', 72, 183, 27, 34, 13) + r('glutes', 101, 183, 27, 34, 13) +
    r('legs', 70, 220, 28, 82, 14) + r('legs', 102, 220, 28, 82, 14) +
    r('calves', 73, 307, 22, 72, 11) + r('calves', 105, 307, 22, 72, 11);
}
function bodyView() {
  const parts = Object.keys(PARTS);
  return `
  <div class="card body-card">
    <div class="body-map">
      <svg viewBox="20 0 160 400" class="bm" role="group" aria-label="Body map — tap a muscle group">${bodySvg(bodySide)}</svg>
    </div>
    <div class="body-side">
      <div class="seg small">${['front', 'back'].map((s) => `<button class="${bodySide === s ? 'on' : ''}" data-act="body-side" data-side="${s}">${cap(s)}</button>`).join('')}</div>
      <p class="muted small">Tap a muscle group to see exercises that work it.</p>
    </div>
  </div>
  <div class="part-grid">
    ${parts.map((p) => `<a class="part-tile" href="#/move/part/${p}"><b>${PARTS[p].name}</b><span>${count(p)} exercises</span></a>`).join('')}
  </div>`;
}

function partView(part) {
  const P = PARTS[part];
  if (!P) return `<p>Unknown body part.</p>`;
  let list = EXERCISES.filter((e) => e.parts.includes(part));
  const eqs = [...new Set(list.map((e) => e.eq))];
  if (filters.kind !== 'all') list = list.filter((e) => e.kind === filters.kind);
  if (filters.eq !== 'all') list = list.filter((e) => e.eq === filters.eq);
  // home-friendly first, then by level
  const lv = { beginner: 0, intermediate: 1, expert: 2 }, eqo = { none: 0, band: 1, dumbbell: 2, bar: 3, kettlebell: 4, other: 5, gym: 6 };
  list.sort((a, b) => (a.kind === 'stretch') - (b.kind === 'stretch') || eqo[a.eq] - eqo[b.eq] || lv[a.level] - lv[b.level]);
  return `
  <header class="top"><a class="icon-btn" href="#/move/body" aria-label="Back">${icon('left')}</a><div class="grow"><h1>${esc(P.name)}</h1><div class="muted small">${esc(P.muscles)}</div></div></header>
  <div class="filters">
    <div class="chips scroll">${[['all', 'All'], ['strength', 'Strength'], ['stretch', 'Stretch'], ['cardio', 'Cardio']].filter(([k]) => k === 'all' || EXERCISES.some((e) => e.parts.includes(part) && e.kind === k)).map(([k, l]) => `<button class="chip-btn ${filters.kind === k ? 'on' : ''}" data-act="filter" data-f="kind" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="chips scroll">${['all', ...eqs].map((k) => `<button class="chip-btn ${filters.eq === k ? 'on' : ''}" data-act="filter" data-f="eq" data-v="${k}">${k === 'all' ? 'Any equipment' : EQ_LABEL[k]}</button>`).join('')}</div>
  </div>
  <div class="ex-list">
    ${list.map(exRow).join('') || '<p class="muted center">No exercises match these filters.</p>'}
  </div>`;
}
export const exRow = (ex) => `
  <button class="ex-row" data-act="ex-open" data-id="${ex.id}">
    ${mediaHTML(ex, { size: 'sm', still: true })}
    <div class="ex-row-text"><b>${esc(ex.name)}</b><span>${esc(muscleSummary(ex))} · ${esc(EQ_LABEL[ex.eq])}</span></div>
    ${icon('right', 'chev')}
  </button>`;

// ---------------- ROUTINES ----------------
const routineCard = (r) => `
  <button class="routine-card c-${r.color || 'teal'}" data-act="routine-open" data-id="${r.id}">
    <div class="routine-card-top"><span class="eyebrow">${esc(r.custom ? 'My routine' : cap(r.focus))}</span><span class="play-btn sm">${icon('play')}</span></div>
    <b>${esc(r.name)}</b>
    <span class="muted small">${routineMins(r)} min · ${plural(r.items.length, 'move')}${routineEquipment(r).length ? ' · ' + routineEquipment(r).map((e) => EQ_LABEL[e]).join(', ') : ''}</span>
  </button>`;
function routinesView() {
  const all = allRoutines();
  const mine = all.filter((r) => r.custom);
  const groups = [['strength', 'Strength'], ['cardio', 'Cardio'], ['posture', 'Posture & pain relief'], ['mobility', 'Mobility'], ['yoga', 'Yoga']];
  return `
  <div class="section-head"><h2>My routines</h2><button class="btn btn-soft btn-sm" data-act="routine-new">${icon('plus')} New</button></div>
  ${mine.length ? `<div class="routine-grid">${mine.map(routineCard).join('')}</div>` : `<p class="muted small">Build your own: pick exercises, set reps or time, and the player guides you through.</p>`}
  ${groups.map(([f, l]) => { const rs = all.filter((r) => !r.custom && r.focus === f); return rs.length ? `<div class="section-head"><h2>${l}</h2></div><div class="routine-grid">${rs.map(routineCard).join('')}</div>` : ''; }).join('')}`;
}

// ---------------- YOGA & POSTURE ----------------
function yogaView() {
  const posture = EXERCISES.filter((e) => e.tags.includes('posture'));
  const yoga = EXERCISES.filter((e) => e.tags.includes('yoga'));
  const stretch = EXERCISES.filter((e) => e.kind === 'stretch' && !e.tags.length);
  const rs = allRoutines().filter((r) => ['posture', 'yoga', 'mobility'].includes(r.focus) && !r.custom);
  const tile = (ex) => `<button class="ex-tile" data-act="ex-open" data-id="${ex.id}">${mediaHTML(ex, { size: 'md', still: true })}<b>${esc(ex.name)}</b></button>`;
  return `
  <div class="card posture-intro">
    <h2>Fix your posture, one habit at a time</h2>
    <p class="muted small">Long hours at a desk or on the phone pull the head forward and round the shoulders. Short, frequent sessions beat one long one: try the <b>Desk Posture Reset</b> once a day and a chin-tuck break every hour.</p>
  </div>
  <div class="section-head"><h2>Guided sessions</h2></div>
  <div class="routine-grid">${rs.map(routineCard).join('')}</div>
  <div class="section-head"><h2>Posture & physio</h2><span class="muted small">${posture.length}</span></div>
  <div class="tile-scroll">${posture.map(tile).join('')}</div>
  <div class="section-head"><h2>Yoga poses</h2><span class="muted small">${yoga.length}</span></div>
  <div class="tile-scroll">${yoga.map(tile).join('')}</div>
  <div class="section-head"><h2>Stretch & mobility</h2><span class="muted small">${stretch.length}</span></div>
  <div class="tile-scroll">${stretch.map(tile).join('')}</div>
  <p class="fine">Inspired by physio-style movement education (e.g. Squat University). Each exercise links to their channel so you can watch the form in video.</p>`;
}

// ---------------- LOG ----------------
function logView() {
  const days = lastNDays(7);
  const streak = workoutStreak();
  const weekMins = days.reduce((s, k) => s + activeMinutes(k), 0);
  const weekCount = days.reduce((s, k) => s + (getDay(k).workouts || []).length, 0);
  const keys = Object.keys(state.days).filter((k) => (state.days[k].workouts || []).length).sort().reverse().slice(0, 30);
  return `
  <div class="card">
    <div class="week-strip">${days.map((k) => { const n = (getDay(k).workouts || []).length; return `<div class="wd ${n ? 'on' : ''} ${k === todayKey() ? 'today' : ''}"><span>${dow(k)[0]}</span><i>${n ? icon('check') : ''}</i></div>`; }).join('')}</div>
    <div class="stat-row">
      <div><b>${streak}</b><span>day streak</span></div>
      <div><b>${weekCount}</b><span>sessions this week</span></div>
      <div><b>${weekMins}</b><span>active min</span></div>
    </div>
    <button class="btn btn-primary btn-block" data-act="activity-open">${icon('plus')} Log activity</button>
  </div>
  ${keys.length ? keys.map((k) => `
    <div class="section-head"><h2>${esc(niceDate(k))}</h2><span class="muted small">${activeMinutes(k)} min</span></div>
    <div class="card list">${state.days[k].workouts.map((w) => `
      <div class="log-row">
        <span class="log-ic">${w.kind === 'activity' ? activityLabel(w.type).split(' ')[0] : w.kind === 'sets' ? '🏋️' : '▶️'}</span>
        <div class="grow"><b>${esc(w.name)}</b><span class="muted small">${w.minutes} min${w.intensity ? ' · ' + esc(w.intensity) : ''}${w.kind === 'sets' ? ' · ' + w.items.map((i) => `${esc(EX[i.ex]?.name || i.ex)} ×${i.sets.length}`).join(', ') : ''}${w.note ? ' · ' + esc(w.note) : ''}</span></div>
        <button class="icon-btn sm" data-act="workout-del" data-date="${k}" data-id="${w.id}" aria-label="Delete">${icon('trash')}</button>
      </div>`).join('')}</div>`).join('')
  : `<div class="empty"><div class="empty-ic">🏃</div><p>No workouts yet. Start a routine or log a walk — every bit counts.</p></div>`}`;
}

// ---------------- ROUTINE BUILDER ----------------
function buildView(id) {
  const r = state.routines.find((x) => x.id === id);
  if (!r) return `<header class="top"><a class="icon-btn" href="#/move/routines">${icon('left')}</a><h1>Not found</h1></header>`;
  return `
  <header class="top"><a class="icon-btn" href="#/move/routines" aria-label="Back">${icon('left')}</a><h1 class="grow">Edit routine</h1></header>
  <form class="card" data-submit="build-save" data-id="${r.id}">
    <label class="field"><span>Name</span><input name="name" value="${esc(r.name)}" maxlength="40" required></label>
    <div class="row2">
      <label class="field"><span>Rounds</span><input name="rounds" type="number" min="1" max="10" value="${r.rounds || 1}"></label>
      <label class="field"><span>Rest between moves (s)</span><input name="rest" type="number" min="0" max="300" step="5" value="${r.rest ?? 20}"></label>
    </div>
    <div class="label">Moves</div>
    <div class="build-list">
      ${r.items.map((it, i) => { const ex = EX[it.ex]; return `
      <div class="build-row">
        ${mediaHTML(ex, { size: 'sm', still: true })}
        <div class="grow">
          <b>${esc(ex?.name || it.ex)}</b>
          <div class="build-ctrl">
            <input type="number" min="1" max="600" value="${it.secs || it.reps}" name="amt-${i}" aria-label="Amount">
            <select name="mode-${i}" aria-label="Reps or seconds"><option value="reps" ${it.reps ? 'selected' : ''}>reps</option><option value="secs" ${it.secs ? 'selected' : ''}>sec</option></select>
            <label class="mini-check"><input type="checkbox" name="sides-${i}" ${it.sides ? 'checked' : ''}> each side</label>
          </div>
        </div>
        <div class="build-move">
          <button type="button" class="icon-btn sm" data-act="build-move" data-id="${r.id}" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${icon('up')}</button>
          <button type="button" class="icon-btn sm" data-act="build-move" data-id="${r.id}" data-i="${i}" data-d="1" ${i === r.items.length - 1 ? 'disabled' : ''} aria-label="Move down">${icon('down')}</button>
          <button type="button" class="icon-btn sm" data-act="build-remove" data-id="${r.id}" data-i="${i}" aria-label="Remove">${icon('x')}</button>
        </div>
      </div>`; }).join('') || '<p class="muted small">No moves yet.</p>'}
    </div>
    <button type="button" class="btn btn-soft btn-block" data-act="build-add" data-id="${r.id}">${icon('plus')} Add exercise</button>
    <div class="btn-row"><button class="btn btn-primary btn-grow" type="submit">${icon('check')} Save routine</button></div>
  </form>`;
}
/** Persist the builder's current field values (so add/move/remove don't lose edits). */
function syncBuilder(r) {
  const f = document.querySelector('form[data-submit="build-save"]');
  if (!f) return;
  r.name = f.elements['name'].value.trim() || 'My routine';
  r.rounds = Math.max(1, Number(f.rounds.value) || 1);
  r.rest = Math.max(0, Number(f.rest.value) || 0);
  r.items = r.items.map((it, i) => {
    const amt = Math.max(1, Number(f[`amt-${i}`]?.value) || 10);
    const mode = f[`mode-${i}`]?.value || (it.secs ? 'secs' : 'reps');
    const sides = !!f[`sides-${i}`]?.checked;
    return { ex: it.ex, [mode]: amt, ...(sides ? { sides: true } : {}) };
  });
}
function pickerHTML(rid, q = '') {
  const s = q.trim().toLowerCase();
  const list = EXERCISES.filter((e) => !s || e.name.toLowerCase().includes(s) || e.parts.some((p) => p.includes(s)) || e.primary.some((m) => m.includes(s))).slice(0, 60);
  return `<div class="sheet-pad">
    <h2>Add exercise</h2>
    <label class="field search"><input type="search" id="pickQ" placeholder="Search: squat, chest, posture…" value="${esc(q)}" data-rid="${rid}" autocomplete="off" autofocus></label>
    <div class="ex-list" id="pickList">${list.map((e) => `<button class="ex-row" data-act="build-pick" data-id="${rid}" data-ex="${e.id}">${mediaHTML(e, { size: 'sm', still: true })}<div class="ex-row-text"><b>${esc(e.name)}</b><span>${esc(e.parts.map((p) => PARTS[p]?.name).join(', '))}</span></div>${icon('plus', 'chev')}</button>`).join('')}</div>
  </div>`;
}
export function onPickerInput(input) {
  const list = document.getElementById('pickList');
  if (!list) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = pickerHTML(input.dataset.rid, input.value);
  list.replaceWith(tmp.querySelector('#pickList'));
}

export const actions = {
  'body-side': (el) => { bodySide = el.dataset.side; rerender(); },
  'plan-follow': (el) => {
    state.plan = { id: el.dataset.id, start: todayKey() }; save();
    toast('Plan started — today\'s workout will show on Today'); rerender();
  },
  'plan-stop': () => { if (!confirm('Stop following this plan? Your workout history is kept.')) return; state.plan = null; save(); rerender(); },
  'plan-start': (el) => { const p = findPlan(el.dataset.id); if (p) startRoutine(planDayRoutine(p, el.dataset.day)); },
  part: (el) => { filters.kind = 'all'; filters.eq = 'all'; go('#/move/part/' + el.dataset.part); },
  filter: (el) => { filters[el.dataset.f] = el.dataset.v; rerender(); },
  'routine-new': () => {
    const id = Date.now().toString(36);
    state.routines.unshift({ id, name: 'My routine', focus: 'custom', rest: 20, rounds: 1, color: 'teal', items: [] });
    save(); go('#/move/build/' + id);
  },
  'build-add': (el) => { const r = state.routines.find((x) => x.id === el.dataset.id); syncBuilder(r); save(); openSheet(pickerHTML(r.id), { cls: 'sheet-tall' }); },
  'build-pick': (el) => {
    const r = state.routines.find((x) => x.id === el.dataset.id), ex = EX[el.dataset.ex];
    r.items.push(defaultItem(ex.id));
    save(); closeSheet(); toast(`Added ${ex.name}`); rerender();
  },
  'build-move': (el) => {
    const r = state.routines.find((x) => x.id === el.dataset.id); syncBuilder(r);
    const i = Number(el.dataset.i), j = i + Number(el.dataset.d);
    if (j < 0 || j >= r.items.length) return;
    [r.items[i], r.items[j]] = [r.items[j], r.items[i]]; save(); rerender();
  },
  'build-remove': (el) => { const r = state.routines.find((x) => x.id === el.dataset.id); syncBuilder(r); r.items.splice(Number(el.dataset.i), 1); save(); rerender(); },
  'build-save': (form) => {
    const r = state.routines.find((x) => x.id === form.dataset.id); syncBuilder(r); save();
    toast('Routine saved ✓'); go('#/move/routines');
  },
  'workout-del': (el) => {
    if (!confirm('Delete this entry?')) return;
    editDay(el.dataset.date, (d) => { d.workouts = (d.workouts || []).filter((w) => w.id !== el.dataset.id); });
    rerender();
  },
};
