-- SINCRONIZACIÓN CON ZEPP (VÍA INTERVALS.ICU)
-- Ejecuta este script una vez en el editor SQL (SQL Editor) de Supabase.

-- Identificador de la actividad de origen (ej. "intervals:i12345678"),
-- usado para no importar dos veces el mismo trote.
ALTER TABLE runs ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS runs_user_external_id_key
  ON runs (user_id, external_id);
