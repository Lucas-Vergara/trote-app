-- SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS (SUPABASE)
-- Copia y ejecuta este script en el editor SQL (SQL Editor) de Supabase

-- 1. Crear la tabla de carreras (runs)
CREATE TABLE IF NOT EXISTS runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  distance NUMERIC(5,2) NOT NULL, -- En kilómetros (ej. 12.50)
  duration INTEGER NOT NULL,      -- Duración en minutos
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear la tabla de metas (goals)
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('weekly', 'monthly')),
  target_distance NUMERIC(5,2) NOT NULL, -- Distancia objetivo en km
  target_runs INTEGER NOT NULL,          -- Cantidad de corridas objetivo
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar seguridad de nivel de fila (Row Level Security - RLS) para protección básica
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de acceso (para una app personal, permitimos lectura/escritura pública por simplicidad,
-- o puedes restringirlas si añades autenticación en el futuro)
CREATE POLICY "Permitir lectura pública en runs" ON runs FOR SELECT USING (true);
CREATE POLICY "Permitir inserción pública en runs" ON runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización pública en runs" ON runs FOR UPDATE USING (true);
CREATE POLICY "Permitir borrado público en runs" ON runs FOR DELETE USING (true);

CREATE POLICY "Permitir lectura pública en goals" ON goals FOR SELECT USING (true);
CREATE POLICY "Permitir inserción pública en goals" ON goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización pública en goals" ON goals FOR UPDATE USING (true);
CREATE POLICY "Permitir borrado público en goals" ON goals FOR DELETE USING (true);
