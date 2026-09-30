# Menna Flow

A private daily fitness app for one person: Menna. Every calendar day has a workout, a check-in, feedback and a score out of 100. The workouts are standing, bodyweight-only, cardio-leaning sessions that adapt to how the previous ones felt. Measurements, rewards, progress charts and a monthly PDF report sit alongside them.

The UI is Arabic (RTL) and mobile-first.

## Architecture

```
Vercel (Vite + React SPA)  ──HTTPS + passcode──▶  Cloudflare Worker (worker/)  ──▶  Cloudflare D1
        │                                               │
        └──────────── shared/ (TypeScript domain logic used by both) ─┘
```

- **`shared/`**: framework-free domain logic that the Worker, the frontend and the tests all use:
  - Cairo calendar dates (`date.ts`)
  - the exercise catalog (`exercises.ts`)
  - workout generation and adaptation (`program.ts`)
  - scoring (`scoring.ts`)
  - validation and derived values (`engine.ts`)
  - measurement fields and the baseline (`measurements.ts`)
  - reward defaults and hiding locked rewards (`rewards.ts`)
  - water points: earning, spending and making up days (`waterPoints.ts`)
  - the monthly report builder (`report.ts`)
- **`worker/`**: the Cloudflare Worker API.
  - D1 schema in `worker/migrations/`, queries in `worker/src/db.ts`, routes in `worker/src/index.ts`.
  - Seeding is idempotent (`INSERT OR IGNORE`, run the first time the API is used), so deploys never reset the baseline.
- **`src/`**: the React app.
  - Pages: `pages/` (Today, Progress, Measurements, Rewards, Reports).
  - Workout player: `workout/`.
  - Monthly PDF: `report/`, rendered in the browser so Arabic text shapes correctly, then exported with `html-to-image` + `jsPDF`.
  - Persistence goes through the `Backend` interface in `lib/backend.ts`:
    - `httpBackend.ts` talks to the Worker.
    - `localBackend.ts` is a **development-only fallback** (browser localStorage), used when `VITE_API_URL` is not set. A banner says so.
- **Dates**: every daily record is keyed by its **Africa/Cairo** date. A workout keeps the date it *started* on, so a workout finished after midnight still counts for the evening it began. Today and yesterday can be written, for late-night check-ins and feedback.

### Program rules (all data-driven in `shared/`)

- **Exercises**: all standing, bodyweight only; no floor, wall, chair, bench or equipment.
- **Alternatives**: every jumping movement names a low-impact alternative, and the player's **صعب؟ أسهل** button switches to it mid-workout without resetting the timer.
- **Session structure**: warm-up → full-body cardio → standing core/body control → standing stretches.
- **Weekly shape**: a 4-day cycle of three active day types, then a **Light Movement Day** (يوم تمرين خفيف: easy movement plus stretching). There is never a "rest day".
  - Exercises rotate daily so neighbouring days differ.
- **Duration**: level 0 sessions are about 18 minutes (Light Movement Days about 15); the top level stays under 28 minutes.
- **Adaptation**:
  - Three workouts in a row rated *Easy* move up one level, and each level changes exactly one variable (work time, rest, rounds, more jumps, core rounds).
  - Two *Hard* ratings move down a level. After a *Hard* rating, or a low-energy / tired check-in, the jumps are swapped for their alternatives and the intervals get shorter.
  - Reporting pain holds the level and makes the next day light.
- **Cheers** (`src/workout/cheers.ts`): short messages with her nicknames during the workout, kept sparse on purpose.
  - One after every 5 finished exercises (skipped ones don't count), and one after a hard exercise (a jump, or one she once rated hardest) at most once a workout. That is about 4 a workout, never two close together and none during the cool-down.
  - Each shows for about 3 seconds over the demo and never blocks a tap.
  - Finishing the whole workout plays a celebration that rotates daily (hearts, rockets or clapping) and closes by itself.
- **Daily score** (max 100): check-in 15, workout 60 (proportional to the main work actually done), warm-up 5, cooldown 5, feedback 15. Harder or longer sessions never earn extra points.
- **Food & drink log**: each entry has a time, a category (breakfast, lunch, dinner, snack or drink), the item and an optional amount/ml. Water is totalled against a 2–2.5 L daily target. Today and the 6 days before it can be logged or corrected. The daily score is unchanged.
- **Water points (نقط المية)**: 1 point per 250 ml of water, up to 2.5 L a day, plus a 5-point bonus at 2 L (max 15 a day).
  - Points come from the food log, so deleting a water entry takes its points back. They show on the Food page and are spent on the Rewards page.
  - **Request** (30 points): Menna writes what she wants.
  - **Surprise gift** (75 points): she pays the points and can add an optional hint; the gift is chosen for her.
  - **Make up a day**: each point adds 1 to the score of a finished day (not today or yesterday, which can still be logged), up to 100.
    - It only changes the score. It never turns a day into an active day for the milestone rewards.
  - Requests and gifts start as `pending`. The app has no screen for fulfilling them; update them directly in D1:
    - `UPDATE water_point_spends SET status = 'done', done_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = …` once fulfilled.
    - `status = 'cancelled'` gives the points back.
- **Calories (rough)** (`shared/calories.ts`): estimated from the food log text, so she never counts anything.
  - A dictionary of common (mostly Egyptian) foods gives typical portions, and simple amounts are read from the text ("2 توست", "رغيفين ونص", "نص معلقة عسل", "دبوسين").
  - Anything unrecognised counts as a typical meal size.
  - The Food page shows only rounded totals (to 50): the selected day and the average of the last 7 finished days. Reports show the period's daily average.
  - The target range comes from her original nutrition plan (1,850 kcal for days 1–14, 1,750 for days 15–30, 1,700 from day 31), shown as ±100. A chip says whether the weekly average is within it (`CALORIE_STAGES` in `shared/calories.ts`).
- **Reports**: weekly (7-day) and monthly (30-day) PDFs, both including the full food log (it paginates automatically) and average water intake.
- **Rewards**: unlock at 5, 10 and 30 *active days* (days with at least half the workout done).
  - They are surprises. Until a reward unlocks, the API replaces its title, description and emoji with a generic "مفاجأة يوم N" card (`hideIfLocked` in `shared/rewards.ts`), so the real details never reach the phone early.
  - A reward can have an optional `hint` (a teaser such as "من المشير"), shown on the locked card as "💌 تلميحة".
  - The app has no way to edit rewards. Set them directly in D1, e.g. `UPDATE rewards SET title = '…', description = '…', emoji = '…' WHERE id = 'day-5'` (ids: `day-5`, `day-10`, `day-30`).

### Database (D1)

`worker/migrations/` (0001 base schema, 0002 food log + weekly reports, 0003 reward hints, 0004 water points) creates these tables:

| Table | Purpose |
|---|---|
| `profile` | the single user and the program start date |
| `baseline_measurements` | the original values; read-only, enforced by triggers |
| `measurement_entries`, `measurement_values` | append-only measurement history, enforced by triggers |
| `daily_logs` | one row per calendar day, created automatically from the start date |
| `workouts`, `workout_exercises` | each session and every exercise actually performed, including switched alternatives |
| `exercise_feedback` | favourite and hardest exercise per day |
| `daily_scores` | the stored score breakdown per day, including points made up with water points |
| `rewards`, `reward_unlocks` | milestones and when they unlocked |
| `food_entries` | food & drink log |
| `water_point_spends` | water points spent on requests, surprise gifts and made-up days |
| `reports` | saved weekly and monthly report snapshots, so old PDFs can be re-created |

### Exercise media

- 33 of the 34 demos are **Gym visual** animations (© Gym visual — https://gymvisual.com/).
  - They come from the [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), which redistributes them with the rights holder's permission at 180×180, provided every use carries the credit.
  - The app shows the credit on every demo.
  - They are stored locally in `public/exercises/` as animated WebP, about half the size of the original GIFs.
- The dataset has no standing quad stretch, so `standing-quad-stretch.webp` is a drawn illustration in a matching style.
- The source mapping is in `scripts/exercise-media-sources.json`, and `scripts/build_exercise_media.py` rebuilds everything.
- Review Gym visual's terms (https://gymvisual.com/content/3-terms-and-conditions-of-use) if the app ever becomes more than a private personal app.

## Local development

```bash
npm install
npm run api:install                        # Worker dependencies (wrangler)
cp worker/.dev.vars.example worker/.dev.vars   # sets APP_PASSCODE for local dev
npm run api:migrate:local                  # create the local D1 schema
npm run api:dev                            # API on http://127.0.0.1:8787
echo "VITE_API_URL=http://127.0.0.1:8787" > .env.local
npm run dev                                # app on http://localhost:5173
```

Enter the passcode from `worker/.dev.vars` once in the app. Without `.env.local`, the app runs on the local-storage fallback instead.

Checks: `npm run check` runs lint, type checks (app + Worker), unit tests and the production build.

## Backend setup (Cloudflare) and deployment

Already done: the D1 database `menna-flow` exists (its id is in `worker/wrangler.toml`) and the schema is applied.

The Worker is deployed by the **Deploy API** GitHub workflow (`.github/workflows/deploy-api.yml`). One-time setup:

1. **Create a Cloudflare API token.** In Cloudflare → My Profile → API Tokens → Create Token, start from "Edit Cloudflare Workers" and add the permission **Account → D1 → Edit**.
2. **Add three repository secrets** in GitHub → Settings → Secrets and variables → Actions:
   - `CLOUDFLARE_API_TOKEN`: the token from step 1.
   - `CLOUDFLARE_ACCOUNT_ID`: shown on the Cloudflare dashboard (Workers & Pages, right sidebar).
   - `APP_PASSCODE`: the passcode Menna will type in the app.
3. **Run the workflow.** Go to Actions → Deploy API → Run workflow.

The workflow applies the migrations, deploys the Worker, sets the passcode, checks `/api/health`, and commits `public/api-config.json` with the Worker URL. That commit makes Vercel redeploy the app pointing at the API, so no Vercel variable is needed.

After that, open the site, enter the passcode, and press **ابدئي اليوم الأول النهارده**.

| Setting | Where | Purpose |
|---|---|---|
| `public/api-config.json` | written by the workflow | Worker URL the app reads at runtime |
| `VITE_API_URL` (optional) | Vercel env or `.env.local` | Build-time Worker URL. Overrides the file above. |
| `APP_PASSCODE` | GitHub secret → Worker secret (`worker/.dev.vars` locally) | Passcode checked by the API. Never in the frontend bundle. |
| `ALLOWED_ORIGINS` | `worker/wrangler.toml` `[vars]` | CORS allow-list. `*` covers Vercel preview URLs. |

Manual alternative: from `worker/`, run `npx wrangler login`, `npx wrangler secret put APP_PASSCODE`, `npm run migrate:remote`, then `npm run deploy`, and set `VITE_API_URL` in Vercel.

R2 is not needed: report snapshots are stored in D1 and the PDF is re-created from them on demand.
