// Front + back muscle map, shaded by how hard each muscle works (0–3).
const R = (m, x, y, w, h, rx = 10) => ({ m, s: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"` });
const E = (m, cx, cy, rx, ry) => ({ m, s: `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"` });

const FRONT = [
  R('neck', 89, 55, 22, 18, 7), E('shoulders', 61, 88, 17, 15), E('shoulders', 139, 88, 17, 15),
  R('chest', 71, 76, 28, 38, 11), R('chest', 101, 76, 28, 38, 11),
  R('biceps', 38, 103, 19, 54, 9.5), R('biceps', 143, 103, 19, 54, 9.5),
  R('forearms', 32, 160, 17, 58, 8.5), R('forearms', 151, 160, 17, 58, 8.5),
  R('abdominals', 75, 118, 50, 62, 13),
  R('abductors', 70, 184, 14, 30, 7), R('abductors', 116, 184, 14, 30, 7), R('adductors', 86, 184, 28, 30, 9),
  R('quadriceps', 70, 216, 28, 86, 14), R('quadriceps', 102, 216, 28, 86, 14),
  R('calves', 74, 307, 21, 72, 10), R('calves', 105, 307, 21, 72, 10),
];
const BACK = [
  R('neck', 89, 50, 22, 14, 7), E('shoulders', 61, 88, 17, 15), E('shoulders', 139, 88, 17, 15),
  R('traps', 80, 62, 40, 28, 12),
  R('lats', 71, 92, 20, 56, 10), R('lats', 109, 92, 20, 56, 10), R('middle back', 93, 92, 14, 56, 7),
  R('lower back', 77, 151, 46, 29, 11),
  R('triceps', 38, 103, 19, 54, 9.5), R('triceps', 143, 103, 19, 54, 9.5),
  R('forearms', 32, 160, 17, 58, 8.5), R('forearms', 151, 160, 17, 58, 8.5),
  R('glutes', 72, 183, 27, 34, 13), R('glutes', 101, 183, 27, 34, 13),
  R('hamstrings', 70, 220, 28, 82, 14), R('hamstrings', 102, 220, 28, 82, 14),
  R('calves', 73, 307, 22, 72, 11), R('calves', 105, 307, 22, 72, 11),
];
const base = (dx) => `<g transform="translate(${dx} 0)"><circle class="mm-base" cx="100" cy="34" r="21"/><ellipse class="mm-base" cx="85" cy="386" rx="11" ry="6"/><ellipse class="mm-base" cx="115" cy="386" rx="11" ry="6"/>`;

/** levels: { muscleKey: 1|2|3 } */
export function muscleMapSVG(levels) {
  const draw = (shapes) => shapes.map(({ m, s }) => `${s} class="mm l${levels[m] || 0}"/>`).join('');
  return `<svg class="musclemap" viewBox="20 0 340 414" role="img" aria-label="Muscles worked: front and back">
    ${base(0)}${draw(FRONT)}</g>
    ${base(180)}${draw(BACK)}</g>
    <text x="100" y="410" class="mm-label" text-anchor="middle">Front</text><text x="280" y="410" class="mm-label" text-anchor="middle">Back</text>
  </svg>`;
}
