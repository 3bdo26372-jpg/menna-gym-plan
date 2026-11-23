-- Menna tried to add «آيزو» at 2:00 at night on 2026-11-23, but the app only
-- took times from 05:00 then. It does now; this adds the one she wanted,
-- from today (Cairo), unless she already added it herself.
INSERT INTO pills (name, time, added_on)
  SELECT 'آيزو', '02:00', date('now', '+2 hours')
  WHERE NOT EXISTS (SELECT 1 FROM pills WHERE name = 'آيزو' AND removed_on IS NULL);

-- And a note to her, sent on the Worker's next run.
INSERT INTO push_messages (title, body) VALUES (
  'حقك عليّا يا منه، أنا آسف 🤍',
  'البرنامج ماكانش بيقبل مواعيد بعد 12 بالليل، عشان كده الآيزو ماتضافتش. صلّحته وضفتهالك على الساعة 2 الفجر، وهفكرك بيها كل يوم في ميعادها 💊'
);
