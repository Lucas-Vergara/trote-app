import { createClient } from "@supabase/supabase-js";

// Entrega a la pestaña de recomendaciones los datos de estado físico que vienen
// de Intervals.icu: forma/fatiga (CTL/ATL), HRV, pulso en reposo, sueño, carga
// de los trotes recientes y las zonas de pulso configuradas.
// La clave de Intervals.icu solo vive en el servidor.

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const WELLNESS_DAYS = 42;
const ACTIVITY_DAYS = 42;

interface IntervalsWellness {
  id: string; // fecha YYYY-MM-DD
  ctl?: number | null;
  atl?: number | null;
  rampRate?: number | null;
  restingHR?: number | null;
  hrv?: number | null;
  sleepSecs?: number | null;
  sleepScore?: number | null;
  readiness?: number | null;
}

interface IntervalsActivity {
  id: string;
  start_date_local: string;
  type: string;
  distance?: number | null;
  moving_time?: number | null;
  average_heartrate?: number | null;
  icu_training_load?: number | null;
}

interface SportSettings {
  types?: string[];
  hr_zones?: number[] | null;
  max_hr?: number | null;
  lthr?: number | null;
}

const jsonError = (status: number, error: string) =>
  Response.json({ error }, { status });

const isoDaysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const num = (v: unknown) =>
  typeof v === "number" && isFinite(v) ? v : null;

export async function POST(request: Request) {
  const apiKey = process.env.INTERVALS_API_KEY;
  const athleteId = process.env.INTERVALS_ATHLETE_ID || "0";
  const allowedEmail = process.env.SYNC_ALLOWED_EMAIL?.trim().toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!apiKey || !allowedEmail || !supabaseUrl || !supabaseKey) {
    return jsonError(501, "La conexión con Intervals.icu no está configurada.");
  }

  // Solo el dueño de la cuenta de Intervals.icu puede ver sus datos
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError(401, "Falta la sesión.");
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return jsonError(401, "Sesión inválida.");
  if (userData.user.email?.toLowerCase() !== allowedEmail) {
    return jsonError(403, "Esta cuenta no está conectada a Intervals.icu.");
  }

  const base = `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athleteId)}`;
  const headers = {
    Authorization: `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString("base64")}`,
  };
  const get = async <T,>(url: string): Promise<T | null> => {
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        console.error("Intervals.icu respondió", res.status, url);
        return null;
      }
      return (await res.json()) as T;
    } catch (e) {
      console.error("Error consultando Intervals.icu:", e);
      return null;
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const activityFields =
    "id,start_date_local,type,distance,moving_time,average_heartrate,icu_training_load";

  const [wellness, activities, athlete] = await Promise.all([
    get<IntervalsWellness[]>(
      `${base}/wellness?oldest=${isoDaysAgo(WELLNESS_DAYS)}&newest=${today}`,
    ),
    get<IntervalsActivity[]>(
      `${base}/activities?oldest=${isoDaysAgo(ACTIVITY_DAYS)}&fields=${activityFields}`,
    ),
    get<{ sportSettings?: SportSettings[] }>(base),
  ]);

  if (!wellness && !activities) {
    return jsonError(502, "No se pudo leer Intervals.icu.");
  }

  // Zonas de pulso de trote: hr_zones son los límites superiores de cada zona
  const runSettings = athlete?.sportSettings?.find((s) =>
    s.types?.some((t) => RUN_TYPES.has(t)),
  );
  const zones = runSettings?.hr_zones?.filter((z) => typeof z === "number") || [];
  const zone2 = zones.length >= 2 ? { min: zones[0] + 1, max: zones[1] } : null;

  return Response.json({
    wellness: (wellness || [])
      .map((w) => ({
        date: w.id,
        ctl: num(w.ctl),
        atl: num(w.atl),
        rampRate: num(w.rampRate),
        restingHR: num(w.restingHR),
        hrv: num(w.hrv),
        sleepHours: num(w.sleepSecs) !== null ? (w.sleepSecs as number) / 3600 : null,
        sleepScore: num(w.sleepScore),
        readiness: num(w.readiness),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    runs: (activities || [])
      .filter((a) => RUN_TYPES.has(a.type) && (a.distance || 0) > 0)
      .map((a) => ({
        date: a.start_date_local.slice(0, 10),
        km: Math.round((a.distance as number) / 10) / 100,
        minutes: Math.round((a.moving_time || 0) / 60),
        avgHR: num(a.average_heartrate),
        load: num(a.icu_training_load),
      })),
    zone2,
    maxHR: num(runSettings?.max_hr),
  });
}
