# Thrive — personal health & wellness app

A private, offline-first web app (PWA) for one person: movement & posture, simple nutrition, sleep, mood and mental fitness. No accounts, no servers — all data lives in your browser on your device.

## Use it

**Live:** https://divyansh-git-max.github.io/thrive-wellness/ — open it in your phone's browser and bookmark it. Data is stored in that browser only; export backups from Settings.

## Run it locally

Double-click **`start.bat`** (or run `node server.mjs`) and open <http://localhost:5173>.
Keep the window open while you use it. Requires Node.js (already installed).

- `node server.mjs --lan` also serves it to your phone on the same Wi-Fi (`http://<pc-ip>:5173`). Installing to the home screen and offline mode need HTTPS on other devices — host it (e.g. GitHub Pages / Netlify) for that.

## What's inside

| Tab | What it does |
| --- | --- |
| **Today** | Glance rings (water, active minutes, habits, mood), daily tip, suggested routine, quick water/meals/habits, sleep & mood prompts |
| **Move** | Tappable body map → exercises per body part; each exercise shows a front/back muscle map of what it works (main target / assists / stabilises) with plain-English explanations, animated form demo, steps, cues, mistakes and Squat University / YouTube video search; **8 weekly plans** (sets × reps × rest, weekly schedule, follow a plan and Today shows the day's workout); 10 guided routines + your own; Posture & Yoga; workout log |
| **Nourish** | Water, meals by portion + what they included (no gram counting), plate check, caffeine, weekly charts. **Food guide**: 60+ everyday foods with protein/carbs/fat/fibre and key vitamins & minerals, filtered by goal (hair, skin, muscle, energy, bones, immunity, heart, gut, eyes, brain, weight loss, sleep) and diet, plus a nutrient guide |
| **Mind** | Mood check-ins, sleep log, breathing (box, 4-7-8, physiological sigh, coherent), 5-4-3-2-1 grounding, body scan, mindful minute, gratitude, CBT reframe, brain dump, journal |
| **Progress** | 7/30-day charts, body measurements (weight, waist…) with BMI, habit streaks & heatmaps |

Settings: name, height, goals, habit editor, **view (Auto / Mobile / Web)**, theme, workout sound/voice, **export / import backup**, erase data.

**Views:** *Mobile* is the phone layout (light, dark or auto theme). *Web* is a desktop layout with a sidebar, two-column cards and centred dialogs, and is always light. *Auto* picks Web on screens 1000px or wider. Switch any time from the sidebar, the Today header or Settings.

**Web view design** (`css/web.css`): calm, editorial system — Jost for UI and Source Serif 4 for page titles (both self-hosted in `fonts/`, SIL OFL), one accent colour (#008254) with a mint tint ladder, thin 1px lines instead of shadows, near-square corners (2/4/8/16px), Phosphor bold icons (MIT, built by `tools/build-icons.mjs`), 236px side panel that stacks on top below 960px, skip link and 2px focus ring, reduced-motion support. Mobile view keeps its own look.

**Food data:** checked against USDA FoodData Central (SR Legacy) — macros and listed vitamins/minerals match within rounding. Indian foods not in USDA (paneer, soya chunks, amla, ragi, roti) use IFCT-based figures and are labelled approximate; whey uses typical label values. Each food shows its source. Health tips were checked against published research and worded to match the strength of the evidence.

## Project layout

```
index.html, manifest.webmanifest, sw.js, precache.js   app shell, PWA, offline cache
css/styles.css                                          mobile design system (light + dark)
css/web.css                                             web (desktop) view design system
fonts/                                                  self-hosted Jost + Source Serif 4
js/app.js            router, navigation, event delegation, onboarding
js/store.js          data model + localStorage persistence
js/ui.js             icons, sheets, toasts, charts, exercise media helpers
js/sheets.js         logging sheets (exercise, meal, sleep, mood, activity, body, routine)
js/player.js         guided workout player
js/mindplayer.js     breathing / grounding / journal player
js/figure.js         animated pictogram renderer (for moves without photos)
js/views/*.js        the five tabs + settings
js/data/             exercises (generated), figures, routines, mind content
assets/ex/           exercise photos (free-exercise-db, public domain)
tools/               build & test scripts (not part of the app)
```

## Making changes

- **Exercise list / cues:** edit `tools/build-exercises.mjs`, then run it with the path to free-exercise-db's `dist/exercises.json`.
- **After changing any app file, run `node tools/gen-precache.mjs`** so installed copies pick up the update (it bumps the offline cache version).
- **Publish an update:** `node tools/gen-precache.mjs`, then commit and `git push` — GitHub Pages redeploys in about a minute.
- Testing helpers (local only, not published — `seed.html` replaces your data with sample data after asking):
  `tools/phone.html?to=<route>` phone-width preview with sample data · `tools/e2e.html` automated flow test (use a fresh browser profile).

## Credits & notes

Exercise photos and base instructions: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense / public domain). Video buttons are YouTube searches, including the Squat University channel. This is a general wellness tool, not medical advice.
