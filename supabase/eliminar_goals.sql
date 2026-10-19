-- ELIMINAR LAS METAS FIJAS (TABLA goals)
-- Las metas semanales y mensuales se reemplazaron por el objetivo de ritmo en
-- zona 2, con volumen y sesiones calculados por la app. Ejecuta este script una
-- vez en el editor SQL (SQL Editor) de Supabase, después de desplegar la
-- versión que ya no lee la tabla.

DROP TABLE IF EXISTS goals;
