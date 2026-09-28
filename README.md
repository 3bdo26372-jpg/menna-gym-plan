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
  - reward defaults (`rewards.ts`)
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
- **Weekly shape**: a 4-day cycle of three active day types, then a **Light Movement Day** (يوم حركة خفيفة: easy movement plus stretching). There is never a "rest day".
  - Exercises rotate daily so neighbouring days differ.
- **Duration**: level 0 sessions are about 18 minutes (Light Movement Days about 15); the top level stays under 28 minutes.
- **Adaptation**:
  - Three workouts in a row rated *Easy* move up one level, and each level changes exactly one variable (work time, rest, rounds, more jumps, core rounds).
  - Two *Hard* ratings move down a level. After a *Hard* rating, or a low-energy / tired check-in, the jumps are swapped for their alternatives and the intervals get shorter.
  - Reporting pain holds the level and makes the next day light.
- **Daily score** (max 100): check-in 15, workout 60 (proportional to the main work actually done), warm-up 5, cooldown 5, feedback 15. Harder or longer sessions never earn extra points.
- **Rewards**: unlock at 5, 10 and 30 *active days* (days with at least half the workout done). Titles and descriptions are placeholders you can edit on the Rewards page (they're stored in D1).

### Database (D1)

`worker/migrations/0001_init.sql` creates these tables:

| Table | Purpose |
|---|---|
| `profile` | the single user and the program start date |
| `baseline_measurements` | the original values; read-only, enforced by triggers |
| `measurement_entries`, `measurement_values` | append-only measurement history, enforced by triggers |
| `daily_logs` | one row per calendar day, created automatically from the start date |
| `workouts`, `workout_exercises` | each session and every exercise actually performed, including switched alternatives |
| `exercise_feedback` | favourite and hardest exercise per day |
| `daily_scores` | the stored score breakdown per day |
| `rewards`, `reward_unlocks` | milestones and when they unlocked |
| `monthly_reports` | saved report snapshots, so old PDFs can be re-created |

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

One-time, from the repository root:

```bash
npm run api:install
cd worker
npx wrangler login
npx wrangler d1 create menna-flow           # copy the printed database_id into worker/wrangler.toml
npx wrangler secret put APP_PASSCODE        # the passcode Menna will type in the app
npm run migrate:remote                      # create the tables in the real D1 database
npm run deploy                              # prints https://menna-flow-api.<subdomain>.workers.dev
```

Then:

1. In `worker/wrangler.toml`, add the Vercel URL to `ALLOWED_ORIGINS` (comma-separated, e.g. `https://menna-gym-plan.vercel.app,http://localhost:5173`) and run `npm run deploy` again.
2. In Vercel → the `menna-gym-plan` project → Settings → Environment Variables, set `VITE_API_URL` to the Worker URL (Production and Preview), then redeploy.
3. Open the site, enter the passcode, and press **ابدئي اليوم الأول النهارده** to set Day 1. The profile, baseline and reward placeholders are created automatically on the first request.

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | Vercel env (and `.env.local`) | Worker URL. Not secret. |
| `APP_PASSCODE` | `wrangler secret put` (and `worker/.dev.vars` locally) | Shared passcode checked by the API. Never in the frontend bundle. |
| `ALLOWED_ORIGINS` | `worker/wrangler.toml` `[vars]` | Origins allowed by CORS. |

R2 is not needed: report snapshots are stored in D1 and the PDF is re-created from them on demand.
