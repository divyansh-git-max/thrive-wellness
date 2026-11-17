// Builds js/data/exercises.js from the public-domain free-exercise-db dataset
// (https://github.com/yuhonas/free-exercise-db, Unlicense) plus hand-written
// form cues, and downloads the start/end photos used for the form animation.
//
// Usage: node tools/build-exercises.mjs <path-to-exercises.json>
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATASET = process.argv[2];
if (!DATASET) { console.error('Pass the path to exercises.json'); process.exit(1); }
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

// [datasetId, bodyParts, overrides]
// overrides: name, kind (strength|stretch|cardio), tags (posture|yoga), eq, cues, mistakes, q (video search)
const CURATED = [
  // ---------- CHEST ----------
  ['Pushups', ['chest', 'arms'], { name: 'Push-Up',
    cues: ['Hands just outside shoulder-width, body in one straight line head to heels', 'Squeeze glutes and brace abs so hips don\'t sag', 'Lower until your chest is a fist from the floor, elbows about 45° from your body'],
    mistakes: ['Elbows flared straight out to the sides', 'Hips sagging or butt piking up', 'Half reps that stop short'] }],
  ['Incline_Push-Up', ['chest', 'arms'], { name: 'Incline Push-Up',
    cues: ['Hands on a bench, bed edge or kitchen counter — the higher, the easier', 'Keep the plank line and bring your chest to the edge'] }],
  ['Push-Ups_With_Feet_Elevated', ['chest', 'shoulders'], { name: 'Decline Push-Up',
    cues: ['Feet on a step or bench — harder than a regular push-up', 'Keep hips in line; don\'t let them pike up'] }],
  ['Push-Up_Wide', ['chest'], { name: 'Wide Push-Up', cues: ['Hands wider than shoulders, fingers slightly turned out', 'Control the lowering for 2 seconds'] }],
  ['Dumbbell_Bench_Press', ['chest', 'arms'], { cues: ['Pull shoulder blades back and down into the bench', 'Lower to mid-chest with forearms vertical', 'Press up and slightly in — don\'t clank the weights'], mistakes: ['Bouncing the weights off the chest', 'Lifting hips off the bench'] }],
  ['Incline_Dumbbell_Press', ['chest', 'shoulders'], { cues: ['Bench at 30–45°', 'Lower to upper chest, elbows slightly tucked'] }],
  ['Dumbbell_Flyes', ['chest'], { name: 'Dumbbell Fly', cues: ['Soft bend in the elbows the whole time', 'Open the arms in a wide arc until you feel a chest stretch', 'Squeeze the chest to bring them back together'], mistakes: ['Going too heavy and turning it into a press', 'Dropping arms below shoulder level'] }],
  ['Barbell_Bench_Press_-_Medium_Grip', ['chest', 'arms'], { name: 'Barbell Bench Press', cues: ['Feet planted, slight arch, shoulder blades pinned', 'Bar touches lower chest, elbows ~45–60°', 'Use a spotter or safety pins'] }],
  ['Cable_Crossover', ['chest'], { cues: ['Slight forward lean, soft elbows', 'Bring handles together in front of your lower chest and squeeze'] }],
  ['Dips_-_Chest_Version', ['chest', 'arms'], { name: 'Chest Dip', cues: ['Lean the torso forward slightly', 'Lower until shoulders are just below elbows — no deeper if it pinches'] }],

  // ---------- BACK ----------
  ['Pullups', ['back', 'arms'], { name: 'Pull-Up', eq: 'bar', cues: ['Start from a dead hang; pull shoulder blades down first', 'Drive elbows down toward your ribs', 'Chin over the bar without craning your neck'], mistakes: ['Kipping/swinging', 'Half reps from a bent-arm start'] }],
  ['Chin-Up', ['back', 'arms'], { eq: 'bar', cues: ['Palms facing you, shoulder-width', 'Chest up toward the bar, lower all the way down'] }],
  ['Band_Assisted_Pull-Up', ['back', 'arms'], { name: 'Band-Assisted Pull-Up', cues: ['Thicker band = more help', 'Same technique as a full pull-up — full range'] }],
  ['Inverted_Row', ['back', 'arms'], { name: 'Inverted Row', tags: ['posture'], cues: ['At home: use a sturdy table edge or a low bar', 'Body rigid like a plank; pull your chest to the bar', 'Squeeze shoulder blades together at the top'], mistakes: ['Hips sagging', 'Shrugging shoulders to ears'] }],
  ['One-Arm_Dumbbell_Row', ['back', 'arms'], { tags: ['posture'], cues: ['Flat back, one hand and knee on a bench', 'Pull the dumbbell toward your hip, not your chest', 'Pause and squeeze your shoulder blade at the top'], mistakes: ['Twisting the torso to heave the weight', 'Rounding the back'] }],
  ['Bent_Over_Two-Dumbbell_Row', ['back'], { name: 'Bent-Over Dumbbell Row', tags: ['posture'], cues: ['Hinge to ~45° with a flat back', 'Row both dumbbells to your lower ribs'] }],
  ['Bent_Over_Barbell_Row', ['back'], { name: 'Barbell Row', cues: ['Hinge with a flat back, bar hanging at knees', 'Row to the belly button, elbows back'] }],
  ['Wide-Grip_Lat_Pulldown', ['back'], { name: 'Lat Pulldown', cues: ['Slight lean back, chest up', 'Pull the bar to your upper chest, elbows down and back'], mistakes: ['Pulling behind the neck', 'Leaning way back and yanking'] }],
  ['Seated_Cable_Rows', ['back'], { name: 'Seated Cable Row', tags: ['posture'], cues: ['Sit tall, slight knee bend', 'Pull handle to your stomach, squeeze shoulder blades, slow return'] }],
  ['Superman', ['back', 'glutes'], { tags: ['posture'], cues: ['Lift arms, chest and legs a few centimetres — it\'s a small move', 'Keep your neck neutral by looking at the floor'], mistakes: ['Cranking the head up', 'Holding your breath'] }],
  ['Hyperextensions_Back_Extensions', ['back', 'glutes'], { name: 'Back Extension', cues: ['Hinge at the hips over the pad', 'Rise to a straight line — don\'t over-arch at the top'] }],
  ['Barbell_Deadlift', ['back', 'legs', 'glutes'], { name: 'Deadlift', cues: ['Bar over mid-foot, shins close to the bar', 'Hinge at the hips, flat back, chest proud', 'Push the floor away and stand tall without leaning back'], mistakes: ['Rounding the lower back', 'Bar drifting away from the legs', 'Jerking the bar off the floor'] }],
  ['Scapular_Pull-Up', ['back', 'shoulders'], { eq: 'bar', name: 'Scapular Pull-Up', tags: ['posture'], cues: ['Hang with straight arms', 'Pull shoulder blades down and together without bending elbows', 'Great for shoulder health and pull-up prep'] }],

  // ---------- SHOULDERS ----------
  ['Dumbbell_Shoulder_Press', ['shoulders', 'arms'], { cues: ['Brace your core; ribs down — don\'t arch your lower back', 'Press straight up until biceps are by your ears'], mistakes: ['Leaning back to push the weight', 'Flaring elbows fully to the sides'] }],
  ['Arnold_Dumbbell_Press', ['shoulders'], { name: 'Arnold Press', cues: ['Start palms facing you, rotate as you press', 'Control the rotation on the way down'] }],
  ['Side_Lateral_Raise', ['shoulders'], { name: 'Lateral Raise', cues: ['Light weight, soft elbows', 'Raise out to the side to shoulder height, lead with the elbows', 'No shrugging or swinging'], mistakes: ['Going too heavy', 'Shrugging traps'] }],
  ['Front_Dumbbell_Raise', ['shoulders'], { name: 'Front Raise', cues: ['Raise to shoulder height with control', 'Keep your torso still'] }],
  ['Reverse_Flyes', ['shoulders', 'back'], { name: 'Reverse Fly', tags: ['posture'], cues: ['Hinge forward with a flat back', 'Open arms wide, squeeze shoulder blades', 'Light weight — it\'s a small muscle'] }],
  ['Face_Pull', ['shoulders', 'back'], { tags: ['posture'], cues: ['Rope at face height; pull toward your forehead', 'Elbows high, finish with hands beside your ears', 'Squeeze the upper back, slow return'], mistakes: ['Pulling to the chest', 'Leaning back to use body weight'] }],
  ['Band_Pull_Apart', ['shoulders', 'back'], { name: 'Band Pull-Apart', tags: ['posture'], cues: ['Arms straight at chest height', 'Pull the band to your chest by squeezing shoulder blades', 'Ribs down — no arching'], mistakes: ['Shrugging', 'Bending elbows a lot'] }],
  ['External_Rotation_with_Band', ['shoulders'], { name: 'Band External Rotation', tags: ['posture'], cues: ['Elbow pinned to your side, bent 90° (a rolled towel under the arm helps)', 'Rotate the forearm outward slowly, wrist straight'] }],
  ['Standing_Military_Press', ['shoulders', 'arms'], { name: 'Barbell Overhead Press', cues: ['Squeeze glutes, ribs down', 'Move your head back slightly as the bar passes your face, then push through'] }],
  ['Dumbbell_Scaption', ['shoulders'], { name: 'Scaption (Standing Y-Raise)', tags: ['posture'], cues: ['Thumbs up, arms at a 30° angle in front of your body', 'Raise to shoulder height with very light weights'] }],

  // ---------- ARMS ----------
  ['Dumbbell_Bicep_Curl', ['arms'], { name: 'Dumbbell Biceps Curl', cues: ['Elbows pinned to your sides', 'Curl up, squeeze, lower slowly (2–3 s)'], mistakes: ['Swinging the torso', 'Elbows drifting forward'] }],
  ['Hammer_Curls', ['arms'], { name: 'Hammer Curl', cues: ['Palms face each other the whole time', 'Keep elbows still'] }],
  ['Concentration_Curls', ['arms'], { name: 'Concentration Curl', cues: ['Elbow braced on the inside of your thigh', 'Full stretch at the bottom'] }],
  ['Barbell_Curl', ['arms'], { cues: ['Shoulder-width grip, elbows at your sides', 'Don\'t lean back to finish the rep'] }],
  ['Bench_Dips', ['arms', 'chest'], { name: 'Bench Dip', cues: ['Shoulders down, chest up, hips close to the bench', 'Lower until elbows reach ~90° — stop earlier if your shoulders complain'] }],
  ['Tricep_Dumbbell_Kickback', ['arms'], { name: 'Triceps Kickback', cues: ['Upper arm parallel to the floor and still', 'Straighten the elbow fully and squeeze'] }],
  ['Standing_Dumbbell_Triceps_Extension', ['arms'], { name: 'Overhead Triceps Extension', cues: ['Elbows point forward, close to your head', 'Ribs down — don\'t arch'] }],
  ['Triceps_Pushdown_-_Rope_Attachment', ['arms'], { name: 'Rope Pushdown', cues: ['Elbows glued to your sides', 'Spread the rope at the bottom'] }],
  ['Push-Ups_-_Close_Triceps_Position', ['arms', 'chest'], { name: 'Close-Grip Push-Up', cues: ['Hands under shoulders, elbows brush your ribs', 'Drop to your knees to make it easier'] }],
  ['Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench', ['arms'], { name: 'Wrist Curl', cues: ['Forearms on a bench, wrists over the edge', 'Small, slow range — great for grip'] }],

  // ---------- CORE ----------
  ['Plank', ['core'], { tags: ['posture'], cues: ['Elbows under shoulders', 'Squeeze glutes and brace as if someone is about to poke your belly', 'Keep breathing'], mistakes: ['Hips sagging', 'Butt too high', 'Looking up and straining the neck'] }],
  ['Side_Bridge', ['core'], { name: 'Side Plank', tags: ['posture'], cues: ['Elbow under shoulder, body in a straight line', 'Push the hips up — don\'t let them drop', 'Easier: bend the knees'] }],
  ['Dead_Bug', ['core'], { tags: ['posture'], cues: ['Press your lower back gently into the floor the whole time', 'Slowly extend the opposite arm and leg; exhale as you reach', 'Only go as low as you can keep the back down'], mistakes: ['Lower back arching off the floor', 'Moving fast'] }],
  ['Crunches', ['core'], { name: 'Crunch', cues: ['Curl your ribs toward your pelvis', 'Hands lightly by your head — don\'t pull the neck'] }],
  ['Reverse_Crunch', ['core'], { cues: ['Curl the hips off the floor using your abs', 'Lower slowly, no swinging'] }],
  ['Russian_Twist', ['core'], { cues: ['Lean back with a long spine', 'Rotate from the ribcage, not just the arms', 'Feet down for an easier version'] }],
  ['Flat_Bench_Lying_Leg_Raise', ['core'], { name: 'Lying Leg Raise', cues: ['Lower back stays down', 'Lower legs only as far as you can control'] }],
  ['Pallof_Press', ['core'], { tags: ['posture'], cues: ['Stand side-on to the cable/band', 'Press straight out and resist the twist', 'Hold 2 seconds each rep'] }],
  ['Mountain_Climbers', ['core', 'cardio'], { cues: ['Hands under shoulders, hips level', 'Drive knees toward the chest quickly'] }],
  ['Air_Bike', ['core'], { name: 'Bicycle Crunch', cues: ['Slow and controlled beats fast and sloppy', 'Rotate the shoulder toward the opposite knee'] }],
  ['Ab_Roller', ['core'], { name: 'Ab Wheel Rollout', cues: ['Start from the knees', 'Keep a slight posterior pelvic tilt — don\'t let the back sag'] }],

  // ---------- GLUTES & HIPS ----------
  ['Butt_Lift_Bridge', ['glutes', 'legs', 'core'], { name: 'Glute Bridge', tags: ['posture'], cues: ['Feet hip-width, heels about a hand-length from your butt', 'Tuck the pelvis slightly, then push through your heels', 'Squeeze glutes at the top — ribs stay down'], mistakes: ['Arching the lower back at the top', 'Pushing through the toes'] }],
  ['Single_Leg_Glute_Bridge', ['glutes', 'legs'], { name: 'Single-Leg Glute Bridge', cues: ['Keep hips level as you lift', 'Drive through the heel of the working leg'] }],
  ['Glute_Kickback', ['glutes'], { name: 'Quadruped Glute Kickback', cues: ['On all fours, push one heel toward the ceiling', 'Don\'t arch your back to lift higher'] }],
  ['Monster_Walk', ['glutes', 'legs'], { name: 'Band Monster Walk', tags: ['posture'], cues: ['Slight squat, band around knees or ankles', 'Small steps keeping tension in the band', 'Knees push out — never cave in'] }],
  ['Pull_Through', ['glutes', 'legs'], { name: 'Cable Pull-Through', cues: ['Hinge the hips back, flat back', 'Snap the hips forward and squeeze glutes'] }],
  ['Step-up_with_Knee_Raise', ['glutes', 'legs'], { name: 'Step-Up with Knee Drive', cues: ['Whole foot on the step', 'Drive through the front heel, then lift the back knee'] }],

  // ---------- LEGS ----------
  ['Bodyweight_Squat', ['legs', 'glutes'], { cues: ['Feet shoulder-width, toes slightly out', 'Sit hips back and down; knees track over toes', 'Chest proud, heels down; go as deep as you can with a neutral back'], mistakes: ['Knees caving inward', 'Heels lifting', 'Rounding the back at the bottom'] }],
  ['Goblet_Squat', ['legs', 'glutes'], { cues: ['Hold the weight at your chest, elbows pointing down', 'Push knees out as you descend — elbows end between the knees', 'Stand up by driving through the whole foot'], mistakes: ['Weight pulling you forward', 'Knees collapsing in'] }],
  ['Dumbbell_Squat', ['legs', 'glutes'], { cues: ['Dumbbells at your sides, chest tall', 'Same squat pattern: hips back and down'] }],
  ['Barbell_Squat', ['legs', 'glutes'], { name: 'Barbell Back Squat', cues: ['Bar on the upper back, hands tight', 'Brace, then sit between your hips', 'Use safety pins'] }],
  ['Bodyweight_Walking_Lunge', ['legs', 'glutes'], { name: 'Walking Lunge', cues: ['Long step; drop the back knee straight down', 'Front knee over mid-foot, torso upright'] }],
  ['Dumbbell_Rear_Lunge', ['legs', 'glutes'], { name: 'Reverse Lunge', cues: ['Step back, not forward — gentler on the knees', 'Most of your weight in the front heel'] }],
  ['Split_Squat_with_Dumbbells', ['legs', 'glutes'], { name: 'Split Squat', cues: ['Staggered stance, feet hip-width apart', 'Drop straight down, front shin roughly vertical'] }],
  ['Dumbbell_Step_Ups', ['legs', 'glutes'], { name: 'Step-Up', cues: ['Whole foot on the box', 'Push through the front leg — don\'t bounce off the back foot'] }],
  ['Romanian_Deadlift', ['legs', 'glutes', 'back'], { name: 'Romanian Deadlift (Barbell)', cues: ['Soft knees, push hips straight back', 'Bar slides down the thighs, flat back', 'Stop at a hamstring stretch, then drive hips forward'] }],
  ['Stiff-Legged_Dumbbell_Deadlift', ['legs', 'glutes', 'back'], { name: 'Dumbbell Romanian Deadlift', cues: ['Soft knees, push hips straight back', 'Weights slide down your thighs, back stays flat', 'Stop at a hamstring stretch, then squeeze glutes to stand'], mistakes: ['Rounding the back to reach lower', 'Squatting instead of hinging'] }],
  ['Kettlebell_One-Legged_Deadlift', ['legs', 'glutes'], { name: 'Single-Leg Deadlift', cues: ['Hips square to the floor', 'Reach the back leg long as you hinge', 'Hold a wall for balance at first'] }],
  ['Leg_Press', ['legs', 'glutes'], { cues: ['Feet shoulder-width, mid-platform', 'Lower until knees ~90°; don\'t let the lower back peel off the pad'] }],
  ['Leg_Extensions', ['legs'], { name: 'Leg Extension', cues: ['Knee lined up with the machine pivot', 'Pause and squeeze at the top'] }],
  ['Lying_Leg_Curls', ['legs'], { name: 'Lying Leg Curl', cues: ['Hips pressed into the pad', 'Lower slowly'] }],
  ['Ball_Leg_Curl', ['legs', 'glutes'], { name: 'Stability Ball Leg Curl', cues: ['Lift hips into a bridge', 'Roll the ball in with your heels, keep hips high'] }],
  ['Freehand_Jump_Squat', ['legs', 'cardio'], { name: 'Jump Squat', kind: 'cardio', cues: ['Land softly, knees bending to absorb', 'Knees track over toes on landing'] }],

  // ---------- CALVES & ANKLES ----------
  ['Standing_Dumbbell_Calf_Raise', ['calves'], { name: 'Standing Calf Raise', eq: 'none', cues: ['Rise as high as you can onto the big toe', 'Lower slowly; add dumbbells or do one leg for more challenge', 'Do them on a step for a bigger stretch'] }],
  ['Seated_Calf_Raise', ['calves'], { cues: ['Targets the soleus (lower calf)', 'Full stretch at the bottom, pause at the top'] }],
  ['Calf_Stretch_Hands_Against_Wall', ['calves'], { name: 'Wall Calf Stretch', cues: ['Back heel down, back knee straight', 'Lean the hips toward the wall'] }],
  ['Standing_Soleus_And_Achilles_Stretch', ['calves'], { name: 'Soleus & Achilles Stretch', cues: ['Like the calf stretch but bend the back knee', 'Keep the heel down'] }],

  // ---------- NECK ----------
  ['Isometric_Neck_Exercise_-_Front_And_Back', ['neck'], { name: 'Isometric Neck Hold (Front/Back)', tags: ['posture'], cues: ['Press head gently into your hand — the head doesn\'t move', 'About 30% effort, hold 5–10 seconds'] }],
  ['Isometric_Neck_Exercise_-_Sides', ['neck'], { name: 'Isometric Neck Hold (Sides)', tags: ['posture'], cues: ['Hand on the side of your head, gentle push', 'Keep shoulders level and relaxed'] }],
  ['Side_Neck_Stretch', ['neck'], { name: 'Neck Side Stretch', tags: ['posture'], cues: ['Ear toward shoulder, shoulders down', 'Hold the bench/chair edge with the other hand for a deeper stretch'] }],
  ['Chin_To_Chest_Stretch', ['neck'], { name: 'Chin-to-Chest Stretch', tags: ['posture'], cues: ['Let the head drop gently forward', 'Breathe slowly, no bouncing'] }],

  // ---------- CARDIO ----------
  ['Star_Jump', ['cardio'], { cues: ['Explode up into an "X" shape', 'Land softly and reset'] }],
  ['Rope_Jumping', ['cardio', 'calves'], { name: 'Jump Rope', cues: ['Small hops on the balls of your feet', 'Turn the rope with your wrists, not your arms'] }],
  ['Fast_Skipping', ['cardio'], { name: 'Skipping', cues: ['Quick, light contacts', 'Drive the arms rhythmically'] }],
  ['Split_Jump', ['cardio', 'legs'], { name: 'Split Jump (Jumping Lunge)', cues: ['Switch legs mid-air', 'Land softly in a lunge'] }],

  // ---------- YOGA ----------
  ['Childs_Pose', ['back', 'shoulders'], { name: 'Child\'s Pose', kind: 'stretch', tags: ['yoga'], cues: ['Knees wide, big toes together', 'Sink hips toward heels, arms long', 'Breathe into your back ribs'] }],
  ['Cat_Stretch', ['back', 'core'], { name: 'Cat-Cow', kind: 'stretch', tags: ['yoga', 'posture'], cues: ['Inhale: drop the belly, lift chest and tailbone (cow)', 'Exhale: round the spine up, tuck chin and tailbone (cat)', 'Move slowly, one vertebra at a time'] }],
  ['Standing_Toe_Touches', ['legs', 'back'], { name: 'Standing Forward Fold', kind: 'stretch', tags: ['yoga'], cues: ['Bend the knees as much as you need', 'Let the head and arms hang heavy'] }],
  ['Knee_Across_The_Body', ['back', 'glutes'], { name: 'Supine Twist', kind: 'stretch', tags: ['yoga'], cues: ['Keep both shoulders on the floor', 'Let gravity do the work — breathe'] }],
  ['Ankle_On_The_Knee', ['glutes'], { name: 'Figure-4 Stretch', kind: 'stretch', tags: ['yoga'], cues: ['Ankle over the opposite knee, flex the top foot', 'Pull the bottom thigh toward your chest'] }],
  ['Hug_Knees_To_Chest', ['back', 'glutes'], { name: 'Knees-to-Chest', kind: 'stretch', tags: ['yoga'], cues: ['Hold under the knees', 'Rock gently side to side to massage the lower back'] }],
  ['Kneeling_Hip_Flexor', ['legs', 'glutes'], { name: 'Low Lunge (Hip-Flexor Stretch)', kind: 'stretch', tags: ['yoga', 'posture'], cues: ['Tuck the pelvis under and squeeze the back glute', 'Shift forward only until you feel the front of the hip stretch'], mistakes: ['Arching the lower back instead of tucking the pelvis'] }],
  ['Seated_Floor_Hamstring_Stretch', ['legs'], { name: 'Head-to-Knee Forward Fold', kind: 'stretch', tags: ['yoga'], cues: ['Hinge from the hips with a long spine', 'Reach for the shin, ankle or foot — whatever is comfortable'] }],
  ['Upward_Stretch', ['shoulders', 'core'], { name: 'Upward Salute', kind: 'stretch', tags: ['yoga'], cues: ['Reach tall through the fingertips', 'Ribs down — avoid over-arching'] }],
  ['Standing_Lateral_Stretch', ['core', 'back'], { name: 'Standing Side Bend', kind: 'stretch', tags: ['yoga'], cues: ['Lengthen up before you lean over', 'Keep the hips square'] }],
  ['Worlds_Greatest_Stretch', ['legs', 'glutes', 'back'], { name: 'World\'s Greatest Stretch', kind: 'stretch', tags: ['yoga'], cues: ['Lunge, elbow to instep, then rotate the arm up to the ceiling', 'Follow your hand with your eyes'] }],
  ['Spinal_Stretch', ['back'], { name: 'Seated Chair Twist', kind: 'stretch', tags: ['yoga', 'posture'], cues: ['Sit tall first, then rotate', 'Perfect desk break'] }],

  // ---------- STRETCH & MOBILITY ----------
  ['Hamstring_Stretch', ['legs'], { name: 'Strap Hamstring Stretch', cues: ['Use a towel, belt or band around the foot', 'Keep the other leg flat on the floor'] }],
  ['Elbows_Back', ['chest', 'shoulders'], { name: 'Standing Chest Opener', tags: ['posture'], cues: ['Hands on lower back, gently draw elbows together', 'Lift the chest — great after phone/laptop time'] }],
  ['Chest_And_Front_Of_Shoulder_Stretch', ['chest', 'shoulders'], { name: 'Broomstick Chest Opener', tags: ['posture'], cues: ['Wide grip on a stick or towel', 'Only go as far back as is comfortable'] }],
  ['Triceps_Stretch', ['arms'], { cues: ['Hand down your upper back, gently push the elbow', 'Keep your head up'] }],
  ['Shoulder_Stretch', ['shoulders'], { name: 'Cross-Body Shoulder Stretch', cues: ['Pull the arm across at chest height', 'Keep the shoulder down, away from the ear'] }],
  ['Arm_Circles', ['shoulders'], { cues: ['Start small, grow bigger', 'Reverse direction halfway'] }],
  ['Shoulder_Circles', ['shoulders', 'neck'], { name: 'Shoulder Rolls', tags: ['posture'], cues: ['Roll forward, up, back and down', 'Slow and big — feel the shoulder blades move'] }],
  ['Standing_Hip_Circles', ['glutes', 'legs'], { name: 'Hip Circles', cues: ['Hands on hips, draw big circles', 'Both directions'] }],
  ['Inchworm', ['legs', 'core', 'shoulders'], { cues: ['Walk hands out to a plank, then walk feet toward hands', 'Bend knees as needed'] }],
  ['Runners_Stretch', ['legs', 'calves'], { name: 'Runner\'s Lunge Stretch', cues: ['Back leg long, hands beside the front foot', 'Sink the hips'] }],
  ['On_Your_Side_Quad_Stretch', ['legs'], { name: 'Side-Lying Quad Stretch', cues: ['Pull the heel toward your butt', 'Keep knees together and push the hip forward'] }],
];

// Exercises without photos in the dataset — illustrated with an animated figure (js/data/figures.js).
const CUSTOM = [
  { id: 'chin-tuck', name: 'Chin Tuck', parts: ['neck'], kind: 'strength', tags: ['posture'], eq: 'none', level: 'beginner',
    primary: ['neck'], secondary: ['traps'],
    steps: ['Sit or stand tall with shoulders relaxed and eyes level.', 'Glide your head straight back as if making a double chin — don\'t tilt your head up or down.', 'Hold 3–5 seconds and feel the back of your neck lengthen, then relax.', 'Repeat 8–12 times. A great reset every hour at the desk.'],
    cues: ['Think "slide back", not "nod down"', 'Keep the jaw relaxed and eyes on the horizon'],
    mistakes: ['Tilting the chin down to the chest', 'Shrugging the shoulders up'] },
  { id: 'wall-angel', name: 'Wall Angel', parts: ['shoulders', 'back'], kind: 'strength', tags: ['posture'], eq: 'none', level: 'beginner',
    primary: ['shoulders', 'middle back'], secondary: ['traps'],
    steps: ['Stand with your back against a wall, feet a small step forward, knees soft.', 'Head, upper back and butt touch the wall. Keep ribs down so your lower back doesn\'t peel away.', 'Make a "goalpost": elbows bent 90°, backs of the arms and hands against the wall.', 'Slowly slide your arms up as high as you can while keeping contact, then slide back down.', 'Do 8–12 slow reps.'],
    cues: ['Only go as high as you can keep contact', 'Exhale as you slide up'],
    mistakes: ['Arching the lower back to reach higher', 'Hands lifting off the wall', 'Shrugging toward the ears'] },
  { id: 'bird-dog', name: 'Bird Dog', parts: ['core', 'back', 'glutes'], kind: 'strength', tags: ['posture'], eq: 'none', level: 'beginner',
    primary: ['lower back', 'abdominals'], secondary: ['glutes', 'shoulders'],
    steps: ['Start on all fours: hands under shoulders, knees under hips, back flat.', 'Brace your core lightly.', 'Reach one arm forward and the opposite leg back until both are in line with your body.', 'Pause 2 seconds without letting your hips rotate, then return and switch sides.', 'Do 6–10 per side.'],
    cues: ['Imagine balancing a cup of chai on your lower back', 'Reach long rather than high'],
    mistakes: ['Arching the back as the leg lifts', 'Hips rotating open', 'Rushing'] },
  { id: 'prone-y-raise', name: 'Prone Y Raise', parts: ['shoulders', 'back'], kind: 'strength', tags: ['posture'], eq: 'none', level: 'beginner',
    primary: ['middle back', 'traps'], secondary: ['shoulders'],
    steps: ['Lie face down, forehead on a folded towel, arms overhead in a "Y" with thumbs pointing up.', 'Gently draw your shoulder blades back and down.', 'Lift both arms a few centimetres off the floor without arching your lower back.', 'Hold 2–3 seconds and lower slowly. Do 8–12 reps.'],
    cues: ['Thumbs up toward the ceiling', 'Lift from the shoulder blades, not the neck'],
    mistakes: ['Lifting the head and straining the neck', 'Shrugging to the ears'] },
  { id: 'clamshell', name: 'Clamshell', parts: ['glutes'], kind: 'strength', tags: ['posture'], eq: 'none', level: 'beginner',
    primary: ['glutes', 'abductors'], secondary: [],
    steps: ['Lie on your side with hips and knees bent about 45°, feet together, head resting on your arm.', 'Stack your hips vertically — roll slightly forward rather than back.', 'Keeping your feet touching, lift the top knee as high as you can without the pelvis rolling back.', 'Pause, lower slowly. Do 12–15 per side; add a mini band above the knees to progress.'],
    cues: ['Feel it in the side of your hip and butt', 'Small, controlled movement'],
    mistakes: ['Rolling the pelvis backward', 'Using momentum'] },
  { id: 'knee-to-wall', name: 'Knee-to-Wall Ankle Mobility', parts: ['calves', 'legs'], kind: 'stretch', tags: ['posture'], eq: 'none', level: 'beginner',
    primary: ['calves'], secondary: [],
    steps: ['Half-kneel facing a wall with your front foot about a hand-length from it.', 'Keep the front heel planted on the floor.', 'Drive the front knee forward toward the wall over your middle toes, then come back.', 'Do 10–15 reps per side. Move the foot back as your ankle loosens up.'],
    cues: ['Knee tracks over the 2nd–3rd toe', 'The heel never lifts'],
    mistakes: ['Heel popping up', 'Knee caving inward'] },
  { id: 'hip-hinge', name: 'Hip Hinge Drill', parts: ['glutes', 'legs', 'back'], kind: 'strength', tags: ['posture'], eq: 'none', level: 'beginner',
    primary: ['hamstrings', 'glutes'], secondary: ['lower back'],
    steps: ['Stand tall, feet hip-width, knees soft. Optional: hold a broomstick along your spine so it touches your head, upper back and tailbone.', 'Push your hips straight back as if closing a car door with your butt.', 'Let your torso tilt forward with a flat back until you feel a stretch in your hamstrings.', 'Squeeze your glutes to drive the hips forward and stand tall. Do 10–12 reps.'],
    cues: ['Hips go back, not down', 'Keep the stick touching all three points'],
    mistakes: ['Squatting down instead of hinging', 'Rounding the back'] },
  { id: 'wall-sit', name: 'Wall Sit', parts: ['legs'], kind: 'strength', tags: [], eq: 'none', level: 'beginner',
    primary: ['quadriceps'], secondary: ['glutes'],
    steps: ['Stand with your back against a wall and your feet about two feet in front of you.', 'Slide down until your thighs are close to parallel with the floor and knees are over your ankles.', 'Keep your back flat on the wall and weight in your heels.', 'Hold 20–60 seconds, breathing steadily. Stay higher if your knees complain.'],
    cues: ['Knees stacked over ankles', 'Breathe slowly through the burn'],
    mistakes: ['Knees drifting past the toes', 'Holding your breath'] },
  { id: 'downward-dog', name: 'Downward-Facing Dog', parts: ['shoulders', 'legs', 'calves', 'back'], kind: 'stretch', tags: ['yoga'], eq: 'none', level: 'beginner',
    primary: ['hamstrings', 'calves'], secondary: ['shoulders', 'lats'],
    steps: ['Start in a plank or on all fours, hands shoulder-width, fingers spread.', 'Lift your hips up and back into an upside-down "V".', 'Press the floor away and lengthen your spine. Bend your knees as much as you need to keep the back long.', 'Let your heels sink toward the floor and your head relax between your arms. Hold 5–8 breaths.'],
    cues: ['Long spine first, straight legs second', 'Pedal the feet to ease into the calves'],
    mistakes: ['Rounding the upper back', 'Shoulders hunched up to the ears'] },
  { id: 'cobra', name: 'Cobra Pose', parts: ['back', 'core'], kind: 'stretch', tags: ['yoga', 'posture'], eq: 'none', level: 'beginner',
    primary: ['lower back'], secondary: ['abdominals', 'chest'],
    steps: ['Lie face down, legs long, tops of the feet on the floor, hands under your shoulders.', 'Hug your elbows in toward your ribs.', 'Press gently through your hands and lift your chest, keeping your hips on the floor.', 'Keep shoulders away from the ears and gaze slightly forward. Hold 3–5 breaths, lower, repeat.'],
    cues: ['Lift with your back, not just your arms', 'Only go as high as is comfortable for your lower back'],
    mistakes: ['Locking the elbows and cranking up', 'Throwing the head back'] },
  { id: 'warrior-2', name: 'Warrior II', parts: ['legs', 'glutes', 'shoulders'], kind: 'stretch', tags: ['yoga'], eq: 'none', level: 'beginner',
    primary: ['quadriceps'], secondary: ['glutes', 'adductors', 'shoulders'],
    steps: ['Step your feet wide apart. Turn your right foot out 90° and your left foot slightly in.', 'Bend the right knee until it is over the ankle; keep the left leg strong and straight.', 'Stretch your arms out at shoulder height and gaze over your right hand.', 'Keep your torso upright between your legs. Hold 5 breaths, then switch sides.'],
    cues: ['Front knee points at your middle toes', 'Shoulders relaxed, arms active'],
    mistakes: ['Front knee collapsing inward', 'Leaning toward the front leg'] },
  { id: 'tree-pose', name: 'Tree Pose', parts: ['legs', 'core'], kind: 'stretch', tags: ['yoga'], eq: 'none', level: 'beginner',
    primary: ['glutes', 'abdominals'], secondary: ['calves', 'adductors'],
    steps: ['Stand tall and shift your weight onto your left foot.', 'Place your right foot on your inner calf or inner thigh — never on the knee.', 'Press foot and leg into each other; bring hands to your chest or overhead.', 'Fix your gaze on one still point. Hold 5–8 breaths and switch sides.'],
    cues: ['Hips level and facing forward', 'Use a wall for balance if needed'],
    mistakes: ['Foot pressing on the side of the knee', 'Standing hip jutting out'] },
  { id: 'jumping-jack', name: 'Jumping Jacks', parts: ['cardio'], kind: 'cardio', tags: [], eq: 'none', level: 'beginner',
    primary: ['quadriceps'], secondary: ['calves', 'shoulders'],
    steps: ['Stand tall, feet together, arms by your sides.', 'Jump your feet out wide while swinging your arms overhead.', 'Jump back to the start and keep a steady rhythm.', 'Low-impact option: step one foot out at a time.'],
    cues: ['Land softly on the balls of your feet'],
    mistakes: ['Landing stiff-legged'] },
];

const EQ = (e) => ({ 'body only': 'none', null: 'none', undefined: 'none', dumbbell: 'dumbbell', bands: 'band', kettlebells: 'kettlebell',
  barbell: 'gym', cable: 'gym', machine: 'gym', 'e-z curl bar': 'gym', 'foam roll': 'other', 'exercise ball': 'other', 'medicine ball': 'other', other: 'other' }[e] ?? 'other');
const KIND = (c) => (c === 'stretching' ? 'stretch' : (c === 'cardio' || c === 'plyometrics') ? 'cardio' : 'strength');
const tidy = (s) => s.replace(/\s+/g, ' ').trim();

const data = JSON.parse(await fs.readFile(DATASET, 'utf8'));
const byId = Object.fromEntries(data.map((x) => [x.id, x]));

const out = [];
for (const [id, parts, o = {}] of CURATED) {
  const x = byId[id];
  if (!x) throw new Error('Missing dataset id: ' + id);
  out.push({
    id, name: o.name || x.name, parts, kind: o.kind || KIND(x.category), tags: o.tags || [],
    eq: o.eq || EQ(x.equipment), level: x.level, primary: x.primaryMuscles, secondary: x.secondaryMuscles,
    steps: x.instructions.map(tidy), cues: o.cues || [], mistakes: o.mistakes || [], img: true,
  });
}
for (const c of CUSTOM) out.push({ ...c, img: false, fig: c.id });

// Download images (skip ones already present).
const imgDir = path.join(ROOT, 'assets', 'ex');
let downloaded = 0;
for (const e of out.filter((e) => e.img)) {
  const dir = path.join(imgDir, e.id);
  await fs.mkdir(dir, { recursive: true });
  for (const n of [0, 1]) {
    const f = path.join(dir, `${n}.jpg`);
    try { await fs.access(f); continue; } catch {}
    const res = await fetch(`${IMG_BASE}${encodeURIComponent(e.id)}/${n}.jpg`);
    if (!res.ok) throw new Error(`Image ${e.id}/${n} -> HTTP ${res.status}`);
    await fs.writeFile(f, Buffer.from(await res.arrayBuffer()));
    downloaded++;
  }
}

const header = '// GENERATED by tools/build-exercises.mjs — edit the curated list there, not this file.\n' +
  '// Photos & base instructions: free-exercise-db (public domain, Unlicense).\n';
await fs.writeFile(path.join(ROOT, 'js', 'data', 'exercises.js'),
  header + 'export const EXERCISES = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(`Wrote ${out.length} exercises (${out.filter((e) => e.img).length} with photos), downloaded ${downloaded} images.`);
