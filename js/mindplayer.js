// Full-screen player for mind exercises: breathing, grounding, body scan, timer, and journal prompts.
import { state, editDay, todayKey, autoHabit, uid } from './store.js';
import { esc, icon, fmtSecs, beep, say, buzz, toast, ring } from './ui.js';
import { MIND_EXERCISES } from './data/mind.js';
import { rerender } from './router.js';

let M = null;
const SCALE = { in: 1, in2: 1.1, hold: null, out: 0.55, 'hold-out': null };

export function openMind(id) {
  const ex = MIND_EXERCISES.find((x) => x.id === id);
  if (!ex) return;
  M = { ex, mins: ex.mins, step: 0, timer: 0, running: false };
  const el = document.createElement('div');
  el.id = 'mind';
  el.className = 'player mind-player';
  document.body.append(el);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => el.classList.add('open'));
  el.onclick = onClick;
  el.addEventListener('submit', onSubmit);
  render();
}

function close() {
  if (!M) return;
  clearInterval(M.timer);
  try { speechSynthesis?.cancel(); } catch {}
  const el = document.getElementById('mind');
  el?.classList.remove('open');
  setTimeout(() => el?.remove(), 250);
  if (!document.querySelector('.sheet-wrap')) document.body.classList.remove('no-scroll');
  M = null;
  rerender();
}

function logSession(mins) {
  editDay(todayKey(), (d) => { (d.mind ||= []).push({ id: M.ex.id, at: Date.now(), mins }); });
  if (M.ex.link) autoHabit(M.ex.link);
}

function shell(inner, { top = true } = {}) {
  return `${top ? `<div class="p-top"><button class="icon-btn" data-m="close" aria-label="Close">${icon('x')}</button><div class="p-count">${esc(M.ex.name)}</div><span class="icon-btn" style="visibility:hidden" aria-hidden="true"></span></div>` : ''}<div class="m-body">${inner}</div>`;
}

function intro() {
  const ex = M.ex;
  const timeOpts = ex.type === 'breath' || ex.type === 'timer'
    ? `<div class="label center">How long?</div><div class="seg3 m-mins">${[1, 3, 5].map((m) => `<label class="seg-opt"><input type="radio" name="mins" value="${m}" ${m === M.mins ? 'checked' : ''} data-m="mins"><span><i>${m}</i>min</span></label>`).join('')}</div>` : '';
  return shell(`
    <div class="m-intro">
      <div class="m-emoji">${ex.emoji}</div>
      <h2>${esc(ex.name)}</h2>
      <p class="muted">${esc(ex.blurb)}</p>
      ${ex.type === 'breath' ? `<div class="m-pattern">${ex.phases.map(([l, s]) => `<span><b>${s}s</b>${esc(l)}</span>`).join('')}</div>` : ''}
      ${timeOpts}
      <button class="btn btn-mind btn-block btn-lg" data-m="start">${icon('play')} Begin</button>
    </div>`);
}

function render() {
  const el = document.getElementById('mind');
  if (!el || !M) return;
  const ex = M.ex;
  if (M.finished) {
    el.innerHTML = shell(`<div class="m-intro"><div class="m-emoji">🌿</div><h2>Nicely done</h2><p class="muted">${esc(M.finishMsg || 'Take that calm with you.')}</p><button class="btn btn-mind btn-block btn-lg" data-m="close">Finish</button></div>`);
    return;
  }
  if (ex.type === 'form') { el.innerHTML = shell(formView()); return; }
  if (!M.running) { el.innerHTML = intro(); return; }
  if (ex.type === 'breath') el.innerHTML = shell(`
    <div class="breath">
      <div class="breath-stage"><div class="breath-circle" id="bCircle"></div><div class="breath-core"><div id="bLabel">Get ready</div><div id="bCount" class="breath-count"></div></div></div>
      <div class="m-remaining" id="bLeft"></div>
      <button class="btn btn-ghost" data-m="stop">End early</button>
    </div>`);
  else if (ex.type === 'steps') el.innerHTML = shell(stepsView());
  else if (ex.type === 'timed') el.innerHTML = shell(timedView());
  else if (ex.type === 'timer') el.innerHTML = shell(`
    <div class="breath">
      <div id="tRing"></div>
      <p class="m-prompt" id="tPrompt">${esc(ex.prompts[0])}</p>
      <button class="btn btn-ghost" data-m="stop">End early</button>
    </div>`);
}

// ---------- breathing ----------
function startBreath() {
  const phases = M.ex.phases;
  const total = M.mins * 60;
  const start = Date.now() + 3000; // 3s lead-in
  const cycle = phases.reduce((s, p) => s + p[1], 0);
  const endT = Math.max(1, Math.round(total / cycle)) * cycle; // always end on a full breath
  let lastIdx = -1, scale = 0.55;
  const circle = document.getElementById('bCircle');
  circle.style.transform = `scale(${scale})`;
  M.timer = setInterval(() => {
    const now = Date.now();
    const label = document.getElementById('bLabel'), count = document.getElementById('bCount'), left = document.getElementById('bLeft');
    if (!label) return;
    if (now < start) { label.textContent = 'Get ready'; count.textContent = Math.ceil((start - now) / 1000); return; }
    const t = (now - start) / 1000;
    if (t >= endT) return endBreath();
    const { idx, into } = phaseAt(t % cycle);
    const [name, secs, kind] = phases[idx];
    if (idx !== lastIdx) {
      lastIdx = idx;
      const s = SCALE[kind];
      circle.style.transitionDuration = `${secs}s`;
      if (s != null) { scale = s; circle.style.transform = `scale(${scale})`; }
      circle.dataset.kind = kind;
      label.textContent = name;
      if (state.settings.sound) beep(kind.startsWith('in') ? 520 : kind === 'out' ? 392 : 440, 0.12, 0.06);
    }
    count.textContent = Math.max(1, Math.ceil(secs - into));
    left.textContent = `${fmtSecs(endT - t)} left`;
  }, 100);
  function phaseAt(tc) {
    let acc = 0;
    for (let i = 0; i < phases.length; i++) { if (tc < acc + phases[i][1]) return { idx: i, into: tc - acc }; acc += phases[i][1]; }
    return { idx: 0, into: 0 };
  }
}
function endBreath() {
  clearInterval(M.timer);
  logSession(M.mins);
  if (state.settings.sound) beep(660, 0.4, 0.1);
  buzz(60);
  M.finished = true;
  M.finishMsg = 'Notice how your body feels now compared with a few minutes ago.';
  render();
}

// ---------- grounding steps ----------
function stepsView() {
  const steps = M.ex.steps, s = steps[M.step], last = M.step === steps.length - 1;
  return `<div class="m-steps">
    <div class="dots">${steps.map((_, i) => `<i class="${i <= M.step ? 'on' : ''}"></i>`).join('')}</div>
    <div class="m-card"><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div>
    <div class="btn-row center">
      ${M.step > 0 ? `<button class="btn btn-ghost" data-m="back">${icon('left')} Back</button>` : ''}
      <button class="btn btn-mind btn-lg" data-m="${last ? 'finish-steps' : 'next'}">${last ? 'Finish' : 'Next'} ${last ? '' : icon('right')}</button>
    </div>
  </div>`;
}

// ---------- body scan (auto-advancing) ----------
function timedView() {
  const steps = M.ex.steps, [title, text] = steps[M.step];
  return `<div class="m-steps">
    <div class="dots">${steps.map((_, i) => `<i class="${i <= M.step ? 'on' : ''}"></i>`).join('')}</div>
    <div class="m-card"><div class="eyebrow">Focus on</div><h2>${esc(title)}</h2><p>${esc(text)}</p></div>
    <div class="m-remaining" id="tsLeft"></div>
    <div class="btn-row center"><button class="btn btn-ghost" data-m="stop">End</button><button class="btn btn-soft" data-m="ts-next">Skip ${icon('right')}</button></div>
  </div>`;
}
function startTimed() {
  const per = (M.mins * 60) / M.ex.steps.length;
  let stepEnd = Date.now() + per * 1000;
  const speak = () => { if (state.settings.voice) { const [t, x] = M.ex.steps[M.step]; say(`${t}. ${x}`); } };
  speak();
  M.nextTimed = () => {
    if (M.step >= M.ex.steps.length - 1) { clearInterval(M.timer); logSession(M.mins); M.finished = true; render(); return; }
    M.step++; stepEnd = Date.now() + per * 1000;
    if (state.settings.sound) beep(523, 0.25, 0.05);
    render(); speak();
  };
  M.timer = setInterval(() => {
    const left = (stepEnd - Date.now()) / 1000;
    const el = document.getElementById('tsLeft');
    if (el) el.textContent = fmtSecs(left);
    if (left <= 0) M.nextTimed();
  }, 250);
}

// ---------- mindful timer ----------
function startTimer() {
  const total = M.mins * 60, start = Date.now();
  let lastPrompt = 0;
  M.timer = setInterval(() => {
    const t = (Date.now() - start) / 1000;
    const r = document.getElementById('tRing');
    if (r) r.innerHTML = ring(t / total, { size: 220, stroke: 10, color: 'var(--mind)', inner: `<div class="breath-count">${fmtSecs(total - t)}</div>` });
    const pi = Math.floor(t / 15) % M.ex.prompts.length;
    if (pi !== lastPrompt) { lastPrompt = pi; const p = document.getElementById('tPrompt'); if (p) p.textContent = M.ex.prompts[pi]; }
    if (t >= total) { clearInterval(M.timer); if (state.settings.sound) beep(660, 0.5, 0.1); logSession(M.mins); M.finished = true; render(); }
  }, 250);
}

// ---------- journal forms ----------
function formView() {
  const ex = M.ex;
  const past = Object.keys(state.days).reduce((n, k) => n + (state.days[k].journal || []).filter((j) => j.type === ex.id).length, 0);
  return `<form class="m-form" data-mform="1">
    <div class="m-emoji sm">${ex.emoji}</div>
    <h2>${esc(ex.name)}</h2>
    <p class="muted">${esc(ex.blurb)}</p>
    ${ex.fields.map(([k, label, big]) => `<label class="field"><span>${esc(label)}</span><textarea name="${k}" rows="${big ? 6 : 2}" maxlength="2000"></textarea></label>`).join('')}
    <button class="btn btn-mind btn-block btn-lg" type="submit">${icon('check')} Save to journal</button>
    ${past ? `<p class="muted small center">You've done this ${past} time${past === 1 ? '' : 's'} before.</p>` : ''}
  </form>`;
}
function onSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target), data = {};
  for (const [k] of M.ex.fields) { const v = (fd.get(k) || '').trim(); if (v) data[k] = v; }
  if (!Object.keys(data).length) return toast('Write at least one line');
  editDay(todayKey(), (d) => { (d.journal ||= []).push({ id: uid(), at: Date.now(), type: M.ex.id, data }); });
  if (M.ex.link) autoHabit(M.ex.link);
  M.finished = true;
  M.finishMsg = 'Saved to your journal. You can read it any time in the Mind tab.';
  render();
}

function onClick(e) {
  const b = e.target.closest('[data-m]');
  if (!b || !M) return;
  const a = b.dataset.m;
  if (a === 'close') return close();
  if (a === 'mins') { M.mins = Number(b.value); return; }
  if (a === 'start') {
    M.running = true; M.step = 0; render();
    if (M.ex.type === 'breath') startBreath();
    else if (M.ex.type === 'timed') startTimed();
    else if (M.ex.type === 'timer') startTimer();
    return;
  }
  if (a === 'stop') { clearInterval(M.timer); logSession(1); M.finished = true; render(); return; }
  if (a === 'next') { M.step++; render(); return; }
  if (a === 'back') { M.step = Math.max(0, M.step - 1); render(); return; }
  if (a === 'finish-steps') { logSession(M.ex.mins); M.finished = true; render(); return; }
  if (a === 'ts-next') { M.nextTimed?.(); }
}
