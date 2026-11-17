import { state, getDay, editDay, todayKey, lastNDays, latestMood } from '../store.js';
import { esc, icon, MOODS, moodEmoji, fmtHours, fmtTime, barChart, dow, niceDate } from '../ui.js';
import { MIND_EXERCISES, MENTAL_TIPS, SLEEP_TIPS } from '../data/mind.js';
import { openMind } from '../mindplayer.js';
import { rerender } from '../router.js';

const JOURNAL_LABEL = { gratitude: '🙏 Gratitude', reframe: '🔄 Reframe', braindump: '🗒️ Brain dump', mood: '💬 Mood note' };
const FIELD_LABEL = { g1: 'Good thing', g2: 'Thankful for', g3: 'Small pleasure', situation: 'What happened', thought: 'Thought', evidence: 'Evidence', balanced: 'Balanced view', dump: 'On my mind', next: 'Next step' };

function journalEntries(limit = 100) {
  const out = [];
  for (const k of Object.keys(state.days).sort().reverse()) {
    const d = state.days[k];
    for (const j of [...(d.journal || [])].reverse()) out.push({ k, ...j });
    for (const m of [...(d.moods || [])].reverse()) if (m.note) out.push({ k, at: m.at, type: 'mood', data: { note: m.note }, mood: m.score });
    if (out.length >= limit) break;
  }
  return out.sort((a, b) => b.at - a.at).slice(0, limit);
}
const entryHTML = (e) => `
  <div class="journal-entry">
    <div class="journal-meta"><span>${JOURNAL_LABEL[e.type] || e.type}${e.mood ? ' ' + moodEmoji(e.mood) : ''}</span><span class="muted small">${esc(niceDate(e.k))} · ${fmtTime(e.at)}</span></div>
    ${Object.entries(e.data).map(([f, v]) => `<p>${FIELD_LABEL[f] ? `<b>${FIELD_LABEL[f]}:</b> ` : ''}${esc(v)}</p>`).join('')}
    ${e.id ? `<button class="icon-btn sm journal-del" data-act="journal-del" data-date="${e.k}" data-id="${e.id}" aria-label="Delete entry">${icon('trash')}</button>` : ''}
  </div>`;

export function view(sub) {
  if (sub === 'journal') return journalView();
  const k = todayKey(), d = getDay(k);
  const mood = latestMood(k);
  const nights = lastNDays(7);
  const sleepGoal = state.profile.sleepGoal || 8;
  const avgSleep = (() => { const v = nights.map((x) => getDay(x).sleep?.hours).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; })();
  const tip = MENTAL_TIPS[Math.floor(Date.now() / 864e5) % MENTAL_TIPS.length];
  const entries = journalEntries(3);
  const sessions = (d.mind || []).length;
  const breath = MIND_EXERCISES.filter((x) => x.type === 'breath');
  const other = MIND_EXERCISES.filter((x) => x.type !== 'breath');
  const card = (x) => `<button class="mind-card" data-act="mind-open" data-id="${x.id}"><span class="mind-emoji">${x.emoji}</span><b>${esc(x.name)}</b><span class="muted small">${x.mins} min</span></button>`;

  return `
  <header class="top"><h1>Mind</h1><a class="icon-btn" href="#/mind/journal" aria-label="Journal">${icon('book')}</a></header>

  <div class="card c-mind">
    <div class="card-head"><h2>Check-in</h2>${mood ? `<span class="muted small">Last: ${fmtTime(mood.at)}</span>` : ''}</div>
    <div class="mood-quick">${MOODS.map((m) => `<button class="mood-btn ${mood?.score === m.v ? 'on' : ''}" data-act="mood-open" data-v="${m.v}" aria-label="${m.l}"><span>${m.e}</span><small>${m.l}</small></button>`).join('')}</div>
    ${mood ? `<p class="muted small">Energy ${mood.energy}/5 · Stress ${mood.stress}/5${mood.tags?.length ? ' · ' + esc(mood.tags.join(', ')) : ''}</p>` : '<p class="muted small">Tap a face to check in. Add context like energy, stress and what\'s on your mind.</p>'}
  </div>

  <div class="card c-sleep">
    <div class="card-head"><h2>Sleep</h2><button class="btn btn-soft btn-sm" data-act="sleep-open">${d.sleep ? icon('edit') + ' Edit' : icon('plus') + ' Log last night'}</button></div>
    ${d.sleep ? `<p><b class="big-inline">${fmtHours(d.sleep.hours)}</b> <span class="muted">· ${d.sleep.bed} → ${d.sleep.wake} · quality ${d.sleep.quality}/5</span></p>` : ''}
    ${barChart(nights.map((x) => ({ label: dow(x)[0], value: getDay(x).sleep?.hours || 0, color: (getDay(x).sleep?.hours || 0) >= sleepGoal - 0.25 ? 'var(--sleep)' : 'var(--sleep-soft-strong)' })), { goal: sleepGoal, max: Math.max(10, sleepGoal + 1), h: 110, fmt: fmtHours })}
    <p class="muted small">7-night average: <b>${fmtHours(avgSleep != null ? Math.round(avgSleep * 10) / 10 : null)}</b> · goal ${sleepGoal}h</p>
    <details class="tip-row inline"><summary>Better sleep basics${icon('down', 'chev')}</summary><ul class="dots-list">${SLEEP_TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>
  </div>

  <div class="section-head"><h2>Breathe</h2>${sessions ? `<span class="pill">${sessions} today</span>` : ''}</div>
  <div class="mind-grid">${breath.map(card).join('')}</div>

  <div class="section-head"><h2>Calm & clear your mind</h2></div>
  <div class="mind-grid">${other.map(card).join('')}</div>

  <div class="card tip">
    <div class="eyebrow">Mental fitness tip</div>
    <p>${esc(tip)}</p>
  </div>

  <div class="section-head"><h2>Journal</h2><a class="link" href="#/mind/journal">See all</a></div>
  ${entries.length ? `<div class="card list">${entries.map(entryHTML).join('')}</div>` : `<p class="muted small">Gratitude notes, reframes, brain dumps and mood notes will appear here.</p>`}
  <p class="fine">This app supports everyday wellbeing; it isn't a substitute for professional help. If you're struggling, please reach out to someone you trust or a mental-health professional.</p>`;
}

function journalView() {
  const entries = journalEntries(300);
  return `
  <header class="top"><a class="icon-btn" href="#/mind" aria-label="Back">${icon('left')}</a><h1 class="grow">Journal</h1></header>
  <div class="btn-row">
    <button class="btn btn-soft btn-grow" data-act="mind-open" data-id="gratitude">🙏 Gratitude</button>
    <button class="btn btn-soft btn-grow" data-act="mind-open" data-id="reframe">🔄 Reframe</button>
    <button class="btn btn-soft btn-grow" data-act="mind-open" data-id="braindump">🗒️ Dump</button>
  </div>
  ${entries.length ? `<div class="card list">${entries.map(entryHTML).join('')}</div>` : `<div class="empty"><div class="empty-ic">📓</div><p>Your journal is empty. Start with three good things from today.</p></div>`}`;
}

export const actions = {
  'mind-open': (el) => openMind(el.dataset.id),
  'journal-del': (el) => {
    if (!confirm('Delete this journal entry?')) return;
    editDay(el.dataset.date, (d) => { d.journal = (d.journal || []).filter((j) => j.id !== el.dataset.id); });
    rerender();
  },
};
