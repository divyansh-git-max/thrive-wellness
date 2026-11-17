// Animated pictogram figure. Poses are described with joint angles (forward
// kinematics), so limbs keep their length while interpolating between keyframes.
// Angle convention: 0° = pointing down, 90° = forward (to the right), 180° = up, -90° = back.
import { FIGURES } from './data/figures.js';

const LEN = { torso: 52, neck: 7, head: 10, ua: 27, fa: 25, th: 36, sh: 36, foot: 10 };
const NS = 'http://www.w3.org/2000/svg';
const rad = (a) => (a * Math.PI) / 180;
const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
const step = (p, a, l) => { const d = dir(a); return [p[0] + d[0] * l, p[1] + d[1] * l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAng = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return a + d * t; };
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function blend(A, B, t) {
  const o = { x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) };
  for (const k of ['t', 'h', 'f1', 'f2']) {
    const a = A[k] ?? (k === 'h' ? A.t ?? 180 : k === 't' ? 180 : null);
    const b = B[k] ?? (k === 'h' ? B.t ?? 180 : k === 't' ? 180 : null);
    if (a != null && b != null) o[k] = lerpAng(a, b, t);
  }
  for (const k of ['a1', 'a2', 'l1', 'l2']) o[k] = [lerpAng(A[k][0], B[k][0], t), lerpAng(A[k][1], B[k][1], t)];
  return o;
}

function solve(p, front) {
  const t = p.t ?? 180, h = p.h ?? t;
  const hip = [p.x, p.y];
  const neck = step(hip, t, LEN.torso);
  const head = step(neck, h, LEN.neck + LEN.head);
  const px = -Math.cos(rad(t)), py = Math.sin(rad(t));
  const sw = front ? 14 : 0, hw = front ? 8 : 0;
  const shA = [neck[0] - px * sw, neck[1] - py * sw], shB = [neck[0] + px * sw, neck[1] + py * sw];
  const hpA = [hip[0] - px * hw, hip[1] - py * hw], hpB = [hip[0] + px * hw, hip[1] + py * hw];
  const limb = (root, ang, l1, l2) => { const m = step(root, ang[0], l1); return [root, m, step(m, ang[1], l2)]; };
  const armA = limb(shA, p.a1, LEN.ua, LEN.fa), armB = limb(shB, p.a2, LEN.ua, LEN.fa);
  const legA = limb(hpA, p.l1, LEN.th, LEN.sh), legB = limb(hpB, p.l2, LEN.th, LEN.sh);
  const fl = front ? 7 : LEN.foot;
  const footA = [legA[2], step(legA[2], p.f1 ?? (front ? -90 : 90), fl)];
  const footB = [legB[2], step(legB[2], p.f2 ?? 90, fl)];
  // eye: forward of the face (perpendicular to head "up" vector)
  const up = dir(h), fwd = [-up[1], up[0]];
  const eye = [head[0] + fwd[0] * 4 + up[0] * 2, head[1] + fwd[1] * 4 + up[1] * 2];
  return { neck, hip, head, shA, shB, hpA, hpB, armA, armB, legA, legB, footA, footB, eye };
}

const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const poly = (pts) => pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

/** Creates an SVG for figure `key` inside `host` and animates it. Returns a stop() function. */
export function mountFigure(host, key, { animate = true } = {}) {
  const F = FIGURES[key];
  if (!F) return () => {};
  const front = F.view === 'front';
  const svg = el('svg', { viewBox: F.vb || '0 0 240 200', class: 'fig', role: 'img', 'aria-label': 'Exercise demonstration' });
  // props
  const props = el('g', { class: 'fig-props' });
  if (F.wallBg) props.append(el('rect', { x: F.wallBg[0], y: F.wallBg[1], width: F.wallBg[2], height: F.wallBg[3], rx: 6, class: 'fig-wallbg' }));
  if (F.mat) props.append(el('rect', { x: F.mat[0], y: 184, width: F.mat[1] - F.mat[0], height: 5, rx: 2.5, class: 'fig-mat' }));
  props.append(el('line', { x1: -50, y1: 184, x2: 290, y2: 184, class: 'fig-floor' }));
  if (F.wall != null) props.append(el('line', { x1: F.wall, y1: 10, x2: F.wall, y2: 184, class: 'fig-wall' }));
  svg.append(props);

  const far = front ? 'fig-limb' : 'fig-limb fig-far';
  const mk = (cls) => { const e = el('polyline', { class: cls }); return e; };
  const parts = {
    legA: mk(far), footA: mk(far), armA: mk(far),
    torso: mk('fig-limb'), neckLine: mk('fig-limb'), shoulders: mk('fig-limb'), hips: mk('fig-limb'),
    legB: mk('fig-limb'), footB: mk('fig-limb'), armB: mk('fig-limb'),
  };
  const head = el('circle', { r: LEN.head, class: 'fig-head' });
  const eye = el('circle', { r: 1.6, class: 'fig-eye' });
  const order = front
    ? ['legA', 'legB', 'footA', 'footB', 'hips', 'torso', 'neckLine', 'shoulders', 'armA', 'armB']
    : ['armA', 'legA', 'footA', 'torso', 'neckLine', 'legB', 'footB', 'armB'];
  for (const k of order) svg.append(parts[k]);
  svg.append(head);
  if (!front && F.eye !== false) svg.append(eye);
  host.replaceChildren(svg);

  const draw = (pose) => {
    const s = solve(pose, front);
    parts.torso.setAttribute('points', poly([s.hip, s.neck]));
    parts.neckLine.setAttribute('points', poly([s.neck, s.head]));
    parts.shoulders.setAttribute('points', poly([s.shA, s.shB]));
    parts.hips.setAttribute('points', poly([s.hpA, s.hpB]));
    parts.armA.setAttribute('points', poly(s.armA));
    parts.armB.setAttribute('points', poly(s.armB));
    parts.legA.setAttribute('points', poly(s.legA));
    parts.legB.setAttribute('points', poly(s.legB));
    parts.footA.setAttribute('points', poly(s.footA));
    parts.footB.setAttribute('points', poly(s.footB));
    head.setAttribute('cx', s.head[0].toFixed(1)); head.setAttribute('cy', s.head[1].toFixed(1));
    eye.setAttribute('cx', s.eye[0].toFixed(1)); eye.setAttribute('cy', s.eye[1].toFixed(1));
  };

  const frames = F.frames;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduced || frames.length < 2) { draw(frames[frames.length - 1].p); return () => {}; }

  // timeline: hold frame i, then move to i+1
  const move = F.move || 1000;
  const segs = frames.map((f) => f.hold + move);
  const total = segs.reduce((a, b) => a + b, 0);
  let raf = 0, start = performance.now(), stopped = false;
  const tick = (now) => {
    if (stopped) return;
    if (!svg.isConnected) { stopped = true; return; }
    let t = (now - start) % total, i = 0;
    while (t >= segs[i]) { t -= segs[i]; i++; }
    const f = frames[i], next = frames[(i + 1) % frames.length];
    draw(t <= f.hold ? f.p : blend(f.p, next.p, ease((t - f.hold) / move)));
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
