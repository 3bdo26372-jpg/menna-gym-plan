-- How the night felt ('good' | 'okay' | 'bad') and an optional note from Menna.
ALTER TABLE daily_logs ADD COLUMN sleep_quality TEXT CHECK (sleep_quality IN ('good', 'okay', 'bad'));
ALTER TABLE daily_logs ADD COLUMN sleep_note TEXT;
