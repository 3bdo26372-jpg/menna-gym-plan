-- The daily score is now 40 workout + 30 water + 30 calories.
ALTER TABLE daily_scores ADD COLUMN water_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily_scores ADD COLUMN calorie_points INTEGER NOT NULL DEFAULT 0;
