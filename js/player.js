// Full-screen guided routine player.
import { state, save, addWorkout, autoHabit, editDay, todayKey } from './store.js';
import { esc, icon, mediaHTML, hydrateMedia, fmtSecs, beep, say, buzz, toast, EX, MOODS } from './ui.js';
import { rerender } from './router.js';

let P = null;
let wakeLock = null;
const READY = 5, SWITCH = 5;

export function startRoutine(r) {
  if (!r) return;
  const steps = [];
  const rounds = r.rounds || 1;
  for (let round = 1; round <= rounds; round++) {
    r.items.forEach((it, idx) => {
      const ex = EX[it.ex];
      if (!ex) return;
      const sets = it.sets || 1;
      for (let s = 1; s <= sets; s++) {
        const setLbl = sets > 1 ? `Set ${s} of ${sets}` : '';
        const join = (a, b) => [a, b].filter(Boolean).join(' · ');
        // rest after this step: per-item rest, or the round rest after the last move of a circuit round
        const rest = idx === r.items.length - 1 && r.roundRest && round < rounds ? r.roundRest : (it.rest ?? r.rest ?? 0);
        if (it.secs && it.sides) {
          steps.push({ ex, secs: it.secs, label: join(setLbl, 'Left side'), round, rest: 0 });
          steps.push({ ex, secs: it.secs, label: join(setLbl, 'Right side'), round, sideSwitch: true, rest });
        } else {
          steps.push({ ex, secs: it.secs || null, reps: it.reps || null, label: join(setLbl, it.reps && it.sides ? 'each side' : ''), round, rest });
        }
      }
    });
  }
  if (!steps.length) return toast('This routine has no moves yet');
  P = { r, steps, i: 0, phase: 'ready', endAt: 0, remaining: READY, paused: false, startedAt: Date.now(), pausedMs: 0, pauseStart: 0, completed: new Set(), lastSec: null };
  const el = document.createElement('div');
  el.id = 'player';
  el.className = 'player';
  document.body.append(el);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => el.classList.add('open'));
  requestWakeLock();
  setPhase('ready', READY);
  if (state.settings.voice) say(`Get ready. First up: ${steps[0].ex.name}`);
  P.timer = setInterval(tick, 200);
  document.addEventListener('keydown', onKey);
}

async function requestWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
}
document.addEventListener('visibilitychange', () => { if (P && document.visibilityState === 'visible') requestWakeLock(); });

function setPhase(phase, secs) {
  P.phase = phase;
  P.phaseTotal = secs ?? 0;
  P.remaining = secs ?? 0;
  P.endAt = secs != null && !P.paused ? Date.now() + secs * 1000 : 0;
  P.elapsedStart = Date.now();
  P.lastSec = null;
  render();
}

function cur() { return P.steps[P.i]; }
function nextStep() { return P.steps[P.i + 1]; }

function tick() {
  if (!P || P.paused) return;
  const now = Date.now();
  if (P.phase === 'work' && !cur().secs) { // rep-based: show elapsed
    const t = document.getElementById('pBig');
    if (t) t.dataset.elapsed = fmtSecs((now - P.elapsedStart) / 1000);
    return;
  }
  if (!P.endAt) return;
  const left = Math.max(0, (P.endAt - now) / 1000);
  P.remaining = left;
  const sec = Math.ceil(left);
  if (sec !== P.lastSec) {
    P.lastSec = sec;
    if (sec <= 3 && sec > 0 && state.settings.sound) beep(660, 0.1);
  }
  updateTimer();
  if (left <= 0) advance();
}

function advance() {
  const s = cur();
  if (P.phase === 'ready' || P.phase === 'rest') {
    if (state.settings.sound) beep(990, 0.25, 0.2);
    buzz(60);
    setPhase('work', s.secs || null);
    if (state.settings.voice) say(s.secs ? 'Go' : `${s.reps} reps. Tap done when finished.`);
    return;
  }
  if (P.phase === 'work') {
    P.completed.add(s.ex.id);
    if (P.i >= P.steps.length - 1) return finish();
    P.i++;
    const n = cur();
    const isSwitch = n.sideSwitch;
    const rest = isSwitch ? SWITCH : (s.rest ?? P.r.rest ?? 0);
    if (state.settings.sound) beep(520, 0.2);
    if (rest > 0) {
      setPhase('rest', rest);
      if (state.settings.voice) say(isSwitch ? 'Switch sides' : `Rest. Next up: ${n.ex.name}`);
    } else {
      setPhase('work', n.secs || null);
      if (state.settings.voice) say(n.ex.name);
    }
  }
}

function go(delta) {
  const i = P.i + delta;
  if (i < 0 || i >= P.steps.length) return;
  if (delta > 0 && P.phase === 'work') P.completed.add(cur().ex.id);
  P.i = i;
  setPhase('work', cur().secs || null);
  if (state.settings.voice) say(cur().ex.name);
}

function togglePause() {
  if (!P || P.phase === 'done') return;
  P.paused = !P.paused;
  if (P.paused) { P.pauseStart = Date.now(); P.endAt = 0; }
  else {
    P.pausedMs += Date.now() - P.pauseStart;
    if (P.phase !== 'work' || cur().secs) P.endAt = Date.now() + P.remaining * 1000;
    P.elapsedStart += Date.now() - P.pauseStart;
  }
  render();
}

function minutesDone() { return Math.max(1, Math.round((Date.now() - P.startedAt - P.pausedMs) / 60000)); }

function finish() {
  clearInterval(P.timer);
  P.phase = 'done';
  const mins = minutesDone();
  addWorkout({ kind: 'routine', routineId: P.r.id, name: P.r.name, minutes: mins, items: [...P.completed], ...(P.r.planId ? { planId: P.r.planId, dayKey: P.r.dayKey } : {}) });
  if (['posture', 'yoga', 'mobility'].includes(P.r.focus)) autoHabit('mobility');
  P.savedMins = mins;
  if (state.settings.sound) { beep(660, 0.15); setTimeout(() => beep(880, 0.15), 160); setTimeout(() => beep(1100, 0.3), 320); }
  if (state.settings.voice) say('Workout complete. Great job!');
  buzz([80, 60, 80]);
  render();
}

function close() {
  if (!P) return;
  if (P.phase !== 'done') {
    if (P.completed.size > 0) {
      if (!confirm('End workout? The moves you finished will be saved.')) return;
      addWorkout({ kind: 'routine', routineId: P.r.id, name: P.r.name + ' (partial)', minutes: minutesDone(), items: [...P.completed] });
      toast('Saved what you completed ✓');
    } else if (!confirm('End this workout?')) return;
  }
  clearInterval(P.timer);
  try { speechSynthesis?.cancel(); } catch {}
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
  document.removeEventListener('keydown', onKey);
  const el = document.getElementById('player');
  el?.classList.remove('open');
  setTimeout(() => el?.remove(), 250);
  if (!document.querySelector('.sheet-wrap')) document.body.classList.remove('no-scroll');
  P = null;
  rerender();
}

function onKey(e) {
  if (!P) return;
  if (e.key === ' ') { e.preventDefault(); P.phase === 'work' && !cur().secs ? advance() : togglePause(); }
  else if (e.key === 'ArrowRight') go(1);
  else if (e.key === 'ArrowLeft') go(-1);
  else if (e.key === 'Escape') close();
}

function updateTimer() {
  const big = document.getElementById('pBig');
  const bar = document.getElementById('pBar');
  if (big && P.endAt) big.textContent = fmtSecs(Math.ceil(P.remaining));
  if (bar) {
    const total = P.phaseTotal;
    bar.style.transform = `scaleX(${total ? 1 - P.remaining / total : 0})`;
  }
}

function render() {
  const el = document.getElementById('player');
  if (!el || !P) return;
  if (P.phase === 'done') {
    el.innerHTML = `
      <div class="p-done">
        <div class="p-trophy">🎉</div>
        <h2>Workout complete!</h2>
        <p class="muted">${esc(P.r.name)}</p>
        <div class="stat-row">
          <div><b>${P.savedMins}</b><span>min</span></div>
          <div><b>${P.completed.size}</b><span>moves</span></div>
          <div><b>${P.r.rounds || 1}</b><span>${(P.r.rounds || 1) > 1 ? 'rounds' : 'round'}</span></div>
        </div>
        <div class="label center">How do you feel?</div>
        <div class="mood-quick">${MOODS.map((m) => `<button class="mood-btn" data-pact="mood" data-v="${m.v}" aria-label="${m.l}">${m.e}</button>`).join('')}</div>
        <button class="btn btn-primary btn-block btn-lg" data-pact="close">Done</button>
      </div>`;
    bindPlayer(el);
    return;
  }
  const s = cur();
  const showEx = s;
  const n = nextStep();
  const phaseLabel = P.paused ? 'Paused' : P.phase === 'ready' ? 'Get ready' : P.phase === 'rest' ? (s.sideSwitch ? 'Switch sides' : 'Rest — up next') : '';
  const timed = P.phase !== 'work' || s.secs;
  const amount = P.phase === 'work' && !s.secs ? `${s.reps} reps` : fmtSecs(Math.ceil(P.remaining));
  const segs = P.steps.map((_, i) => `<i class="${i < P.i ? 'done' : i === P.i ? 'now' : ''}"></i>`).join('');
  el.innerHTML = `
    <div class="p-top">
      <button class="icon-btn" data-pact="close" aria-label="Close">${icon('x')}</button>
      <div class="p-count">${(P.r.rounds || 1) > 1 ? `Round ${s.round}/${P.r.rounds} · ` : ''}${P.i + 1} / ${P.steps.length}</div>
      <button class="icon-btn ${state.settings.voice || state.settings.sound ? '' : 'off'}" data-pact="sound" aria-label="Sound">${icon('volume')}</button>
    </div>
    <div class="p-segs">${segs}</div>
    <div class="p-media">${mediaHTML(showEx.ex, { size: 'xl' })}</div>
    <div class="p-info ${P.phase}">
      <div class="p-phase">${phaseLabel}</div>
      <h2 class="p-name" data-pact="info">${esc(showEx.ex.name)}</h2>
      <div class="p-sub">${esc(s.label || '')}</div>
      <div class="p-big ${timed ? '' : 'reps'}" id="pBig">${amount}</div>
      <div class="p-bar"><div id="pBar"></div></div>
      ${P.phase === 'work' && showEx.ex.cues[0] ? `<div class="p-cue">${icon('check')} ${esc(showEx.ex.cues[0])}</div>` : ''}
      ${P.phase === 'work' && n ? `<div class="p-next">Next: ${esc(n.ex.id === s.ex.id && n.label ? n.label : n.ex.name)}</div>` : ''}
    </div>
    <div class="p-controls">
      <button class="icon-btn lg" data-pact="prev" aria-label="Previous" ${P.i === 0 ? 'disabled' : ''}>${icon('prev')}</button>
      ${P.phase === 'work' && !s.secs && !P.paused
        ? `<button class="p-main done" data-pact="advance">${icon('check')}<span>Done</span></button>`
        : `<button class="p-main" data-pact="pause" aria-label="${P.paused ? 'Resume' : 'Pause'}">${icon(P.paused ? 'play' : 'pause')}</button>`}
      <button class="icon-btn lg" data-pact="next" aria-label="Skip">${icon('next')}</button>
    </div>`;
  hydrateMedia(el);
  updateTimer();
  bindPlayer(el);
}

function bindPlayer(el) {
  el.onclick = (e) => {
    const b = e.target.closest('[data-pact]');
    if (!b) return;
    const a = b.dataset.pact;
    if (a === 'close') close();
    else if (a === 'pause') togglePause();
    else if (a === 'advance') advance();
    else if (a === 'next') { if (P.phase === 'work') { if (P.i >= P.steps.length - 1) { P.completed.add(cur().ex.id); finish(); } else advance(); } else advance(); }
    else if (a === 'prev') go(-1);
    else if (a === 'sound') { const on = !(state.settings.voice || state.settings.sound); state.settings.voice = on; state.settings.sound = on; save(); render(); toast(on ? 'Sound on' : 'Sound off'); }
    else if (a === 'mood') {
      editDay(todayKey(), (d) => { (d.moods ||= []).push({ at: Date.now(), score: Number(b.dataset.v), energy: 3, stress: 2, tags: ['Exercise'], note: '' }); });
      toast('Mood saved ✓'); close();
    }
  };
}
