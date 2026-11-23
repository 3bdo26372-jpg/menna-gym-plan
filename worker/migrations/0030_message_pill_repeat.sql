-- Tells Menna a pill can now repeat every few hours; sent on the Worker's next run.
INSERT INTO push_messages (title, body) VALUES (
  'حاجة جديدة في البرشام 💊',
  'لو في برشامة بتاخديها كذا مرة في اليوم، مش محتاجة تضيفيها كذا مرة. افتحي صفحة البرشام واختاري «بتتكرر؟» كل 4 أو 6 أو 8 أو 12 ساعة، وأنا هفكرك بكل جرعة في ميعادها 🤍'
);
