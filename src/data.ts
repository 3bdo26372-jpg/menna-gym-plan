export type Exercise = {
  id: string; name: string; muscles: string; sets: string; rest: string;
  cue: string; gif?: string; equipment: string
}

export type WorkoutDay = {
  id: 'A' | 'B' | 'C'; label: string; focus: string; tint: string; exerciseIds: string[]
}

export const exercises: Record<string, Exercise> = {
  squat: { id:'squat', name:'Hack Squat', muscles:'Quads · Glutes · Core', sets:'3 × 8–12', rest:'90 sec', equipment:'Hack squat machine', cue:'Place your back flat against the pad, brace your core, lower with control, then push through your feet. Keep knees tracking over toes.', gif:'/exercises/squat.gif' },
  chestPress: { id:'chestPress', name:'Chest Press', muscles:'Chest · Triceps · Front delts', sets:'3 × 8–12', rest:'90 sec', equipment:'Machine / dumbbells', cue:'Set shoulders down and back. Lower with control, keep wrists stacked, and press without locking your elbows hard.', gif:'/exercises/chest-press.gif' },
  pulldown: { id:'pulldown', name:'Lat Pulldown', muscles:'Lats · Upper back · Biceps', sets:'3 × 8–12', rest:'75–90 sec', equipment:'Cable machine', cue:'Sit tall and pull your elbows toward your pockets. Pause near your upper chest; avoid swinging or pulling behind your neck.', gif:'/exercises/lat-pulldown.gif' },
  hipThrust: { id:'hipThrust', name:'Hip Thrust', muscles:'Glutes · Hamstrings', sets:'3 × 10–12', rest:'90 sec', equipment:'Bench / machine', cue:'Keep chin tucked and ribs down. Drive through your heels, squeeze glutes at the top, and stop before your lower back arches.', gif:'/exercises/hip-thrust.gif' },
  lateralRaise: { id:'lateralRaise', name:'Lateral Raise', muscles:'Side delts', sets:'2 × 12–15', rest:'60 sec', equipment:'Light dumbbells', cue:'Use light weights. Lead with your elbows, raise to shoulder height, and lower slowly without swinging.', gif:'/exercises/lateral-raise.gif' },
  bicepsCurl: { id:'bicepsCurl', name:'Biceps Curl', muscles:'Biceps · Forearms', sets:'2 × 10–12', rest:'60 sec', equipment:'Dumbbells', cue:'Keep elbows close to your sides. Curl without leaning back, squeeze briefly, then take two seconds to lower.', gif:'/exercises/biceps-curl.gif' },
  plank: { id:'plank', name:'Plank', muscles:'Core · Glutes · Shoulders', sets:'3 sets', rest:'45–60 sec', equipment:'Mat', cue:'Make a straight line from head to heels. Squeeze glutes, breathe normally, and stop when your hips begin to sag.', gif:'/exercises/plank.gif' },
  rdl: { id:'rdl', name:'Romanian Deadlift', muscles:'Hamstrings · Glutes · Back', sets:'3 × 8–12', rest:'90 sec', equipment:'Dumbbells / barbell', cue:'Soften your knees, push hips backward, and keep weights close to your legs. Stand when you feel a strong hamstring stretch.', gif:'/exercises/rdl.gif' },
  seatedRow: { id:'seatedRow', name:'Seated Row', muscles:'Mid back · Lats · Biceps', sets:'3 × 8–12', rest:'75–90 sec', equipment:'Cable machine', cue:'Stay tall with ribs stacked. Pull toward your lower ribs, squeeze shoulder blades gently, and return without rounding.', gif:'/exercises/seated-row.gif' },
  shoulderPress: { id:'shoulderPress', name:'Shoulder Press', muscles:'Shoulders · Triceps', sets:'3 × 8–12', rest:'90 sec', equipment:'Machine / dumbbells', cue:'Brace your core and begin with elbows slightly forward. Press overhead smoothly without leaning your body backward.', gif:'/exercises/shoulder-press.gif' },
  walkingLunge: { id:'walkingLunge', name:'Walking Lunges', muscles:'Quads · Glutes · Hamstrings', sets:'3 × 10 each leg', rest:'90 sec', equipment:'Bodyweight / dumbbells', cue:'Take a comfortable step, lower both knees, and drive through the whole front foot. Hold support if balance is new.', gif:'/exercises/walking-lunges.gif' },
  tricepsPushdown: { id:'tricepsPushdown', name:'Triceps Pushdown', muscles:'Triceps', sets:'2 × 10–12', rest:'60 sec', equipment:'Cable machine', cue:'Pin elbows beside your ribs. Extend until arms are straight, spread the rope, and return without shoulders rolling forward.', gif:'/exercises/triceps-pushdown.gif' },
  calfRaise: { id:'calfRaise', name:'Calf Raises', muscles:'Calves', sets:'3 × 15–20', rest:'60 sec', equipment:'Machine / step', cue:'Use support for balance. Lower into a gentle stretch, rise as high as possible, and pause—no bouncing.', gif:'/exercises/calf-raises.gif' },
  legRaise: { id:'legRaise', name:'Leg Raises', muscles:'Abs · Hip flexors', sets:'3 × 12–15', rest:'60 sec', equipment:'Mat', cue:'Press your lower back toward the mat. Lower bent or straight legs only as far as you can keep your back controlled.', gif:'/exercises/leg-raises.gif' },
  legPress: { id:'legPress', name:'Leg Press', muscles:'Quads · Glutes · Hamstrings', sets:'3 × 10–12', rest:'90 sec', equipment:'Leg press machine', cue:'Place feet shoulder-width. Lower until comfortable while your hips stay on the pad, then push through your whole foot.', gif:'/exercises/leg-press.gif' },
  inclinePress: { id:'inclinePress', name:'Incline Chest Press', muscles:'Upper chest · Triceps · Front delts', sets:'3 × 8–12', rest:'90 sec', equipment:'Machine / dumbbells', cue:'Use a low incline. Keep shoulder blades supported, lower slowly, and press up in the same smooth path.', gif:'/exercises/incline-chest-press.gif' },
  rowOrPulldown: { id:'rowOrPulldown', name:'Row or Lat Pulldown', muscles:'Back · Lats · Biceps', sets:'3 × 8–12', rest:'75–90 sec', equipment:'Cable machine', cue:'Choose the movement that feels best today. Keep your torso steady and think about moving with your elbows, not your hands.', gif:'/exercises/row-pulldown.gif' },
  rearDeltFly: { id:'rearDeltFly', name:'Rear Delt Fly', muscles:'Rear delts · Upper back', sets:'2 × 12–15', rest:'60 sec', equipment:'Machine / dumbbells', cue:'Use a light load and a soft elbow. Open your arms wide without shrugging, then return with control.', gif:'/exercises/rear-delt-fly.gif' },
  hammerCurl: { id:'hammerCurl', name:'Hammer Curl', muscles:'Biceps · Brachialis · Forearms', sets:'2 × 10–12', rest:'60 sec', equipment:'Dumbbells', cue:'Keep palms facing inward and elbows still. Curl smoothly, pause, and lower all the way without rocking.', gif:'/exercises/hammer-curl.gif' },
  overheadTri: { id:'overheadTri', name:'Cable Overhead Triceps Extension', muscles:'Triceps', sets:'2 × 10–12', rest:'60 sec', equipment:'Cable rope', cue:'Face away from the cable with the rope behind your head. Keep ribs down and elbows pointing forward, then extend your arms fully without letting the elbows flare.', gif:'/exercises/cable-overhead-triceps.gif' },
  deadBug: { id:'deadBug', name:'Dead Bug', muscles:'Deep core · Hip flexors', sets:'3 sets', rest:'45–60 sec', equipment:'Mat', cue:'Press your lower back into the mat. Slowly extend opposite arm and leg; shorten the range if your back lifts.', gif:'/exercises/dead-bug.gif' },
}

export const workoutDays: WorkoutDay[] = [
  { id:'A', label:'Full Body A', focus:'Foundation & control', tint:'from-pink-500 to-rose-400', exerciseIds:['squat','chestPress','pulldown','hipThrust','lateralRaise','bicepsCurl','plank'] },
  { id:'B', label:'Full Body B', focus:'Hinge, pull & balance', tint:'from-fuchsia-500 to-pink-400', exerciseIds:['rdl','seatedRow','shoulderPress','walkingLunge','tricepsPushdown','calfRaise','legRaise'] },
  { id:'C', label:'Full Body C', focus:'Strength & confidence', tint:'from-rose-500 to-orange-300', exerciseIds:['legPress','inclinePress','rowOrPulldown','hipThrust','rearDeltFly','hammerCurl','overheadTri','deadBug'] },
]

export const meals = [
  { time:'Morning', title:'Breakfast', kcal:'', items:['Eggs','Whole wheat toast','Vegetables'], tone:'bg-amber-50 text-amber-700' },
  { time:'Snack', title:'Snack', kcal:'', items:['Fruit','Greek yogurt'], tone:'bg-fuchsia-50 text-fuchsia-700' },
  { time:'Midday', title:'Lunch', kcal:'', items:['Chicken, fish, or lean meat','Rice or potatoes','Large salad'], tone:'bg-emerald-50 text-emerald-700' },
  { time:'Pre-gym', title:'Pre-workout', kcal:'', items:['Banana or dates'], tone:'bg-blue-50 text-blue-700' },
  { time:'Evening', title:'Dinner', kcal:'', items:['Greek yogurt, cottage cheese, or tuna','Vegetables'], tone:'bg-pink-50 text-pink-700' },
]
