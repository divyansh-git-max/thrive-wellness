// Bottom sheets shared across tabs: exercise details, logging forms, routine details.
import { state, save, editDay, getDay, todayKey, uid, addWorkout, exerciseHistory, sleepHours, MEALS, MEAL_TAGS, sortMetrics, autoHabit } from './store.js';
import { esc, icon, EX, openSheet, closeSheet, updateSheet, toast, mediaHTML, EQ_LABEL, KIND_LABEL, cap, squatUniUrl, youtubeUrl, MOODS, niceDate, shortDate, fmtHours, isTimed, defaultItem } from './ui.js';
import { ROUTINES } from './data/routines.js';
import { rerender, go } from './router.js';
import { startRoutine } from './player.js';
import { exerciseImpact, impactSentence } from './data/muscles.js';
import { muscleMapSVG } from './musclemap.js';
import { PARTS } from './ui.js';

export const chip = (name, value, label, { type = 'checkbox', checked = false, cls = '' } = {}) =>
  `<label class="chip ${cls}"><input type="${type}" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;

// ================= EXERCISE =================
export function exerciseSheet(id) {
  const ex = EX[id];
  if (!ex) return toast('Exercise not found');
  openSheet(exerciseHTML(ex), { cls: 'sheet-tall' });
}
function exerciseHTML(ex, { logging = false } = {}) {
  const hist = exerciseHistory(ex.id, 3);
  const timeBased = isTimed(ex);
  const histLine = hist.length
    ? `<div class="hist">${icon('clock')}<div><b>Last time (${esc(niceDate(hist[0].date))}):</b> ${hist[0].sets.map(fmtSet).join(' · ')}</div></div>` : '';
  const tags = [KIND_LABEL[ex.kind], EQ_LABEL[ex.eq], cap(ex.level), ...ex.tags.map(cap)].filter(Boolean);
  const impact = exerciseImpact(ex);
  return `
    ${mediaHTML(ex, { size: 'lg' })}
    <div class="sheet-pad">
      <h2 class="ex-title">${esc(ex.name)}</h2>
      <div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <div class="muscles">${impact.filter((i) => i.lvl > 1).map((i) => `<span class="muscle ${i.lvl === 3 ? 'primary' : ''}">${esc(i.info.name)}</span>`).join('')}</div>
      <div class="video-row">
        <a class="btn btn-video" href="${squatUniUrl(ex.name)}" target="_blank" rel="noopener">${icon('video')} Squat University</a>
        <a class="btn btn-ghost" href="${youtubeUrl(ex.name)}" target="_blank" rel="noopener">${icon('search')} More videos</a>
      </div>
      ${histLine}
      ${logging ? logSetForm(ex, timeBased) : `
      <div class="btn-row">
        <button class="btn btn-primary" data-act="ex-log" data-id="${ex.id}">${icon('plus')} Log a set</button>
        <button class="btn btn-soft" data-act="ex-add-routine" data-id="${ex.id}">${icon('list')} Add to routine</button>
      </div>`}
      ${impactHTML(ex, impact)}
      <h3 class="sec">How to do it</h3>
      <ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      ${ex.cues.length ? `<h3 class="sec">Form cues</h3><ul class="cues good">${ex.cues.map((s) => `<li>${icon('check')}<span>${esc(s)}</span></li>`).join('')}</ul>` : ''}
      ${ex.mistakes.length ? `<h3 class="sec">Common mistakes</h3><ul class="cues bad">${ex.mistakes.map((s) => `<li>${icon('x')}<span>${esc(s)}</span></li>`).join('')}</ul>` : ''}
      <p class="fine">Stop if anything causes sharp pain. Mild effort or stretch is fine; pain is not.</p>
    </div>`;
}
/** "What it works": muscle map + per-muscle explanation with intensity meter. */
export function impactHTML(ex, impact = exerciseImpact(ex)) {
  const levels = Object.fromEntries(impact.map((i) => [i.m, i.lvl]));
  const parts = [...new Set(impact.filter((i) => i.lvl > 1).map((i) => PARTS[i.info.part]?.name).filter(Boolean))];
  const meter = (l) => `<span class="meter" aria-label="${l} of 3">${[1, 2, 3].map((n) => `<i class="${n <= l ? 'on' : ''}"></i>`).join('')}</span>`;
  return `
    <h3 class="sec">What it works</h3>
    <div class="impact">
      <div class="impact-map">${muscleMapSVG(levels)}</div>
      <div class="impact-legend"><span><i class="l3"></i>Main target</span><span><i class="l2"></i>Assists</span><span><i class="l1"></i>${ex.kind === 'stretch' ? 'Light' : 'Stabilises'}</span></div>
      ${parts.length ? `<p class="impact-parts"><b>Body parts:</b> ${parts.map(esc).join(' · ')}</p>` : ''}
      <div class="impact-list">${impact.map((i) => `
        <div class="impact-row">
          <div class="impact-head"><b>${esc(i.info.name)}</b><span class="role r${i.lvl}">${esc(i.role)}</span>${meter(i.lvl)}</div>
          <p>${esc(impactSentence(i))}</p>
        </div>`).join('')}</div>
    </div>`;
}
const fmtSet = (s) => s.secs ? `${s.secs}s` : `${s.reps || 0}${s.kg ? '×' + s.kg + 'kg' : ''}`;
function logSetForm(ex, timeBased) {
  const last = exerciseHistory(ex.id, 1)[0]?.sets.slice(-1)[0] || {};
  return `<form class="card-inset log-set" data-submit="ex-save-set" data-id="${ex.id}">
    <div class="row3">
      ${timeBased
        ? `<label class="field"><span>Seconds</span><input name="secs" type="number" inputmode="numeric" min="1" value="${last.secs || 30}"></label>`
        : `<label class="field"><span>Reps</span><input name="reps" type="number" inputmode="numeric" min="1" value="${last.reps || 10}" autofocus></label>
           <label class="field"><span>Weight (kg)</span><input name="kg" type="number" inputmode="decimal" step="0.5" min="0" value="${last.kg ?? ''}" placeholder="—"></label>`}
      <label class="field"><span>Sets</span><input name="count" type="number" inputmode="numeric" min="1" max="10" value="1"></label>
    </div>
    <div class="btn-row"><button class="btn btn-primary" type="submit">${icon('check')} Save</button><button class="btn btn-ghost" type="button" data-act="ex-log-cancel" data-id="${ex.id}">Cancel</button></div>
  </form>`;
}

// ================= ROUTINES =================
export const allRoutines = () => [...state.routines.map((r) => ({ ...r, custom: true })), ...ROUTINES];
export const findRoutine = (id) => allRoutines().find((r) => r.id === id);
export function routineSeconds(r) {
  const per = r.items.reduce((s, it) => {
    const mult = it.sides ? 2 : 1;
    return s + (it.secs ? it.secs * mult : (it.reps || 10) * 3.5 * mult) + (r.rest || 0);
  }, 0);
  return per * (r.rounds || 1);
}
export const routineMins = (r) => Math.max(1, Math.round(routineSeconds(r) / 60));
export const routineEquipment = (r) => [...new Set(r.items.map((i) => EX[i.ex]?.eq).filter((e) => e && e !== 'none'))];
export const itemAmount = (it) => it.secs ? `${it.secs}s${it.sides ? ' / side' : ''}` : `${it.reps} reps${it.sides ? ' / side' : ''}`;

export function routineSheet(id) {
  const r = findRoutine(id);
  if (!r) return toast('Routine not found');
  const eq = routineEquipment(r);
  openSheet(`
    <div class="sheet-pad">
      <div class="eyebrow c-${r.color || 'teal'}">${esc(cap(r.focus || 'custom'))}${r.custom ? ' · My routine' : ''}</div>
      <h2>${esc(r.name)}</h2>
      ${r.blurb ? `<p class="muted">${esc(r.blurb)}</p>` : ''}
      <div class="stat-row">
        <div><b>${routineMins(r)}</b><span>min</span></div>
        <div><b>${r.items.length}</b><span>moves</span></div>
        <div><b>${r.rounds || 1}</b><span>${(r.rounds || 1) > 1 ? 'rounds' : 'round'}</span></div>
      </div>
      <p class="muted small">${eq.length ? 'You\'ll need: ' + eq.map((e) => EQ_LABEL[e]).join(', ') : 'No equipment needed'}</p>
      <button class="btn btn-primary btn-block btn-lg" data-act="routine-start" data-id="${r.id}">${icon('play')} Start</button>
      <h3 class="sec">Moves</h3>
      <div class="ex-list">
        ${r.items.map((it) => { const ex = EX[it.ex]; return ex ? `
          <button class="ex-row" data-act="ex-open" data-id="${ex.id}">
            ${mediaHTML(ex, { size: 'sm', still: true })}
            <div class="ex-row-text"><b>${esc(ex.name)}</b><span>${esc(itemAmount(it))}</span></div>
            ${icon('right', 'chev')}
          </button>` : ''; }).join('')}
      </div>
      ${r.custom ? `<div class="btn-row"><button class="btn btn-soft" data-act="routine-edit" data-id="${r.id}">${icon('edit')} Edit</button><button class="btn btn-danger-ghost" data-act="routine-delete" data-id="${r.id}">${icon('trash')} Delete</button></div>` : ''}
    </div>`, { cls: 'sheet-tall' });
}

function addToRoutineSheet(exId) {
  const ex = EX[exId];
  openSheet(`<div class="sheet-pad">
    <h2>Add to routine</h2>
    <p class="muted">${esc(ex.name)}</p>
    <div class="list">
      ${state.routines.map((r) => `<button class="list-row" data-act="ex-add-to" data-id="${exId}" data-rid="${r.id}"><span>${esc(r.name)}</span><span class="muted small">${r.items.length} moves</span></button>`).join('')}
    </div>
    <button class="btn btn-primary btn-block" data-act="ex-add-new" data-id="${exId}">${icon('plus')} New routine with this</button>
  </div>`);
}

// ================= MEALS =================
export function mealSheet(mealId, k = todayKey()) {
  const meal = MEALS.find((m) => m.id === mealId);
  const cur = getDay(k).meals?.[mealId] || {};
  const tags = new Set(cur.tags || []);
  const recent = state.recentMeals.filter((r) => r.meal === mealId).slice(0, 6);
  openSheet(`<form class="sheet-pad" data-submit="meal-save" data-meal="${mealId}" data-date="${k}">
    <h2>${meal.icon} ${meal.name}</h2>
    <label class="field"><span>What did you have? <em>(optional)</em></span>
      <input name="note" maxlength="120" value="${esc(cur.note || '')}" placeholder="e.g. dal, rice, sabzi, curd" autocomplete="off"></label>
    ${recent.length ? `<div class="chips recent">${recent.map((r) => `<button type="button" class="chip-btn" data-act="meal-recent" data-note="${esc(r.note)}" data-tags="${esc((r.tags || []).join(','))}" data-portion="${esc(r.portion || '')}" data-src="${esc(r.src || '')}">↺ ${esc(r.note)}</button>`).join('')}</div>` : ''}
    <div class="label">How much?</div>
    <div class="seg3">
      ${[['light', '🥗', 'Light'], ['normal', '🍛', 'Just right'], ['heavy', '🍔', 'Heavy']].map(([v, e, l]) => `<label class="seg-opt"><input type="radio" name="portion" value="${v}" ${(cur.portion || 'normal') === v ? 'checked' : ''}><span><i>${e}</i>${l}</span></label>`).join('')}
    </div>
    <div class="label">It included</div>
    <div class="chips">${MEAL_TAGS.map((t) => chip('tags', t.id, `${t.icon} ${t.label}`, { checked: tags.has(t.id), cls: t.good ? 'chip-good' : 'chip-bad' })).join('')}</div>
    <div class="label">Made</div>
    <div class="chips">${[['home', '🏠 At home'], ['out', '🍽️ Eating out'], ['packaged', '📦 Packaged']].map(([v, l]) => chip('src', v, l, { type: 'radio', checked: (cur.src || 'home') === v })).join('')}</div>
    <div class="btn-row sticky-actions">
      <button class="btn btn-primary btn-grow" type="submit">${icon('check')} Save</button>
      ${cur.portion || cur.skipped ? `<button class="btn btn-danger-ghost" type="button" data-act="meal-clear" data-meal="${mealId}" data-date="${k}">${icon('trash')}</button>`
        : `<button class="btn btn-ghost" type="button" data-act="meal-skip" data-meal="${mealId}" data-date="${k}">Skipped</button>`}
    </div>
  </form>`);
}

// ================= SLEEP =================
export function sleepSheet(k = todayKey()) {
  const cur = getDay(k).sleep;
  const prev = cur || lastSleep();
  const q = cur?.quality || 3;
  const factors = new Set(cur?.factors || []);
  openSheet(`<form class="sheet-pad" data-submit="sleep-save" data-date="${k}">
    <h2>${icon('moon')} How did you sleep?</h2>
    <p class="muted">${k === todayKey() ? 'Last night' : 'Night before ' + esc(niceDate(k))}</p>
    <div class="row2">
      <label class="field"><span>Went to bed</span><input type="time" name="bed" value="${prev?.bed || '23:00'}" required></label>
      <label class="field"><span>Woke up</span><input type="time" name="wake" value="${prev?.wake || '07:00'}" required></label>
    </div>
    <div class="sleep-calc" id="sleepCalc"></div>
    <div class="label">Sleep quality</div>
    <div class="seg5">${[['😫', 'Awful'], ['😪', 'Poor'], ['😐', 'Okay'], ['🙂', 'Good'], ['😴', 'Great']].map(([e, l], i) => `<label class="seg-opt"><input type="radio" name="quality" value="${i + 1}" ${q === i + 1 ? 'checked' : ''}><span><i>${e}</i>${l}</span></label>`).join('')}</div>
    <div class="label">Anything affect it?</div>
    <div class="chips">${['Late caffeine', 'Screens in bed', 'Late meal', 'Stress', 'Worked out', 'Woke at night', 'Noise / light', 'Napped'].map((f) => chip('factors', f, f, { checked: factors.has(f) })).join('')}</div>
    <div class="btn-row sticky-actions"><button class="btn btn-primary btn-grow" type="submit">${icon('check')} Save</button>
    ${cur ? `<button class="btn btn-danger-ghost" type="button" data-act="sleep-clear" data-date="${k}">${icon('trash')}</button>` : ''}</div>
  </form>`);
  updateSleepCalc();
}
function lastSleep() {
  const keys = Object.keys(state.days).sort().reverse();
  for (const k of keys) if (state.days[k].sleep) return state.days[k].sleep;
  return null;
}
export function updateSleepCalc() {
  const f = document.querySelector('form[data-submit="sleep-save"]');
  const out = document.getElementById('sleepCalc');
  if (!f || !out) return;
  const h = sleepHours(f.bed.value, f.wake.value);
  const goal = state.profile.sleepGoal || 8;
  out.innerHTML = h == null ? '' : `<b>${fmtHours(h)}</b> of sleep <span class="${h >= goal - 0.25 ? 'ok' : 'warn'}">${h >= goal - 0.25 ? '· nice!' : `· goal ${goal}h`}</span>`;
}

// ================= MOOD =================
export function moodSheet(preset) {
  openSheet(`<form class="sheet-pad" data-submit="mood-save">
    <h2>How are you feeling?</h2>
    <div class="mood-pick">${MOODS.map((m) => `<label class="mood-opt"><input type="radio" name="score" value="${m.v}" ${preset === m.v ? 'checked' : ''} required><span><i>${m.e}</i>${m.l}</span></label>`).join('')}</div>
    <div class="label">Energy</div>
    <div class="seg5 compact">${['🪫 Drained', 'Low', 'Okay', 'Good', '⚡ High'].map((l, i) => `<label class="seg-opt"><input type="radio" name="energy" value="${i + 1}" ${i === 2 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <div class="label">Stress</div>
    <div class="seg5 compact">${['😌 Calm', 'Mild', 'Some', 'High', '🤯 Very'].map((l, i) => `<label class="seg-opt"><input type="radio" name="stress" value="${i + 1}" ${i === 1 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <div class="label">What's it about?</div>
    <div class="chips">${['Work', 'Study', 'Family', 'Friends', 'Partner', 'Health', 'Sleep', 'Exercise', 'Money', 'Weather', 'Me-time'].map((t) => chip('tags', t, t)).join('')}</div>
    <label class="field"><span>Note <em>(optional)</em></span><textarea name="note" rows="2" maxlength="500" placeholder="Anything you want to remember about today…"></textarea></label>
    <div class="btn-row sticky-actions"><button class="btn btn-primary btn-grow" type="submit">${icon('check')} Save check-in</button></div>
  </form>`);
}

// ================= ACTIVITY =================
const ACTIVITIES = [['walk', '🚶 Walk'], ['run', '🏃 Run'], ['cycle', '🚴 Cycle'], ['gym', '🏋️ Gym'], ['yoga', '🧘 Yoga'], ['sport', '🏸 Sport'], ['swim', '🏊 Swim'], ['dance', '💃 Dance'], ['other', '✨ Other']];
export const activityLabel = (t) => (ACTIVITIES.find((a) => a[0] === t)?.[1] || t);
export function activitySheet() {
  openSheet(`<form class="sheet-pad" data-submit="activity-save">
    <h2>Log activity</h2>
    <div class="chips">${ACTIVITIES.map(([v, l], i) => chip('type', v, l, { type: 'radio', checked: i === 0 })).join('')}</div>
    <div class="label">Minutes</div>
    <div class="chips">${[10, 20, 30, 45, 60, 90].map((m) => `<button type="button" class="chip-btn" data-act="set-minutes" data-m="${m}">${m}</button>`).join('')}</div>
    <label class="field"><input name="minutes" type="number" inputmode="numeric" min="1" max="600" value="30" required></label>
    <div class="label">Intensity</div>
    <div class="seg3">${[['easy', '🙂', 'Easy'], ['moderate', '😅', 'Moderate'], ['hard', '🥵', 'Hard']].map(([v, e, l]) => `<label class="seg-opt"><input type="radio" name="intensity" value="${v}" ${v === 'moderate' ? 'checked' : ''}><span><i>${e}</i>${l}</span></label>`).join('')}</div>
    <label class="field"><span>Note <em>(optional)</em></span><input name="note" maxlength="120" placeholder="e.g. evening walk in the park"></label>
    <div class="btn-row sticky-actions"><button class="btn btn-primary btn-grow" type="submit">${icon('check')} Save</button></div>
  </form>`);
}

// ================= BODY METRICS =================
export const METRIC_FIELDS = [
  ['weight', 'Weight', 'kg', 0.1], ['waist', 'Waist', 'cm', 0.5], ['hips', 'Hips', 'cm', 0.5], ['chest', 'Chest', 'cm', 0.5],
  ['arm', 'Arm', 'cm', 0.5], ['bodyFat', 'Body fat', '%', 0.1], ['rhr', 'Resting heart rate', 'bpm', 1],
];
export function metricsSheet(date = todayKey()) {
  const cur = state.metrics.find((m) => m.date === date) || {};
  openSheet(`<form class="sheet-pad" data-submit="metrics-save">
    <h2>${icon('scale')} Body measurements</h2>
    <p class="muted small">Fill in only what you track. Weigh yourself in the morning, after the bathroom, for consistent numbers.</p>
    <label class="field"><span>Date</span><input type="date" name="date" value="${date}" max="${todayKey()}" required></label>
    <div class="row2">${METRIC_FIELDS.map(([k, l, u, s]) => `<label class="field"><span>${l} <em>${u}</em></span><input name="${k}" type="number" inputmode="decimal" step="${s}" min="0" value="${cur[k] ?? ''}" ${k === 'weight' ? 'autofocus' : ''}></label>`).join('')}</div>
    <div class="btn-row sticky-actions"><button class="btn btn-primary btn-grow" type="submit">${icon('check')} Save</button></div>
  </form>`);
}

// ================= ACTIONS =================
const formVals = (form) => { const fd = new FormData(form); return { get: (k) => fd.get(k), all: (k) => fd.getAll(k) }; };

export const sheetActions = {
  'close-sheet': () => closeSheet(),
  'ex-open': (el) => exerciseSheet(el.dataset.id),
  'ex-log': (el) => updateSheet(exerciseHTML(EX[el.dataset.id], { logging: true })),
  'ex-log-cancel': (el) => updateSheet(exerciseHTML(EX[el.dataset.id])),
  'ex-save-set': (form) => {
    const id = form.dataset.id, f = formVals(form);
    const n = Math.max(1, Math.min(10, Number(f.get('count')) || 1));
    const set = f.get('secs') != null ? { secs: Number(f.get('secs')) || 30 } : { reps: Number(f.get('reps')) || 0, ...(f.get('kg') ? { kg: Number(f.get('kg')) } : {}) };
    editDay(todayKey(), (d) => {
      d.workouts ||= [];
      let w = d.workouts.find((x) => x.kind === 'sets');
      if (!w) { w = { id: uid(), at: Date.now(), kind: 'sets', name: 'Strength log', minutes: 0, items: [] }; d.workouts.push(w); }
      let it = w.items.find((i) => i.ex === id);
      if (!it) { it = { ex: id, sets: [] }; w.items.push(it); }
      for (let i = 0; i < n; i++) it.sets.push({ ...set });
      w.minutes = Math.round(w.items.reduce((s, i) => s + i.sets.length, 0) * 1.5);
    });
    toast(`Logged ${n > 1 ? n + ' sets' : 'set'} ✓`);
    updateSheet(exerciseHTML(EX[id]));
    rerender();
  },
  'ex-add-routine': (el) => addToRoutineSheet(el.dataset.id),
  'ex-add-to': (el) => {
    const r = state.routines.find((x) => x.id === el.dataset.rid);
    r.items.push(defaultItem(el.dataset.id)); save();
    closeSheet(); toast(`Added to ${r.name}`); rerender();
  },
  'ex-add-new': (el) => {
    const id = uid();
    state.routines.unshift({ id, name: 'My routine', focus: 'custom', rest: 20, rounds: 1, color: 'teal', items: [defaultItem(el.dataset.id)] });
    save(); closeSheet(); closeSheet();
    go('#/move/build/' + id);
  },

  'routine-open': (el) => routineSheet(el.dataset.id),
  'routine-start': (el) => { const r = findRoutine(el.dataset.id); closeSheet(); startRoutine(r); },
  'routine-edit': (el) => { closeSheet(); go('#/move/build/' + el.dataset.id); },
  'routine-delete': (el) => {
    if (!confirm('Delete this routine?')) return;
    state.routines = state.routines.filter((r) => r.id !== el.dataset.id); save();
    closeSheet(); toast('Routine deleted'); rerender();
  },

  'meal-open': (el) => mealSheet(el.dataset.meal, el.dataset.date || todayKey()),
  'meal-recent': (el) => {
    const f = el.closest('form');
    f.note.value = el.dataset.note;
    const tags = new Set(el.dataset.tags.split(',').filter(Boolean));
    for (const c of f.querySelectorAll('input[name=tags]')) c.checked = tags.has(c.value);
    if (el.dataset.portion) for (const r of f.querySelectorAll('input[name=portion]')) r.checked = r.value === el.dataset.portion;
    if (el.dataset.src) for (const r of f.querySelectorAll('input[name=src]')) r.checked = r.value === el.dataset.src;
  },
  'meal-save': (form) => {
    const f = formVals(form), meal = form.dataset.meal, k = form.dataset.date;
    const entry = { portion: f.get('portion') || 'normal', tags: f.all('tags'), src: f.get('src') || 'home', note: (f.get('note') || '').trim(), at: Date.now() };
    editDay(k, (d) => { (d.meals ||= {})[meal] = entry; });
    if (entry.note) {
      state.recentMeals = [{ meal, note: entry.note, tags: entry.tags, portion: entry.portion, src: entry.src },
        ...state.recentMeals.filter((r) => !(r.meal === meal && r.note.toLowerCase() === entry.note.toLowerCase()))].slice(0, 40);
      save();
    }
    closeSheet(); toast('Meal logged ✓'); rerender();
  },
  'meal-skip': (el) => { editDay(el.dataset.date, (d) => { (d.meals ||= {})[el.dataset.meal] = { skipped: true, at: Date.now() }; }); closeSheet(); rerender(); },
  'meal-clear': (el) => { editDay(el.dataset.date, (d) => { if (d.meals) delete d.meals[el.dataset.meal]; }); closeSheet(); rerender(); },

  'sleep-open': (el) => sleepSheet(el.dataset.date || todayKey()),
  'sleep-save': (form) => {
    const f = formVals(form), bed = f.get('bed'), wake = f.get('wake');
    editDay(form.dataset.date, (d) => { d.sleep = { bed, wake, hours: sleepHours(bed, wake), quality: Number(f.get('quality')) || 3, factors: f.all('factors') }; });
    closeSheet(); toast('Sleep logged ✓'); rerender();
  },
  'sleep-clear': (el) => { editDay(el.dataset.date, (d) => { delete d.sleep; }); closeSheet(); rerender(); },

  'mood-open': (el) => moodSheet(el.dataset.v ? Number(el.dataset.v) : undefined),
  'mood-save': (form) => {
    const f = formVals(form);
    const entry = { at: Date.now(), score: Number(f.get('score')), energy: Number(f.get('energy')), stress: Number(f.get('stress')), tags: f.all('tags'), note: (f.get('note') || '').trim() };
    editDay(todayKey(), (d) => { (d.moods ||= []).push(entry); });
    closeSheet(); toast('Check-in saved ✓'); rerender();
  },

  'activity-open': () => activitySheet(),
  'set-minutes': (el) => { el.closest('form').minutes.value = el.dataset.m; },
  'activity-save': (form) => {
    const f = formVals(form), type = f.get('type');
    addWorkout({ kind: 'activity', type, name: activityLabel(type).replace(/^\S+\s/, ''), minutes: Number(f.get('minutes')) || 0, intensity: f.get('intensity'), note: (f.get('note') || '').trim() });
    if (type === 'yoga') autoHabit('mobility');
    if (type === 'walk') autoHabitByName('walk');
    closeSheet(); toast('Activity logged ✓'); rerender();
  },

  'metrics-open': (el) => metricsSheet(el.dataset.date),
  'metrics-save': (form) => {
    const f = formVals(form), date = f.get('date');
    const entry = { date };
    for (const [k] of METRIC_FIELDS) { const v = f.get(k); if (v !== '' && v != null) entry[k] = Number(v); }
    if (Object.keys(entry).length === 1) return toast('Enter at least one measurement');
    const i = state.metrics.findIndex((m) => m.date === date);
    if (i >= 0) state.metrics[i] = { ...state.metrics[i], ...entry }; else state.metrics.push(entry);
    sortMetrics(); save();
    closeSheet(); toast('Measurements saved ✓'); rerender();
  },
};
function autoHabitByName(word) {
  const h = state.habits.find((x) => !x.archived && x.name.toLowerCase().includes(word));
  if (h) editDay(todayKey(), (d) => { (d.habits ||= {})[h.id] = true; });
}
export { shortDate };

// ================= PLANS =================
const repNum = (r) => (typeof r === 'number' ? r : r === 'max' ? 8 : (String(r).match(/\d+/g) || [10]).map(Number).reduce((a, b, _, arr) => a + b / arr.length, 0));
/** Turn a plan day into something the guided player can run. */
export function planDayRoutine(plan, key) {
  const d = plan.days[key];
  const base = { id: `plan:${plan.id}:${key}`, planId: plan.id, dayKey: key, name: `${plan.name} · ${d.name}`, focus: plan.focus, color: plan.color };
  if (d.circuit) {
    return { ...base, rest: d.rest ?? 20, roundRest: d.roundRest ?? 60, rounds: Math.max(...d.exercises.map((e) => e.sets || 1)),
      items: d.exercises.map((e) => ({ ex: e.ex, reps: e.reps, secs: e.secs, sides: e.sides })) };
  }
  return { ...base, rest: 0, rounds: 1, items: d.exercises.map((e) => ({ ex: e.ex, reps: e.reps, secs: e.secs, sides: e.sides, sets: e.sets, rest: e.rest ?? 60 })) };
}
export function planDayMins(plan, key) {
  const d = plan.days[key];
  let s = 0;
  for (const e of d.exercises) {
    const work = (e.secs || repNum(e.reps) * 3.5) * (e.sides ? 2 : 1);
    const rest = d.circuit ? (d.rest ?? 20) : (e.rest ?? 60);
    s += (e.sets || 1) * (work + rest);
  }
  if (d.circuit) s += (Math.max(...d.exercises.map((e) => e.sets || 1)) - 1) * (d.roundRest ?? 60);
  return Math.max(5, Math.round(s / 60 / 5) * 5);
}
export const setsReps = (e) => `${e.sets} × ${e.secs ? e.secs + 's' : e.reps === 'max' ? 'max reps' : e.reps}${e.sides ? ' / side' : ''}`;
