import { state, save, flush, exportData, importData, resetAll, uid, DEFAULT_HABITS } from '../store.js';
import { esc, icon, toast } from '../ui.js';
import { rerender, go } from '../router.js';
import { applyTheme, installPrompt, promptInstall, layout, WEB_MIN } from '../app.js';

export function view(sub) {
  if (sub === 'habits') return habitsView();
  const p = state.profile, s = state.settings;
  return `
  <header class="top"><a class="icon-btn" href="#/today" aria-label="Back">${icon('left')}</a><h1 class="grow">Settings</h1></header>

  <form class="card" data-submit="profile-save">
    <h2>You</h2>
    <label class="field"><span>Name</span><input name="name" value="${esc(p.name)}" maxlength="30" placeholder="What should I call you?"></label>
    <div class="row2">
      <label class="field"><span>Height <em>cm</em></span><input name="heightCm" type="number" inputmode="decimal" min="100" max="250" value="${p.heightCm ?? ''}"></label>
      <label class="field"><span>Goal weight <em>kg</em></span><input name="weightGoal" type="number" inputmode="decimal" step="0.5" min="30" max="250" value="${p.weightGoal ?? ''}"></label>
    </div>
    <h2>Daily goals</h2>
    <div class="row2">
      <label class="field"><span>Water <em>glasses</em></span><input name="waterGoal" type="number" min="1" max="20" value="${p.waterGoal}"></label>
      <label class="field"><span>Glass size <em>ml</em></span><input name="glassMl" type="number" min="100" max="1000" step="50" value="${p.glassMl}"></label>
      <label class="field"><span>Sleep <em>hours</em></span><input name="sleepGoal" type="number" min="4" max="12" step="0.5" value="${p.sleepGoal}"></label>
    </div>
    <button class="btn btn-primary btn-block" type="submit">${icon('check')} Save</button>
  </form>

  <a class="card card-row" href="#/settings/habits"><span class="prompt-ic">✅</span><div><b>Habits</b><span class="muted small">${state.habits.filter((h) => !h.archived).length} active · add, rename or remove</span></div>${icon('right', 'chev')}</a>

  <div class="card">
    <h2>Preferences</h2>
    <div class="label">View</div>
    <div class="seg small">${[['auto', 'Auto'], ['mobile', '📱 Mobile'], ['web', '🖥️ Web']].map(([v, l]) => `<button class="${(s.layout || 'auto') === v ? 'on' : ''}" data-act="layout-set" data-v="${v}">${l}</button>`).join('')}</div>
    <p class="muted small">Web view is a desktop layout (sidebar, wider pages) and always uses light mode. Auto picks web view on screens ${WEB_MIN}px or wider. Now showing: <b>${layout() === 'web' ? 'Web' : 'Mobile'}</b>.</p>
    <div class="label">Theme (mobile view)</div>
    ${layout() === 'web' ? '<p class="muted small">Dark mode is available in mobile view. Web view stays light.</p>' : `<div class="seg small">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button class="${s.theme === v ? 'on' : ''}" data-act="theme" data-v="${v}">${l}</button>`).join('')}</div>`}
    <label class="switch-row"><span>Workout sounds</span><input type="checkbox" data-act="toggle" data-k="sound" ${s.sound ? 'checked' : ''}><i></i></label>
    <label class="switch-row"><span>Voice coach (reads out the next move)</span><input type="checkbox" data-act="toggle" data-k="voice" ${s.voice ? 'checked' : ''}><i></i></label>
  </div>

  <div class="card"><h2>Using it in your phone's browser</h2><p class="muted small">Just bookmark the page. Your data is saved in <b>this browser on this device</b> only — it won't appear on another phone or browser, and clearing browsing data erases it. Export a backup now and then.</p>${installPrompt() ? `<button class="btn btn-soft btn-block" data-act="install">${icon('download')} Add to home screen (optional)</button>` : ''}</div>

  <div class="card">
    <h2>Your data</h2>
    <p class="muted small">Everything is stored only on this device — nothing is uploaded. Export a backup now and then, especially before clearing your browser data or switching phones.</p>
    <div class="btn-row">
      <button class="btn btn-soft btn-grow" data-act="export">${icon('download')} Export backup</button>
      <label class="btn btn-soft btn-grow">${icon('upload')} Import<input type="file" accept=".json,application/json" data-act="noop-file" id="importFile" hidden></label>
    </div>
    <button class="btn btn-danger-ghost btn-block" data-act="reset">${icon('trash')} Erase all data</button>
  </div>

  <div class="card about">
    <h2>About</h2>
    <p class="muted small">Exercise photos and base instructions come from the open, public-domain <a class="link" href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a>. Video buttons search YouTube (including the Squat University channel) for the exercise.</p>
    <p class="muted small">This app is for general wellness, not medical advice. Check with a doctor or physiotherapist before starting if you have pain, an injury or a health condition.</p>
  </div>`;
}

function habitsView() {
  const hs = state.habits.filter((h) => !h.archived);
  const missing = DEFAULT_HABITS.filter((d) => !state.habits.some((h) => h.id === d.id && !h.archived));
  return `
  <header class="top"><a class="icon-btn" href="#/settings" aria-label="Back">${icon('left')}</a><h1 class="grow">Habits</h1></header>
  ${['body', 'mind'].map((kind) => `
    <div class="section-head"><h2>${kind === 'body' ? 'Body' : 'Mind'}</h2></div>
    <div class="card list">
      ${hs.filter((h) => h.kind === kind).map((h) => `
      <div class="habit-edit">
        <input class="emoji-in" value="${esc(h.icon)}" maxlength="4" data-hid="${h.id}" data-field="icon" aria-label="Icon">
        <input class="grow" value="${esc(h.name)}" maxlength="40" data-hid="${h.id}" data-field="name" aria-label="Habit name">
        <button class="icon-btn sm" data-act="habit-del" data-id="${h.id}" aria-label="Remove">${icon('trash')}</button>
      </div>`).join('') || '<p class="muted small">None yet.</p>'}
    </div>`).join('')}

  <form class="card" data-submit="habit-add">
    <h2>Add a habit</h2>
    <div class="habit-edit">
      <input class="emoji-in" name="icon" value="⭐" maxlength="4" aria-label="Icon">
      <input class="grow" name="name" maxlength="40" placeholder="e.g. Take vitamins, Journal, Call family" required>
    </div>
    <div class="seg small">${[['body', 'Body'], ['mind', 'Mind']].map(([v, l], i) => `<label><input type="radio" name="kind" value="${v}" ${i === 0 ? 'checked' : ''} hidden><span>${l}</span></label>`).join('')}</div>
    <button class="btn btn-primary btn-block" type="submit">${icon('plus')} Add habit</button>
  </form>

  <div class="section-head"><h2>Ideas</h2></div>
  <div class="chips">
    ${[...missing.map((d) => [d.icon, d.name, d.kind, d.id]), ['💊', 'Take vitamins', 'body'], ['🦷', 'Floss', 'body'], ['🧍', 'Stand up every hour', 'body'], ['📞', 'Call a friend or family', 'mind'], ['✍️', 'Journal', 'mind'], ['🎧', 'Learn something new', 'mind'], ['🛏️', 'In bed by 11', 'mind']]
      .filter(([, n]) => !hs.some((h) => h.name === n))
      .map(([ic, n, kind, id]) => `<button class="chip-btn" data-act="habit-idea" data-icon="${ic}" data-name="${esc(n)}" data-kind="${kind}" data-id="${id || ''}">${ic} ${esc(n)}</button>`).join('')}
  </div>
  <p class="fine">Tip: the built-in "Breathe or meditate", "Gratitude" and "Stretch or mobility" habits tick themselves when you finish a matching exercise or routine.</p>`;
}

export const actions = {
  'profile-save': (form) => {
    const fd = new FormData(form), p = state.profile;
    const num = (k) => { const v = fd.get(k); return v === '' || v == null ? null : Number(v); };
    p.name = (fd.get('name') || '').trim();
    p.heightCm = num('heightCm'); p.weightGoal = num('weightGoal');
    p.waterGoal = num('waterGoal') || 8; p.glassMl = num('glassMl') || 250; p.sleepGoal = num('sleepGoal') || 8;
    save(); toast('Saved ✓'); rerender();
  },
  theme: (el) => { state.settings.theme = el.dataset.v; save(); applyTheme(); rerender(); },
  toggle: (el) => { state.settings[el.dataset.k] = el.checked; save(); },
  install: () => promptInstall(),
  export: () => {
    flush();
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `thrive-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup downloaded');
  },
  reset: () => {
    if (!confirm('Erase ALL your data on this device? This cannot be undone. (Export a backup first if unsure.)')) return;
    resetAll(); toast('All data erased'); go('#/today'); location.reload();
  },
  'habit-del': (el) => {
    const h = state.habits.find((x) => x.id === el.dataset.id);
    if (h) h.archived = true; // keep history
    save(); rerender();
  },
  'habit-add': (form) => {
    const fd = new FormData(form);
    state.habits.push({ id: 'h-' + uid(), name: fd.get('name').trim(), icon: (fd.get('icon') || '⭐').trim(), kind: fd.get('kind') || 'body' });
    save(); toast('Habit added ✓'); rerender();
  },
  'habit-idea': (el) => {
    const old = el.dataset.id && state.habits.find((h) => h.id === el.dataset.id);
    if (old) old.archived = false;
    else state.habits.push({ id: 'h-' + uid(), name: el.dataset.name, icon: el.dataset.icon, kind: el.dataset.kind, ...(DEFAULT_HABITS.find((d) => d.name === el.dataset.name)?.link ? { link: DEFAULT_HABITS.find((d) => d.name === el.dataset.name).link } : {}) });
    save(); rerender();
  },
};

/** Inline edits of habit names/icons (called from the app's input listener). */
export function onHabitInput(input) {
  const h = state.habits.find((x) => x.id === input.dataset.hid);
  if (!h) return;
  const v = input.value.trim();
  if (v) { h[input.dataset.field] = v; save(); }
}
export async function onImportFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    if (!confirm('Replace everything on this device with this backup?')) return;
    importData(text);
    toast('Backup restored ✓');
    setTimeout(() => location.reload(), 600);
  } catch (e) { toast(e.message || 'Could not read that file'); }
  finally { input.value = ''; }
}
