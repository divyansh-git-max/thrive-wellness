import { state, save, todayKey } from './store.js';
import { icon, hydrateMedia, closeAllSheets, sheetOpen, closeSheet, toast, openSheet, esc } from './ui.js';
import { setRenderer, route, rerender } from './router.js';
import { sheetActions, updateSleepCalc } from './sheets.js';
import * as today from './views/today.js';
import * as move from './views/move.js';
import * as nourish from './views/nourish.js';
import * as mind from './views/mind.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';

const VIEWS = { today, move, nourish, mind, progress, settings };
const NAV = [['today', 'Today', 'home'], ['move', 'Move', 'move'], ['nourish', 'Nourish', 'leaf'], ['mind', 'Mind', 'mind'], ['progress', 'Progress', 'chart']];
const ACTIONS = {
  ...sheetActions, ...today.actions, ...move.actions, ...nourish.actions, ...mind.actions, ...progress.actions, ...settings.actions,
  nav: (el) => { location.hash = el.dataset.href; },
};

const main = document.getElementById('main');
const nav = document.getElementById('nav');
function renderNav() {
  const web = document.documentElement.dataset.layout === 'web';
  nav.innerHTML = `<div class="nav-brand"><img src="icons/icon.svg" alt="" width="32" height="32"><b>Thrive</b></div>` +
    NAV.map(([id, l, ic]) => `<a href="#/${id}" data-tab="${id}">${icon(ic)}<span>${l}</span></a>`).join('') +
    `<a href="#/settings" data-tab="settings" class="nav-settings">${icon('gear')}<span>Settings</span></a>` +
    `<button class="nav-toggle" data-act="layout-toggle">${icon(web ? 'phone' : 'monitor')}<span>${web ? 'Switch to mobile view' : 'Switch to web view'}</span></button>`;
  const [name] = route();
  for (const a of nav.querySelectorAll('a')) a.classList.toggle('on', a.dataset.tab === (VIEWS[name] ? name : 'today'));
}

let lastRoute = '';
let lastDay = todayKey();
function render({ keepScroll = false } = {}) {
  const [name, ...args] = route();
  const v = VIEWS[name] || today;
  const key = location.hash;
  const y = window.scrollY;
  main.innerHTML = v.view(...args);
  hydrateMedia(main);
  for (const a of nav.querySelectorAll('a')) a.classList.toggle('on', a.dataset.tab === (VIEWS[name] ? name : 'today'));
  document.title = { today: 'Thrive', move: 'Move · Thrive', nourish: 'Nourish · Thrive', mind: 'Mind · Thrive', progress: 'Progress · Thrive', settings: 'Settings · Thrive' }[name] || 'Thrive';
  if (keepScroll && key === lastRoute) window.scrollTo(0, y); else window.scrollTo(0, 0);
  lastRoute = key;
}
setRenderer(render);

window.addEventListener('hashchange', () => { if (sheetOpen()) closeAllSheets(); render(); });

// ---------- event delegation ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.closest('#player, #mind')) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
  fn(el, e);
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-submit]');
  if (!form) return;
  e.preventDefault();
  ACTIONS[form.dataset.submit]?.(form, e);
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.form?.dataset.submit === 'sleep-save') updateSleepCalc();
  if (t.id === 'pickQ') move.onPickerInput(t);
  if (t.id === 'foodQ') nourish.onFoodSearch(t);
  if (t.dataset.hid) settings.onHabitInput(t);
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'importFile') settings.onImportFile(e.target);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetOpen() && !document.getElementById('player') && !document.getElementById('mind')) closeSheet();
});

// Re-render when the date changes (app left open overnight) or when coming back to the tab.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && todayKey() !== lastDay) { lastDay = todayKey(); nourish.resetNourishDate(); rerender(); }
});
window.addEventListener('storage-error', () => toast('Storage is full — export a backup and clear old data.'));

// ---------- layout (web vs mobile) & theme ----------
export const WEB_MIN = 1000; // auto mode picks web view at this width or wider
/** 'web' or 'mobile'. Web view is the desktop layout and is always light. */
export function layout() {
  const l = state.settings.layout || 'auto';
  return l === 'auto' ? (window.innerWidth >= WEB_MIN ? 'web' : 'mobile') : l;
}
export function applyTheme() {
  const web = layout() === 'web';
  document.documentElement.dataset.layout = web ? 'web' : 'mobile';
  const t = web ? 'light' : state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#121716' : '#F6F5F1');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
applyTheme();
renderNav();
let lastLayout = layout();
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { const l = layout(); if (l !== lastLayout) { lastLayout = l; applyTheme(); renderNav(); rerender(); } }, 150);
});
ACTIONS['layout-toggle'] = () => {
  state.settings.layout = layout() === 'web' ? 'mobile' : 'web';
  save(); lastLayout = layout(); applyTheme(); renderNav(); render();
  toast(layout() === 'web' ? 'Web view (light mode)' : 'Mobile view');
};
ACTIONS['layout-set'] = (el) => {
  state.settings.layout = el.dataset.v;
  save(); lastLayout = layout(); applyTheme(); renderNav(); render();
};

// ---------- install (PWA) ----------
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
window.addEventListener('appinstalled', () => { deferredInstall = null; toast('Installed! Find Thrive on your home screen.'); });
export const installPrompt = () => !!deferredInstall;
export async function promptInstall() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice.catch(() => {});
  deferredInstall = null;
  rerender();
}
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration failed', e)));
}

// ---------- first run ----------
function onboarding() {
  openSheet(`<form class="sheet-pad onboard" data-submit="onboard-save">
    <div class="onboard-hero">🌿</div>
    <h2>Welcome to Thrive</h2>
    <p class="muted">Your personal space for movement, food, sleep and a calmer mind. Everything stays private on this device.</p>
    <label class="field"><span>What should I call you?</span><input name="name" maxlength="30" placeholder="Your name" autofocus></label>
    <div class="row2">
      <label class="field"><span>Height <em>cm</em> (optional)</span><input name="heightCm" type="number" inputmode="decimal" min="100" max="250"></label>
      <label class="field"><span>Weight <em>kg</em> (optional)</span><input name="weight" type="number" inputmode="decimal" step="0.1" min="25" max="300"></label>
    </div>
    <button class="btn btn-primary btn-block btn-lg" type="submit">Let's go</button>
  </form>`, { onClose: () => { state.profile.onboarded = true; save(); } });
}
ACTIONS['onboard-save'] = (form) => {
  const fd = new FormData(form);
  state.profile.name = (fd.get('name') || '').trim();
  if (fd.get('heightCm')) state.profile.heightCm = Number(fd.get('heightCm'));
  if (fd.get('weight')) state.metrics.push({ date: todayKey(), weight: Number(fd.get('weight')) });
  state.profile.onboarded = true;
  save();
  closeSheet();
  render();
  toast(state.profile.name ? `Hi ${state.profile.name}! 👋` : 'Welcome! 👋');
};

// Ask the browser not to evict our data under storage pressure.
try { navigator.storage?.persist?.().catch(() => {}); } catch {}

render();
if (!state.profile.onboarded) setTimeout(onboarding, 300);
