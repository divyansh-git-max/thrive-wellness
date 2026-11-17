import { state, getDay, editDay, todayKey, addDays, lastNDays, MEALS, MEAL_TAGS, plateScore } from '../store.js';
import { esc, icon, ring, barChart, dow, niceDate, openSheet } from '../ui.js';
import { NUTRIENTS, GOALS, FOODS, DIETS, DIET_LABEL, fitsDiet, foodsFor, SOURCES } from '../data/foods.js';
import { NUTRITION_TIPS } from '../data/mind.js';
import { rerender } from '../router.js';

let viewDate = null; // null = today

function plateSummary(k) {
  const meals = Object.values(getDay(k).meals || {}).filter((m) => m && !m.skipped);
  const n = meals.length;
  const has = (t) => meals.filter((m) => (m.tags || []).includes(t)).length;
  const protein = has('protein'), plants = meals.filter((m) => (m.tags || []).some((t) => t === 'veg' || t === 'fruit')).length;
  const junk = has('fried') + has('sweet') + has('sugary'), home = meals.filter((m) => m.src === 'home').length;
  let msg;
  if (!n) msg = 'Log a meal to see how your day is shaping up.';
  else if (protein < Math.min(n, 2)) msg = 'Try adding protein to your next meal — dal, curd, paneer, eggs or chana.';
  else if (plants < Math.min(n, 2)) msg = 'Add some colour: a fruit, salad or sabzi with your next meal.';
  else if (junk >= 2) msg = 'A few treats today — that\'s fine. Balance it with a lighter, home-cooked next meal.';
  else msg = 'Nicely balanced day. Keep it up!';
  return { n, protein, plants, junk, home, msg };
}

const NAV = (sub) => `<header class="top"><h1>Nourish</h1></header>
  <nav class="seg">${[['today', 'Today'], ['foods', 'Food guide']].map(([id, l]) => `<a href="#/nourish/${id}" class="${(sub || 'today') === id ? 'on' : ''}">${l}</a>`).join('')}</nav>`;

export function view(sub, arg) {
  if (sub === 'foods') return NAV('foods') + foodsView(arg);
  const k = viewDate || todayKey(), d = getDay(k), p = state.profile;
  const water = d.water || 0, goal = p.waterGoal || 8, glass = p.glassMl || 250;
  const meals = d.meals || {};
  const s = plateSummary(k), score = plateScore(k);
  const week = lastNDays(7);
  const isToday = k === todayKey();

  return `
  ${NAV(sub)}
  <div class="day-switch">
    <button class="icon-btn" data-act="nourish-day" data-d="-1" aria-label="Previous day">${icon('left')}</button>
    <b>${esc(niceDate(k))}</b>
    <button class="icon-btn" data-act="nourish-day" data-d="1" ${isToday ? 'disabled' : ''} aria-label="Next day">${icon('right')}</button>
  </div>

  <div class="card c-water water-card">
    ${ring(water / goal, { size: 120, stroke: 11, color: 'var(--water)', inner: `<b class="big">${water}</b><span class="small muted">of ${goal}</span>` })}
    <div class="water-side">
      <h2>Water</h2>
      <p class="muted small">${water * glass} ml of ${goal * glass} ml · ${glass} ml glass</p>
      <div class="btn-row">
        <button class="btn btn-soft" data-act="water-day" data-date="${k}" data-d="-1" aria-label="Remove a glass">${icon('minus')}</button>
        <button class="btn btn-water btn-grow" data-act="water-day" data-date="${k}" data-d="1">${icon('plus')} Glass</button>
      </div>
    </div>
  </div>

  <div class="card c-eat">
    <div class="card-head"><h2>Meals</h2>${score != null ? `<span class="pill">Plate score ${score}/10</span>` : ''}</div>
    <div class="meal-list">
      ${MEALS.map((m) => { const x = meals[m.id]; return `
      <button class="meal-row ${x ? 'logged' : ''}" data-act="meal-open" data-meal="${m.id}" data-date="${k}">
        <span class="meal-ic">${m.icon}</span>
        <div class="grow">
          <b>${m.name}</b>
          <span class="small muted">${x ? (x.skipped ? 'Skipped' : esc(x.note || { light: 'Light meal', normal: 'Normal portion', heavy: 'Heavy meal' }[x.portion])) : 'Not logged yet'}</span>
          ${x && !x.skipped && (x.tags || []).length ? `<span class="tag-icons">${x.tags.map((t) => { const z = MEAL_TAGS.find((q) => q.id === t); return z ? `<span class="${z.good ? 'good' : 'bad'}" title="${z.label}">${z.icon}</span>` : ''; }).join('')}</span>` : ''}
        </div>
        ${x ? icon('edit', 'chev') : `<span class="add-dot">${icon('plus')}</span>`}
      </button>`; }).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>Plate check</h2></div>
    <div class="plate-stats">
      <div><b>${s.protein}<small>/${s.n || 0}</small></b><span>💪 meals with protein</span></div>
      <div><b>${s.plants}<small>/${s.n || 0}</small></b><span>🥦 with veg / fruit</span></div>
      <div><b>${s.home}<small>/${s.n || 0}</small></b><span>🏠 home-cooked</span></div>
      <div><b>${s.junk}</b><span>🍟 treats</span></div>
    </div>
    <p class="plate-msg">${esc(s.msg)}</p>
  </div>

  <div class="card">
    <div class="card-head"><h2>Caffeine</h2><span class="muted small">Tea · coffee · energy drinks</span></div>
    <div class="counter">
      <button class="icon-btn" data-act="caf" data-date="${k}" data-d="-1" aria-label="Less">${icon('minus')}</button>
      <b>${'☕'.repeat(Math.min(d.caffeine || 0, 8)) || '—'}</b>
      <button class="icon-btn" data-act="caf" data-date="${k}" data-d="1" aria-label="More">${icon('plus')}</button>
    </div>
    <p class="muted small">Try to have your last cup before ~2 pm for better sleep.</p>
  </div>

  <div class="card">
    <div class="card-head"><h2>This week</h2></div>
    <div class="label">Plate score</div>
    ${barChart(week.map((x) => ({ label: dow(x)[0], value: plateScore(x) || 0, color: (plateScore(x) || 0) >= 7 ? 'var(--eat)' : (plateScore(x) || 0) >= 5 ? 'var(--progress)' : 'var(--move)' })), { max: 10, h: 100 })}
    <div class="label">Water (glasses)</div>
    ${barChart(week.map((x) => ({ label: dow(x)[0], value: getDay(x).water || 0 })), { goal, color: 'var(--water)', h: 100 })}
  </div>

  <div class="section-head"><h2>Simple eating guide</h2></div>
  <div class="tips">
    ${NUTRITION_TIPS.map((t) => `<details class="tip-row"><summary>${esc(t.t)}${icon('down', 'chev')}</summary><p>${esc(t.d)}</p></details>`).join('')}
  </div>`;
}

export const actions = {
  'nourish-day': (el) => {
    const k = addDays(viewDate || todayKey(), Number(el.dataset.d));
    viewDate = k >= todayKey() ? null : k;
    rerender();
  },
  'water-day': (el) => { editDay(el.dataset.date, (d) => { d.water = Math.max(0, (d.water || 0) + Number(el.dataset.d)); }); rerender(); },
  caf: (el) => { editDay(el.dataset.date, (d) => { d.caffeine = Math.max(0, (d.caffeine || 0) + Number(el.dataset.d)); }); rerender(); },
};
export const resetNourishDate = () => { viewDate = null; };

// ================= FOOD GUIDE =================
let foodDiet = 'all';
let foodQuery = '';
const LVL_LABEL = { high: 'High', good: 'Good source', some: 'Some' };

function foodList(goal) {
  const q = foodQuery.trim().toLowerCase();
  let list = FOODS.filter((f) => fitsDiet(f, foodDiet));
  if (goal) list = list.filter((f) => f.goals.includes(goal));
  if (q) list = list.filter((f) => f.name.toLowerCase().includes(q) || f.micros.some((m) => NUTRIENTS[m.n].name.toLowerCase().includes(q)) || f.goals.some((g) => g.includes(q)));
  if (!list.length) return `<p class="muted center">No foods match.</p>`;
  return list.map((f) => `
    <button class="food-row" data-act="food-open" data-id="${f.id}">
      <span class="food-emoji">${f.emoji}</span>
      <div class="grow">
        <b>${esc(f.name)}</b>
        <span class="small muted">${esc(f.serving)} · ${f.kcal} kcal</span>
        <span class="macro-line"><i class="mp">${f.p}g protein</i><i class="mc">${f.c}g carbs</i><i class="mf">${f.f}g fat</i>${f.fiber ? `<i class="mfi">${f.fiber}g fibre</i>` : ''}</span>
        <span class="nut-chips">${f.micros.filter((m) => m.lvl !== 'some').slice(0, 4).map((m) => `<em>${esc(NUTRIENTS[m.n].name)}</em>`).join('')}</span>
      </div>
      ${icon('right', 'chev')}
    </button>`).join('');
}

function foodsView(goalId) {
  const goal = GOALS.find((g) => g.id === goalId);
  return `
  <label class="field search"><input type="search" id="foodQ" placeholder="Search: egg, iron, vitamin C…" value="${esc(foodQuery)}" autocomplete="off"></label>
  <div class="label">I want to eat for…${goal ? ' <a class="link small" href="#/nourish/foods">Show all foods</a>' : ''}</div>
  <div class="goal-grid">
    ${GOALS.map((g) => `<a class="goal-chip ${goal?.id === g.id ? 'on' : ''}" href="#/nourish/foods${goal?.id === g.id ? '' : '/' + g.id}">${g.emoji}<span>${esc(g.name)}</span></a>`).join('')}
  </div>
  <div class="chips scroll diet-chips">${DIETS.map(([id, l]) => `<button class="chip-btn ${foodDiet === id ? 'on' : ''}" data-act="food-diet" data-v="${id}">${l}</button>`).join('')}</div>
  ${goal ? `
  <div class="card goal-card">
    <div class="eyebrow">${goal.emoji} Eating for</div>
    <h2>${esc(goal.title)}</h2>
    <p class="muted">${esc(goal.why)}</p>
    <div class="label">Key nutrients — tap to learn more</div>
    <div class="nutrient-pills">${goal.nutrients.map((n) => `<button class="nutrient-pill" data-act="nutrient-open" data-id="${n}">${NUTRIENTS[n].emoji} ${esc(NUTRIENTS[n].name)}</button>`).join('')}</div>
    <div class="label">Tips</div>
    <ul class="cues good">${goal.tips.map((t) => `<li>${icon('check')}<span>${esc(t)}</span></li>`).join('')}</ul>
  </div>
  <div class="section-head"><h2>Best foods for ${esc(goal.name.toLowerCase())}</h2></div>` : `<div class="section-head"><h2>All foods</h2><span class="muted small">${FOODS.length}</span></div>`}
  <div class="food-list" id="foodList">${foodList(goal?.id)}</div>
  <div class="section-head"><h2>Nutrient guide</h2></div>
  <div class="nutrient-pills">${Object.entries(NUTRIENTS).map(([id, n]) => `<button class="nutrient-pill" data-act="nutrient-open" data-id="${id}">${n.emoji} ${esc(n.name)}</button>`).join('')}</div>
  <p class="fine">Nutrition values were checked against USDA FoodData Central; Indian foods not in USDA use IFCT-based figures and are marked approximate. "High" = 20%+ of the daily value, "Good source" = 10–19%. Health tips reflect published research but effects are usually modest. General guidance only — not medical advice.</p>`;
}

export function onFoodSearch(input) {
  foodQuery = input.value;
  const list = document.getElementById('foodList');
  const goal = location.hash.split('/')[3];
  if (list) list.innerHTML = foodList(goal && GOALS.some((g) => g.id === goal) ? goal : null);
}

function foodSheet(id) {
  const f = FOODS.find((x) => x.id === id);
  if (!f) return;
  const cal = { p: f.p * 4, c: f.c * 4, f: f.f * 9 };
  const tot = cal.p + cal.c + cal.f || 1;
  const pct = (k) => Math.round((cal[k] / tot) * 100);
  const bar = (k, label, g, cls) => `<div class="macro"><div class="macro-top"><b>${label}</b><span>${g} g${k !== 'fiber' ? ` · ${pct(k)}% of calories` : ''}</span></div><div class="macro-bar"><i class="${cls}" style="width:${k === 'fiber' ? Math.min(100, g * 10) : pct(k)}%"></i></div></div>`;
  openSheet(`<div class="sheet-pad">
    <div class="food-hero"><span class="food-emoji xl">${f.emoji}</span><div><h2>${esc(f.name)}</h2><p class="muted">${esc(f.serving)} · <span class="tag">${DIET_LABEL[f.diet]}</span></p></div></div>
    <div class="kcal"><b>${f.kcal}</b><span>kcal per serving</span></div>
    <h3 class="sec">Macros</h3>
    ${bar('p', 'Protein', f.p, 'mp')}${bar('c', 'Carbs', f.c, 'mc')}${bar('f', 'Fat', f.f, 'mf')}${bar('fiber', 'Fibre', f.fiber, 'mfi')}
    ${f.fats ? `<p class="muted small">🫒 ${esc(f.fats)}</p>` : ''}
    <h3 class="sec">Vitamins, minerals & more</h3>
    <div class="micro-list">${f.micros.map((m) => `
      <button class="micro-row" data-act="nutrient-open" data-id="${m.n}">
        <span class="micro-emoji">${NUTRIENTS[m.n].emoji}</span>
        <div class="grow"><b>${esc(NUTRIENTS[m.n].name)} <span class="lvl ${m.lvl}">${LVL_LABEL[m.lvl]}</span></b><span>${esc(m.amt)} · ${esc(NUTRIENTS[m.n].does.split('.')[0])}</span></div>
      </button>`).join('')}</div>
    <h3 class="sec">Good for</h3>
    <div class="chips">${f.goals.map((g) => { const G = GOALS.find((x) => x.id === g); return G ? `<a class="chip-btn" href="#/nourish/foods/${g}">${G.emoji} ${esc(G.name)}</a>` : ''; }).join('')}</div>
    ${f.tip ? `<div class="food-tip">💡 ${esc(f.tip)}</div>` : ''}
    <p class="fine">Source: ${esc(SOURCES[f.src])}. Brands, varieties and cooking change values a little.</p>
  </div>`, { cls: 'sheet-tall' });
}

function nutrientSheet(id) {
  const n = NUTRIENTS[id];
  if (!n) return;
  const foods = foodsFor(id).filter((f) => fitsDiet(f, foodDiet)).slice(0, 12);
  const goals = GOALS.filter((g) => g.nutrients.includes(id));
  const amountOf = (f) => { const m = f.micros.find((x) => x.n === id); return id === 'protein' ? `${f.p} g` : id === 'fiber' ? `${f.fiber} g` : id === 'carbs' ? `${f.c} g` : m?.amt || ''; };
  openSheet(`<div class="sheet-pad">
    <h2>${n.emoji} ${esc(n.name)}</h2>
    <p>${esc(n.does)}</p>
    <div class="card-inset"><div class="label" style="margin-top:0">Daily target (typical adult)</div><b>${esc(n.target)}</b></div>
    ${n.tip ? `<div class="food-tip">💡 ${esc(n.tip)}</div>` : ''}
    ${goals.length ? `<h3 class="sec">Important for</h3><div class="chips">${goals.map((g) => `<a class="chip-btn" href="#/nourish/foods/${g.id}">${g.emoji} ${esc(g.name)}</a>`).join('')}</div>` : ''}
    <h3 class="sec">Best sources${foodDiet !== 'all' ? ` (${esc(DIETS.find((d) => d[0] === foodDiet)[1].toLowerCase())})` : ''}</h3>
    <div class="food-list">${foods.map((f) => `
      <button class="food-row compact" data-act="food-open" data-id="${f.id}"><span class="food-emoji">${f.emoji}</span><div class="grow"><b>${esc(f.name)}</b><span class="small muted">${esc(amountOf(f))} per ${esc(f.serving)}</span></div>${icon('right', 'chev')}</button>`).join('') || '<p class="muted small">Plain water is the best source — plus fruit and vegetables.</p>'}</div>
  </div>`, { cls: 'sheet-tall' });
}

Object.assign(actions, {
  'food-open': (el) => foodSheet(el.dataset.id),
  'nutrient-open': (el) => nutrientSheet(el.dataset.id),
  'food-diet': (el) => { foodDiet = el.dataset.v; rerender(); },
});
