// What each muscle does and why it matters, plus how an exercise loads each one.

export const MUSCLES = {
  chest: { name: 'Chest', short: 'chest', part: 'chest', does: 'pushes your arms forward and together', why: 'Helps with pushing, lifting and carrying, and supports your shoulders.' },
  shoulders: { name: 'Shoulders (delts)', short: 'shoulders', part: 'shoulders', does: 'lift and rotate your arms in every direction', why: 'Strong, mobile shoulders make overhead reaching and carrying safer and prevent pain.' },
  biceps: { name: 'Biceps', short: 'biceps', part: 'arms', does: 'bend your elbow and turn your palm up', why: 'Used every time you pull, lift or carry something.' },
  triceps: { name: 'Triceps', short: 'triceps', part: 'arms', does: 'straighten your elbow', why: 'Powers every push — getting up off the floor, pushing doors, push-ups.' },
  forearms: { name: 'Forearms', short: 'forearms', part: 'arms', does: 'control your wrists and grip', why: 'Grip strength is linked to overall health and makes carrying easier.' },
  abdominals: { name: 'Abs & core', short: 'core', part: 'core', does: 'brace and protect your spine and transfer force between upper and lower body', why: 'A strong core supports your lower back and improves balance and posture.' },
  lats: { name: 'Lats', short: 'lats', part: 'back', does: 'pull your arms down and back', why: 'Key for pulling movements and for keeping shoulders in a healthy position.' },
  'middle back': { name: 'Upper & middle back', short: 'upper back', part: 'back', does: 'squeeze your shoulder blades together and hold you upright', why: 'The main muscles that fight rounded shoulders and slouching.' },
  'lower back': { name: 'Lower back', short: 'lower back', part: 'back', does: 'keep your spine straight when you bend and lift', why: 'Strong spinal muscles help prevent back pain from sitting and lifting.' },
  traps: { name: 'Traps', short: 'traps', part: 'back', does: 'lift, lower and steady your shoulder blades', why: 'Lower and middle traps counter "tech neck" and shoulder pain.' },
  neck: { name: 'Neck', short: 'neck', part: 'neck', does: 'hold up and move your head', why: 'Strong deep neck muscles reduce forward-head posture and neck pain.' },
  glutes: { name: 'Glutes', short: 'glutes', part: 'glutes', does: 'extend and stabilise your hips', why: 'Your body\'s biggest muscle: protects knees and lower back, powers walking, stairs and running.' },
  abductors: { name: 'Outer hips', short: 'outer hips', part: 'glutes', does: 'move your leg out to the side and keep your pelvis level', why: 'Keeps knees from caving in and improves balance.' },
  adductors: { name: 'Inner thighs', short: 'inner thighs', part: 'legs', does: 'pull your legs together and steady your hips', why: 'Support hip and knee stability, especially in squats and side-to-side moves.' },
  quadriceps: { name: 'Quads', short: 'quads', part: 'legs', does: 'straighten your knee', why: 'Protect your knees and make stairs, squats and standing up from a chair easy.' },
  hamstrings: { name: 'Hamstrings', short: 'hamstrings', part: 'legs', does: 'bend your knee and extend your hip', why: 'Balance your quads, protect your knees and help your lower back when bending.' },
  calves: { name: 'Calves', short: 'calves', part: 'calves', does: 'point your foot and push you off the ground', why: 'Power walking and running, and support your ankles and balance.' },
};

const ROLE = {
  strength: { 3: ['Main target', 'Strengthens'], 2: ['Assists', 'Also works'], 1: ['Stabilises', 'Engages to keep you steady:'] },
  cardio: { 3: ['Main target', 'Conditions'], 2: ['Assists', 'Also works'], 1: ['Stabilises', 'Engages to keep you steady:'] },
  stretch: { 3: ['Main stretch', 'Stretches & loosens'], 2: ['Also stretched', 'Gently stretches'], 1: ['Stabilises', 'Engages to keep you steady:'] },
};

/** Muscles that hold you steady during an exercise even if they aren't the target. */
function stabilisers(ex) {
  if (ex.kind === 'stretch') return [];
  const name = (ex.name + ' ' + ex.id).toLowerCase();
  const lower = ex.primary.some((m) => ['quadriceps', 'hamstrings', 'glutes'].includes(m));
  const plankish = /push-up|pushup|plank|bridge|climber|dip|bird dog|inchworm|crawl/.test(name);
  const hinge = /row|deadlift|good morning|pull-through|pull_through|swing|hinge|superman|extension/.test(name);
  const seated = /seated|lying|bench|preacher|incline|machine|concentration|pulldown|leg press|leg_press|curl/.test(name);
  const standingUpper = ['shoulders', 'biceps', 'triceps'].some((m) => ex.primary.includes(m)) && !seated;
  const out = [];
  if (lower || plankish || standingUpper || hinge || ex.kind === 'cardio') out.push('abdominals');
  if ((lower && !seated) || hinge) out.push('lower back');
  if (/push-up|pushup|plank|dip/.test(name)) out.push('shoulders');
  return out;
}

// Corrections where the source dataset under-rates a main mover (e.g. glutes in squats).
const SQUAT = { primary: ['quadriceps', 'glutes'], secondary: ['hamstrings', 'adductors', 'calves'] };
const HINGE = { primary: ['hamstrings', 'glutes'], secondary: ['lower back', 'forearms', 'adductors'] };
const FIX = {
  Bodyweight_Squat: SQUAT, Goblet_Squat: SQUAT, Dumbbell_Squat: SQUAT, Barbell_Squat: SQUAT, Leg_Press: SQUAT,
  Split_Squat_with_Dumbbells: SQUAT, Dumbbell_Rear_Lunge: SQUAT, Bodyweight_Walking_Lunge: SQUAT, Dumbbell_Step_Ups: SQUAT,
  'wall-sit': { primary: ['quadriceps'], secondary: ['glutes', 'adductors', 'calves'] },
  Romanian_Deadlift: HINGE, 'Stiff-Legged_Dumbbell_Deadlift': HINGE, 'Kettlebell_One-Legged_Deadlift': HINGE,
  Barbell_Deadlift: { primary: ['hamstrings', 'glutes', 'lower back'], secondary: ['quadriceps', 'traps', 'forearms', 'lats'] },
  Pushups: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'Incline_Push-Up': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'Push-Up_Wide': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
};

/** [{ m, lvl (1–3), role, verb, info }] sorted by level. */
export function exerciseImpact(ex) {
  const fx = FIX[ex.id];
  const primary = fx?.primary || ex.primary, secondary = fx?.secondary || ex.secondary;
  const seen = new Map();
  primary.forEach((m) => seen.set(m, 3));
  secondary.forEach((m) => { if (!seen.has(m)) seen.set(m, 2); });
  stabilisers(ex).forEach((m) => { if (!seen.has(m)) seen.set(m, 1); });
  const roles = ROLE[ex.kind] || ROLE.strength;
  return [...seen.entries()]
    .filter(([m]) => MUSCLES[m])
    .map(([m, lvl]) => ({ m, lvl, role: roles[lvl][0], verb: roles[lvl][1], info: MUSCLES[m] }))
    .sort((a, b) => b.lvl - a.lvl);
}

/** Plain-English sentence for one muscle in an exercise. */
export function impactSentence(it) {
  const { info, lvl, verb } = it;
  if (lvl === 1) return `Keeps your ${info.short} switched on to hold your body steady and safe.`;
  return `${verb} your ${info.short}, which ${info.does}. ${info.why}`;
}

/** Short muscle list for list rows, e.g. "Quads, glutes, hamstrings". */
export function muscleSummary(ex, n = 3) {
  const fx = FIX[ex.id];
  const names = [...(fx?.primary || ex.primary), ...(fx?.secondary || ex.secondary)].filter((m, i, a) => a.indexOf(m) === i && MUSCLES[m]).map((m) => MUSCLES[m].short);
  const s = names.slice(0, n).join(', ');
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}
