-- 'period' passes are the free ones on the first days of a period (one a day);
-- they don't use up the first free pass or a gift. See shared/dayPasses.ts.
ALTER TABLE day_passes ADD COLUMN kind TEXT NOT NULL DEFAULT 'regular' CHECK (kind IN ('regular', 'period'));
