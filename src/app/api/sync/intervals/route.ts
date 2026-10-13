import { createClient } from "@supabase/supabase-js";

// Importa los trotes registrados en Zepp (vía Intervals.icu) a la tabla runs
// del usuario autenticado. La clave de Intervals.icu solo vive en el servidor.

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const DEFAULT_DAYS = 30;
const MAX_DAYS = 400;

interface IntervalsActivity {
  id: string;
  start_date_local: string;
  type: string;
  name?: string;
  distance?: number | null; // metros
  moving_time?: number | null; // segundos
  elapsed_time?: number | null; // segundos
  average_heartrate?: number | null;
}

interface ExistingRun {
  id: string;
  date: string;
  distance: number | null;
  external_id: string | null;
}

const jsonError = (status: number, error: string) =>
  Response.json({ error }, { status });

export async function POST(request: Request) {
  const apiKey = process.env.INTERVALS_API_KEY;
  const athleteId = process.env.INTERVALS_ATHLETE_ID || "0";
  const allowedEmail = process.env.SYNC_ALLOWED_EMAIL?.trim().toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!apiKey || !allowedEmail || !supabaseUrl || !supabaseKey) {
    return jsonError(501, "La sincronización con Intervals.icu no está configurada.");
  }

  // 1. Validar la sesión del usuario (solo el dueño de la cuenta de Intervals.icu)
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError(401, "Falta la sesión.");

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return jsonError(401, "Sesión inválida.");
  if (userData.user.email?.toLowerCase() !== allowedEmail) {
    return jsonError(403, "Esta cuenta no tiene sincronización con Intervals.icu.");
  }

  // 2. Rango de fechas a revisar
  const body = await request.json().catch(() => ({}));
  const days = Math.min(MAX_DAYS, Math.max(1, Number(body?.days) || DEFAULT_DAYS));
  const oldestDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const oldest = oldestDate.toISOString().split("T")[0];

  // 3. Traer actividades desde Intervals.icu
  const fields = "id,start_date_local,type,name,distance,moving_time,elapsed_time,average_heartrate";
  const intervalsRes = await fetch(
    `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}/activities?oldest=${oldest}&fields=${fields}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString("base64")}`,
      },
      cache: "no-store",
    },
  );
  if (!intervalsRes.ok) {
    console.error("Intervals.icu respondió", intervalsRes.status, await intervalsRes.text());
    return jsonError(502, `Intervals.icu respondió con error ${intervalsRes.status}.`);
  }
  const activities = (await intervalsRes.json()) as IntervalsActivity[];

  // Solo trotes con distancia; se descartan duplicados del propio Intervals.icu
  // (misma fecha y hora de inicio y distancia similar)
  const seen = new Set<string>();
  const runs = activities.filter((a) => {
    if (!RUN_TYPES.has(a.type) || !a.distance || a.distance <= 0) return false;
    const key = `${a.start_date_local.slice(0, 16)}|${Math.round(a.distance / 100)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 4. Comparar con lo que ya está en la base de datos
  const { data: existingData, error: existingError } = await supabase
    .from("runs")
    .select("id,date,distance,external_id")
    .gte("date", oldest);
  if (existingError) {
    console.error("Error leyendo runs:", existingError);
    const missingColumn = existingError.code === "42703";
    return jsonError(
      500,
      missingColumn
        ? "Falta la columna external_id en la tabla runs (ejecuta supabase/intervals_sync.sql)."
        : "No se pudieron leer los entrenamientos existentes.",
    );
  }
  const existing = (existingData || []) as ExistingRun[];
  const knownIds = new Set(existing.map((r) => r.external_id).filter(Boolean));

  let imported = 0;
  let linked = 0;
  let skipped = 0;

  for (const activity of runs) {
    const externalId = `intervals:${activity.id}`;
    if (knownIds.has(externalId)) {
      skipped++;
      continue;
    }

    const date = activity.start_date_local.slice(0, 10);
    const distanceKm = Math.round((activity.distance as number) / 10) / 100;
    const seconds = activity.moving_time || activity.elapsed_time || 0;
    const duration = Math.max(1, Math.round(seconds / 60));

    // Si ya registraste ese trote a mano, se vincula en vez de duplicarlo
    const manual = existing.find(
      (r) =>
        !r.external_id &&
        r.date === date &&
        r.distance !== null &&
        Math.abs(Number(r.distance) - distanceKm) <= Math.max(0.3, distanceKm * 0.1),
    );
    if (manual) {
      const { error } = await supabase
        .from("runs")
        .update({ external_id: externalId })
        .eq("id", manual.id);
      if (error) {
        console.error("Error vinculando run:", error);
      } else {
        manual.external_id = externalId;
        linked++;
      }
      continue;
    }

    const { error } = await supabase.from("runs").insert([
      {
        date,
        distance: distanceKm,
        duration,
        type: "run",
        avg_bpm: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
        notes: activity.name ? `${activity.name} · importado desde Zepp` : "Importado desde Zepp",
        external_id: externalId,
      },
    ]);
    if (error && error.code !== "23505") {
      // 23505 = ya importado por otra sincronización simultánea
      console.error("Error insertando run:", error);
      continue;
    }
    if (!error) imported++;
    else skipped++;
  }

  return Response.json({ imported, linked, skipped, checked: runs.length, days });
}
