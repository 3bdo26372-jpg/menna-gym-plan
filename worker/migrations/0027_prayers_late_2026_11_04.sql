-- Menna prayed all five prayers on 2026-11-04 but late, and forgot to tick
-- them. Each is logged two hours after its time in Cairo (04:43, 11:40,
-- 14:43, 17:06, 18:25 that day, UTC+2), so it counts as a late prayer:
-- Fajr keeps its 10 points and the others get 6 each. A prayer she already
-- ticked that day is left as it is.
INSERT OR IGNORE INTO prayers (log_date, prayer, prayed_at) VALUES
  ('2026-11-04', 0, '2026-11-04T04:43:00.000Z'),
  ('2026-11-04', 1, '2026-11-04T11:40:00.000Z'),
  ('2026-11-04', 2, '2026-11-04T14:43:00.000Z'),
  ('2026-11-04', 3, '2026-11-04T17:06:00.000Z'),
  ('2026-11-04', 4, '2026-11-04T18:25:00.000Z');
