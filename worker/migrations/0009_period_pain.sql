-- Period pain Menna rates for a day (1–10, or 0 for none). Above 4 the day is
-- a rest day: the workout's points count without training (shared/period.ts).
ALTER TABLE daily_logs ADD COLUMN period_pain INTEGER CHECK (period_pain BETWEEN 0 AND 10);

-- Workout points a rest day filled in, included in `total`.
ALTER TABLE daily_scores ADD COLUMN rest_points INTEGER NOT NULL DEFAULT 0;
