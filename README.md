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
  - period tracking and the next-period prediction (`period.ts`)
- **`worker/`**: the Cloudflare Worker API.
  - D1 schema in `worker/migrations/`, queries in `worker/src/db.ts`, routes in `worker/src/index.ts`.
  - Seeding is idempotent (`INSERT OR IGNORE`, run the first time the API is used), so deploys never reset the baseline.
- **`src/`**: the React app.
  - Pages: `pages/` (Today, Progress, Measurements, Rewards, Reports, Period).
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
- **Daily score** (max 100, `shared/scoring.ts`): 40 workout + 30 water + 30 calories.
  - Workout (40): check-in 6, main work 24 (proportional to what was done), warm-up 2, cooldown 2, feedback 6. Harder or longer sessions never earn extra points.
  - Water (30): proportional to the 2 L target.
  - Calories (30): full points from 1,200 kcal up to the top of the day's range. Above it, 1 point is lost per 25 kcal. Below 1,200, points shrink.
  - A day pass fills the day up to 100. Adding or deleting food re-scores that day.
- **Food & drink log**: each entry has a time, a category (breakfast, lunch, dinner, snack or drink), the item and an optional amount/ml. Water is totalled against a 2–2.5 L daily target. Today and the 6 days before it can be logged or corrected. The daily score is unchanged.
- **Points (نقطها)** (`shared/points.ts`): one balance, spent on requests, surprise gifts and day passes. Points are earned by reaching goals, not for every step:
  - 2.5 L of water in a day: 5. This counts as soon as she reaches it.
  - A finished day eaten within the calorie range (1,200 up to the top): 5.
  - A finished day's score: 60+ gives 3, 80+ gives 6, 100 gives 10. This is the score she earned herself; a day pass or makeup doesn't count.
  - Every 7 workout days in a row: 15.
  - A perfect day is worth about 20. Everything is derived from the log, so deleting an entry takes its points back.
  - **Request** (30 points): Menna writes what she wants. **Surprise gift** (75): she can add a hint and the gift is chosen for her.
  - Requests and gifts start as `pending`. Fulfil them in D1 with `UPDATE water_point_spends SET status = 'done', done_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = …`. Setting `status = 'cancelled'` gives the points back.
- **New system start:** the 40/30/30 split and goal-based points start on `NEW_SYSTEM_FROM` (2026-10-02, `shared/scoring.ts`).
  - Earlier days keep the original scoring: the workout alone is worth 100.
  - They also keep their original points: a point per 250 ml of water (up to 10) plus 5 at 2 L, and 10 for a day within the calorie range.
- **Calories she writes herself** (e.g. "١٦١ كالوري", "350 سعرة") are used instead of the estimate.
- **Day passes (الإكسبشن)** (`shared/dayPasses.ts`): complete a day that is short of 100 (today or earlier, once per day).
  - The score is filled to 100 and the day counts as an active day for the milestone rewards.
  - The first pass is free. Later ones cost 50 points.
  - The home page offers one when yesterday's workout was missed.
  - **Gift passes:** each row in `pass_gifts` is one more free pass. Its note shows on the home page until it is used. Migration 0007 adds the first one. Add more with `INSERT INTO pass_gifts (note) VALUES ('…')`.
- **Period tracking (البريود)** (`shared/period.ts`, page `#/period`):
  - Menna logs the day a period starts, with one tap on the home page (**بدأ النهارده**) or any date on the period page, and optionally the day it ends. A past month can be logged with both dates at once.
  - The period page has a month-by-month table (month, came on, ended on, length). Tapping a month's end date sets or corrects it, or deletes the month.
  - The next start is the latest start plus her average cycle: the gaps between her last 6 starts, ignoring gaps under 18 or over 50 days (usually a start that wasn't logged). Until there are two starts it uses 28 days. Period length works the same from the ends she logs (5 days by default).
  - The home page always has a period card. From 3 days before the expected start, on the day, and while it is late, it turns into a warning at the top of the page. During a period it shows the day of the period and a reminder to go easy.
  - Starts less than 10 days apart are refused as the same period logged twice. Periods don't affect the score or points.
- **Period pain (وجع البريود)**: she taps **عندي وجع بريود** on the period card on the home page and rates the pain 1–10 (or "مفيش وجع"); yesterday can be rated on the period page.
  - Above 4 the day is a rest day: the workout's 40 points are filled in (`rest` in the score) without training. The day doesn't count as a workout day for rewards, earns no score-tier points from that credit, and neither adds to nor breaks the 7-day streak. If she trains anyway (half the workout), it counts as usual.
  - On those days the workout is a tiny ~5-minute session of gentle moves and stretches. Milder pain (1–4) takes the jumps out.
  - The home page doesn't offer a pass for a missed workout on a rest day.
- **Greeting** (`src/lib/greetings.ts`): the line at the top of the home page follows her day (a pain rest day, a full 100, the water target, the workout, a nudge from 7 pm with no workout, her period, or the time of day), with a few lines per case rotating daily.
- **Bottom bar**: 7 tabs don't fit on a phone, so the bar scrolls sideways; the tab cut off at the edge shows there are more. The current tab is scrolled into view when a link opens a page.
- **Reports**: weekly (7-day) and monthly (30-day) PDFs, both including the full food log (it paginates automatically) and average water intake.
- **Rewards**: unlock at 5, 10 and 30 *active days* (days with at least half the workout done).
  - They are surprises. Until a reward unlocks, the API replaces its title, description and emoji with a generic "مفاجأة يوم N" card (`hideIfLocked` in `shared/rewards.ts`), so the real details never reach the phone early.
  - A reward can have an optional `hint` (a teaser such as "من المشير"), shown on the locked card as "💌 تلميحة".
  - The app has no way to edit rewards. Set them directly in D1, e.g. `UPDATE rewards SET title = '…', description = '…', emoji = '…' WHERE id = 'day-5'` (ids: `day-5`, `day-10`, `day-30`).

### Database (D1)

`worker/migrations/` (0001 base schema, 0002 food log + weekly reports, 0003 reward hints, 0004 water points, 0005 day passes, 0006 water and calorie score columns, 0007 gift passes, 0008 periods, 0009 period pain) creates these tables:

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
| `day_passes` | days completed with a pass, and the points each cost |
| `pass_gifts` | gifted free passes and their notes |
| `periods` | each period's start date and, once marked, its last day |
| `reports` | saved weekly and monthly report snapshots, so old PDFs can be re-created |

### Exercise media

- 33 of the 34 demos are **Gym visual** animations (© Gym visual — https://gymvisual.com/).
  - They come from the [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), which redistributes them with the rights holder's permission at 180×180, provided every use carries the credit.
  - The app shows the credit on every demo.
  - They are stored locally in `public/exercises/` as animated WebP, about half the size of the original GIFs.
- The dataset has no standing quad stretch, so `standing-quad-stretch.webp` is a drawn illustration in a matching style.
- The source mapping is in `scripts/exercise-media-sources.json`, and `scripts/build_exercise_media.py` rebuilds everything.
- Review Gym visual's terms (https://gymvisual.com/content/3-terms-and-conditions-of-use) if the app ever becomes more than a private personal app.

### Speed

- **First screen:** the JS needed for it is about 107 kB gzipped. The animation engine (`LazyMotion`), the workout player and the other pages load after it.
- **API connection:** production builds bake in the API URL from `public/api-config.json`, so there is no extra request before the first API call. `vite.config.ts` adds a `preconnect` to the API.
- **Caching:** `vercel.json` caches hashed `/assets` for a year and exercise media and icons for a week.
- **Server:** `loadState` makes two database round trips.
- **Measurement:** Vercel Speed Insights (`@vercel/speed-insights/react` in `src/main.tsx`) reports real load times once it is enabled for the project.

### Installing on the phone

The app is installable as a home-screen app (PWA), with `public/manifest.webmanifest`, the icons in `public/icons/` and the iOS meta tags in `index.html`:
- **iPhone:** open the site in Safari → Share → **Add to Home Screen**. It opens full screen with its own icon.
- **Android:** use Chrome's **Install app**.

On iPhone the installed app keeps its own storage, so the passcode is typed once more there.

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
