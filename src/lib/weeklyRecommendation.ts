// Motor de recomendaciones semanales de trote.
// El objetivo es un ritmo en zona 2 (ej. 8:30 min/km sin pasar de 146 ppm):
// se mide el ritmo que rindes a ese pulso, y el volumen y la cantidad de
// sesiones de la semana se ajustan solos para mejorarlo sin lesionarte,
// respetando el cansancio (forma/fatiga, HRV, pulso en reposo, sueño).
// Todo en hora local, semanas de lunes a domingo.

export interface AppRun {
  date: string;
  distance: number | null;
  duration: number;
  type?: string;
  avg_bpm?: number | null;
}

export interface WellnessDay {
  date: string;
  ctl: number | null;
  atl: number | null;
  rampRate: number | null;
  restingHR: number | null;
  hrv: number | null;
  sleepHours: number | null;
  sleepScore: number | null;
  readiness: number | null;
}

export interface IntervalsData {
  wellness: WellnessDay[];
  runs: {
    date: string;
    km: number;
    minutes: number;
    avgHR: number | null;
    load: number | null;
    decoupling: number | null;
  }[];
  zone2: { min: number; max: number } | null;
  maxHR: number | null;
}

// Objetivo: trotar a `pace` min/km con pulso medio bajo `maxHR`
export interface PaceGoal {
  pace: number;
  maxHR: number;
}

export const DEFAULT_PACE_GOAL: PaceGoal = { pace: 8.5, maxHR: 146 };

export interface PacePoint {
  date: string;
  eq: number; // ritmo equivalente a maxHR
  trend: number; // promedio móvil de los últimos 5 trotes
  pace: number; // ritmo real
  avgHR: number;
  km: number;
}

export interface WeekVolume {
  weekStart: string;
  km: number;
  sessions: number;
}

export interface PaceProgress {
  goal: PaceGoal;
  series: PacePoint[]; // últimas 12 semanas
  current: number | null; // ritmo equivalente a maxHR, trotes recientes
  start: number | null; // el mismo ritmo hace ~2 meses, para medir avance
  progressPct: number | null;
  trendPerWeek: number | null; // segundos/km por semana (negativo = mejorando)
  weeksToGoal: number | null;
  inZoneShare: number | null; // fracción de trotes recientes bajo maxHR
  samples: number;
  reached: boolean;
  headline: string;
  detail: string;
}

export type SignalLevel = "ok" | "warn" | "bad" | "info";
export type FatigueLevel = "baja" | "moderada" | "alta";
export type SessionKind = "easy" | "long" | "recovery";

export interface Signal {
  label: string;
  value: string;
  level: SignalLevel;
  hint: string;
}

export interface PlannedSession {
  kind: SessionKind;
  title: string;
  km: number;
  minutes: number;
  parts?: number[]; // doble: km de cada sesión corta del día
}

export interface PlanDay {
  date: string;
  weekday: string;
  isToday: boolean;
  isPast: boolean;
  doneKm: number; // km ya trotados ese día
  session: PlannedSession | null;
}

export interface WeekPlan {
  weekStart: string;
  targetKm: number;
  targetSessions: number;
  doneKm: number;
  doneSessions: number;
  fatigue: FatigueLevel;
  todayHeadline: string;
  todayDetail: string;
  days: PlanDay[];
  signals: Signal[];
  reasons: string[];
  hrGuide: string;
  paceGuide: string;
  usedIntervals: boolean;
  recovery: RecoveryTips;
  pace: PaceProgress;
  history: WeekVolume[]; // semanas completas anteriores, de la más antigua a la más reciente
}

export interface RecoveryTip {
  icon: string;
  title: string;
  text: string;
}

export interface RecoveryTips {
  food: RecoveryTip[];
  rest: RecoveryTip[];
}

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MIN_SESSION_KM = 2.5;
const DEFAULT_PACE = 7; // min/km si no hay historial
const DEFAULT_REST_HR = 60;
const MAX_RUN_DAYS = 6; // siempre queda al menos un día de descanso
const MAX_DOUBLES = 2; // días en doble por semana

// --- Fechas ---
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parse = (s: string) => new Date(s + "T00:00:00");
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
const startOfWeek = (d: Date) => {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
};

// --- Números ---
const round05 = (n: number) => Math.round(n * 2) / 2;
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
export const formatPace = (minPerKm: number) => {
  let m = Math.floor(minPerKm);
  let s = Math.round((minPerKm - m) * 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
};
const fmtKm = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 1 });

// --- Señales de cansancio desde Intervals.icu ---
function wellnessSignals(wellness: WellnessDay[]): Signal[] {
  const signals: Signal[] = [];
  const latest = <K extends keyof WellnessDay>(key: K) =>
    [...wellness].reverse().find((w) => w[key] !== null);

  // Forma = fitness (CTL) − fatiga (ATL)
  const load = [...wellness].reverse().find((w) => w.ctl !== null && w.atl !== null);
  if (load) {
    const tsb = (load.ctl as number) - (load.atl as number);
    const level: SignalLevel = tsb < -30 ? "bad" : tsb < -20 ? "warn" : "ok";
    signals.push({
      label: "Forma",
      value: `${tsb > 0 ? "+" : ""}${Math.round(tsb)}`,
      level,
      hint:
        level === "bad"
          ? "Fatiga acumulada alta"
          : level === "warn"
            ? "Bastante cargado"
            : tsb > 5
              ? "Fresco"
              : "Carga productiva",
    });
    signals.push({
      label: "Fitness / Fatiga",
      value: `${Math.round(load.ctl as number)} / ${Math.round(load.atl as number)}`,
      level: "info",
      hint: "CTL (42 días) / ATL (7 días)",
    });
  }

  const ramp = latest("rampRate");
  if (ramp && (ramp.rampRate as number) > 6) {
    signals.push({
      label: "Subida de carga",
      value: `+${Math.round(ramp.rampRate as number)}/sem`,
      level: "warn",
      hint: "El fitness está subiendo rápido",
    });
  }

  // HRV: último valor vs promedio de los 7 anteriores
  const hrvDays = wellness.filter((w) => w.hrv !== null);
  if (hrvDays.length >= 4) {
    const last = hrvDays[hrvDays.length - 1].hrv as number;
    const prev = mean(hrvDays.slice(-8, -1).map((w) => w.hrv as number));
    const ratio = prev > 0 ? last / prev : 1;
    signals.push({
      label: "HRV",
      value: `${Math.round(last)} ms`,
      level: ratio < 0.85 ? "bad" : ratio < 0.92 ? "warn" : "ok",
      hint: `${ratio >= 1 ? "+" : ""}${Math.round((ratio - 1) * 100)}% vs tu semana`,
    });
  }

  // Pulso en reposo: último vs promedio de 28 días
  const rhrDays = wellness.filter((w) => w.restingHR !== null);
  if (rhrDays.length >= 4) {
    const last = rhrDays[rhrDays.length - 1].restingHR as number;
    const prev = mean(rhrDays.slice(-29, -1).map((w) => w.restingHR as number));
    const diff = last - prev;
    signals.push({
      label: "Pulso en reposo",
      value: `${Math.round(last)} ppm`,
      level: diff >= 8 ? "bad" : diff >= 5 ? "warn" : "ok",
      hint: `${diff >= 0 ? "+" : ""}${Math.round(diff)} vs tu promedio`,
    });
  }

  // Sueño de la última noche registrada (solo si es de hoy o ayer)
  const sleep = latest("sleepHours");
  if (sleep) {
    const age = (Date.now() - parse(sleep.date).getTime()) / 86400000;
    if (age < 2) {
      const h = sleep.sleepHours as number;
      signals.push({
        label: "Sueño",
        value: `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`,
        level: h < 5.5 ? "bad" : h < 6.5 ? "warn" : "ok",
        hint: h < 6.5 ? "Dormiste poco" : "Descanso suficiente",
      });
    }
  }

  return signals;
}

// --- Elección de días: repartir sin días seguidos cuando se pueda ---
function chooseDays(candidates: number[], k: number, ranBefore: Set<number>): number[] {
  if (k <= 0) return [];
  if (k >= candidates.length) return [...candidates];
  let best: number[] = [];
  let bestScore = Infinity;
  const pick = (start: number, chosen: number[]) => {
    if (chosen.length === k) {
      let score = 0;
      const all = new Set([...chosen, ...ranBefore]);
      for (const d of chosen) {
        if (all.has(d - 1)) score += 10; // trotar dos días seguidos
        if (all.has(d - 1) && all.has(d - 2)) score += 20; // tres seguidos
      }
      // Preferir que haya un día de fin de semana para el fondo
      if (!chosen.some((d) => d >= 5)) score += 3;
      // Repartir: penalizar grandes huecos
      const sorted = [...chosen].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) score += Math.max(0, sorted[i] - sorted[i - 1] - 2);
      if (score < bestScore) {
        bestScore = score;
        best = [...chosen];
      }
      return;
    }
    for (let i = start; i < candidates.length; i++) {
      chosen.push(candidates[i]);
      pick(i + 1, chosen);
      chosen.pop();
    }
  };
  pick(0, []);
  return best.sort((a, b) => a - b);
}

// --- Ritmo en zona 2 ---
// Cada trote con pulso se lleva al ritmo que habría tenido justo en maxHR,
// usando la reserva de pulso (pulso medio − reposo): un trote a 9:00 con 152 ppm
// equivale a algo más lento a 146, y uno a 9:30 con 140 ppm, a algo más rápido.
// Solo se usan trotes cercanos al tope para no extrapolar de más.
function equivalentPace(pace: number, avgHR: number, goal: PaceGoal, restHR: number) {
  if (Math.abs(avgHR - goal.maxHR) > 20) return null;
  const used = avgHR - restHR;
  const reserve = goal.maxHR - restHR;
  if (used <= 20 || reserve <= 20) return null;
  return (pace * used) / reserve;
}

function analyzePace(
  runs: { date: string; km: number; minutes: number; avgHR: number | null }[],
  goal: PaceGoal,
  restHR: number,
  today: Date,
): PaceProgress {
  const samples = runs
    .filter((r) => r.avgHR !== null && r.minutes > 0 && r.km >= 1.5)
    .map((r) => {
      const pace = r.minutes / r.km;
      return {
        date: r.date,
        avgHR: r.avgHR as number,
        km: r.km,
        pace,
        eq: pace > 4 && pace < 15 ? equivalentPace(pace, r.avgHR as number, goal, restHR) : null,
      };
    })
    .filter((s): s is Omit<PacePoint, "trend"> => s.eq !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const daysAgo = (iso: string) => (today.getTime() - parse(iso).getTime()) / 86400000;
  const recent = samples.filter((s) => daysAgo(s.date) <= 42);
  const current = recent.length ? mean(recent.slice(-5).map((s) => s.eq)) : null;
  const older = samples.filter((s) => daysAgo(s.date) > 42 && daysAgo(s.date) <= 84);
  const start = older.length >= 2 ? median(older.slice(0, 5).map((s) => s.eq)) : null;

  // Tendencia: regresión lineal de las últimas 8 semanas
  let trendPerWeek: number | null = null;
  const window = samples.filter((s) => daysAgo(s.date) <= 56);
  if (window.length >= 4 && daysAgo(window[0].date) - daysAgo(window[window.length - 1].date) >= 14) {
    const xs = window.map((s) => -daysAgo(s.date));
    const ys = window.map((s) => s.eq);
    const mx = mean(xs);
    const my = mean(ys);
    const cov = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0);
    const varX = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
    if (varX > 0) trendPerWeek = (cov / varX) * 7 * 60;
  }

  const last10 = samples.slice(-10);
  const inZoneShare = last10.length
    ? last10.filter((s) => s.avgHR <= goal.maxHR).length / last10.length
    : null;

  const gapSecs = current !== null ? Math.round((current - goal.pace) * 60) : null;
  const reached = gapSecs !== null && gapSecs <= 0;
  const weeksToGoal =
    gapSecs !== null && !reached && trendPerWeek !== null && trendPerWeek < -0.5
      ? Math.ceil(gapSecs / -trendPerWeek)
      : null;
  const progressPct =
    current !== null && start !== null && start > goal.pace
      ? Math.max(0, Math.min(100, ((start - current) / (start - goal.pace)) * 100))
      : reached
        ? 100
        : null;

  let headline: string;
  let detail: string;
  if (current === null) {
    headline = "Aún no hay trotes con pulso para medir tu ritmo";
    detail = `Cuando sincronices trotes con pulso cercano a ${goal.maxHR} ppm, aquí verás cuánto te falta para ${formatPace(goal.pace)} min/km.`;
  } else if (reached) {
    headline = `Objetivo logrado: ${formatPace(current)} min/km a ${goal.maxHR} ppm`;
    detail = "Ya rindes el ritmo objetivo en zona 2. Puedes mantener el volumen o ponerte una meta nueva en Preferencias.";
  } else {
    headline = `A ${goal.maxHR} ppm hoy rindes ~${formatPace(current)} min/km`;
    const trendText =
      trendPerWeek === null
        ? "Con unas semanas más de datos se podrá estimar cuándo llegas."
        : trendPerWeek < -0.5
          ? `Mejoras ~${Math.round(-trendPerWeek)} s/km por semana: ${
              (weeksToGoal as number) > 52 ? "a este paso, más de un año" : `unas ${weeksToGoal} semanas más`
            }.`
          : trendPerWeek > 2
            ? "Las últimas semanas el ritmo a este pulso se ha puesto más lento: suele ser cansancio, calor o poco volumen."
            : "Por ahora el ritmo está estable: lo que lo mueve es sumar semanas constantes de volumen suave.";
    detail = `Te faltan ${gapSecs} s/km para ${formatPace(goal.pace)}. ${trendText}`;
  }

  const series = samples
    .map((s, i) => ({ ...s, trend: mean(samples.slice(Math.max(0, i - 4), i + 1).map((x) => x.eq)) }))
    .filter((s) => daysAgo(s.date) <= 84);

  return {
    goal,
    series,
    current,
    start,
    progressPct,
    trendPerWeek,
    weeksToGoal,
    inZoneShare,
    samples: samples.length,
    reached,
    headline,
    detail,
  };
}

export function buildWeekPlan(
  appRuns: AppRun[],
  intervals: IntervalsData | null,
  goal: PaceGoal = DEFAULT_PACE_GOAL,
  now: Date = new Date(),
): WeekPlan {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayISO = toISO(today);
  const weekStart = startOfWeek(today);
  const todayIdx = Math.round((today.getTime() - weekStart.getTime()) / 86400000);

  // Si un trote no tiene pulso en la app (ej. ingresado a mano), se toma el de Intervals.icu
  const intervalsHR = (date: string, km: number) =>
    intervals?.runs.find((r) => r.date === date && Math.abs(r.km - km) <= Math.max(0.3, km * 0.1))
      ?.avgHR ?? null;
  const runs = appRuns
    .filter((r) => r.type !== "rucking" && Number(r.distance) > 0)
    .map((r) => {
      const km = Number(r.distance);
      return {
        date: r.date,
        km,
        minutes: r.duration,
        avgHR: r.avg_bpm ? Number(r.avg_bpm) : intervalsHR(r.date, km),
      };
    });

  const kmOn = (iso: string) => runs.filter((r) => r.date === iso).reduce((s, r) => s + r.km, 0);

  // --- Historial de las semanas completas (las 4 últimas guían el volumen) ---
  const history: WeekVolume[] = Array.from({ length: 11 }, (_, i) => {
    const from = addDays(weekStart, -7 * (11 - i));
    const to = addDays(from, 7);
    const inWeek = runs.filter((r) => {
      const d = parse(r.date);
      return d >= from && d < to;
    });
    return {
      weekStart: toISO(from),
      km: inWeek.reduce((s, r) => s + r.km, 0),
      sessions: new Set(inWeek.map((r) => r.date)).size,
    };
  });
  const weeks = history.slice(-4).reverse();
  const hasHistory = weeks.some((w) => w.km > 0);
  const baseKm = weeks[0].km * 0.5 + weeks[1].km * 0.3 + weeks[2].km * 0.2;
  const last4 = runs.filter((r) => parse(r.date) >= addDays(weekStart, -28));
  const longest = last4.reduce((m, r) => Math.max(m, r.km), 0);

  // Ritmo suave habitual: mediana de los últimos 10 trotes
  const recentPaces = [...runs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .filter((r) => r.minutes > 0)
    .map((r) => r.minutes / r.km)
    .filter((p) => p > 3 && p < 15);
  const easyPace = recentPaces.length ? median(recentPaces) : DEFAULT_PACE;

  // --- Semana actual ---
  const thisWeek = runs.filter((r) => r.date >= toISO(weekStart) && r.date <= todayISO);
  const doneKm = thisWeek.reduce((s, r) => s + r.km, 0);
  const doneDays = new Set(thisWeek.map((r) => r.date));

  // --- Señales de cansancio ---
  const signals: Signal[] = intervals ? wellnessSignals(intervals.wellness) : [];

  let streak = 0;
  for (let d = addDays(today, kmOn(todayISO) > 0 ? 0 : -1); kmOn(toISO(d)) > 0; d = addDays(d, -1)) streak++;
  if (streak >= 2) {
    signals.push({
      label: "Días seguidos",
      value: `${streak}`,
      level: streak >= 3 ? "warn" : "ok",
      hint: streak >= 3 ? "Toca un día de descanso" : "Ojo con encadenar más",
    });
  }

  const last7 = runs
    .filter((r) => parse(r.date) > addDays(today, -7))
    .reduce((s, r) => s + r.km, 0);
  const chronic = mean(weeks.map((w) => w.km));
  if (chronic > 0) {
    const ratio = last7 / chronic;
    signals.push({
      label: "Últimos 7 días",
      value: `${fmtKm(last7)} km`,
      level: ratio > 1.5 ? "bad" : ratio > 1.3 ? "warn" : "ok",
      hint: `${Math.round(ratio * 100)}% de tu promedio semanal`,
    });
  }

  const bad = signals.filter((s) => s.level === "bad").length;
  const warn = signals.filter((s) => s.level === "warn").length;
  const fatigue: FatigueLevel = bad > 0 || warn >= 2 ? "alta" : warn === 1 ? "moderada" : "baja";

  // --- Ritmo en zona 2 vs objetivo ---
  const restHR =
    [...(intervals?.wellness ?? [])].reverse().find((w) => w.restingHR !== null)?.restingHR ??
    DEFAULT_REST_HR;
  const pace = analyzePace(runs, goal, restHR, today);

  // --- Volumen de la semana ---
  // Lo que más mejora el ritmo a un mismo pulso es acumular tiempo en zona 2:
  // mientras no llegues al objetivo, el volumen sube de a poco cada semana.
  const reasons: string[] = [];
  let targetKm: number;
  if (!hasHistory || baseKm < MIN_SESSION_KM) {
    targetKm = 9;
    reasons.push("Con poco historial reciente, la semana parte suave: trotes cortos de unos 3 km.");
  } else {
    const building = weeks[0].km > weeks[1].km && weeks[1].km > weeks[2].km;
    let factor = 1.08;
    if (fatigue === "alta") {
      factor = 0.8;
      reasons.push("Tus señales de cansancio están altas, así que la semana baja ~20% de volumen.");
    } else if (fatigue === "moderada") {
      factor = 1;
      reasons.push("Hay una señal de cansancio, así que se mantiene el volumen en vez de subirlo.");
    } else if (building) {
      factor = 0.85;
      reasons.push("Llevas 3 semanas subiendo volumen seguidas: esta semana toca descarga (~15% menos) para asimilar.");
    } else if (pace.reached) {
      factor = 1;
      reasons.push("Ya rindes el ritmo objetivo: se mantiene el volumen para consolidarlo.");
    } else {
      reasons.push(
        `Vienes bien recuperado: se sube ~8% sobre tu volumen reciente. Más tiempo en zona 2 es lo que te acerca a ${formatPace(goal.pace)} min/km.`,
      );
    }
    targetKm = baseKm * factor;
  }
  targetKm = Math.max(MIN_SESSION_KM, round05(targetKm));

  // --- Cuántas sesiones y de qué largo ---
  // Mejor varias salidas cortas que pocas largas: el pulso se mantiene bajo el
  // tope y el cuerpo se recupera más fácil. El largo cómodo sale de tus trotes
  // recientes; si el pulso se te dispara en las salidas largas, se acorta.
  const avgRunKm = last4.length ? mean(last4.map((r) => r.km)) : 3;
  const decouplings = (intervals?.runs ?? [])
    .filter((r) => r.decoupling !== null && r.minutes >= 30)
    .map((r) => r.decoupling as number);
  const drift = decouplings.length >= 3 ? median(decouplings.slice(-6)) : null;
  let typicalKm = Math.min(8, Math.max(3, avgRunKm));
  if (drift !== null && drift > 5) {
    typicalKm = Math.max(3, typicalKm * 0.85);
    reasons.push(
      `En tus salidas de más de 30 min el pulso deriva ~${Math.round(drift)}%: sesiones más cortas y frecuentes te ayudan a no pasar de ${goal.maxHR} ppm.`,
    );
  }
  const maxDays = fatigue === "baja" ? MAX_RUN_DAYS : MAX_RUN_DAYS - 1;
  const targetSessions = Math.min(maxDays, Math.max(3, Math.ceil(targetKm / typicalKm)));

  if (pace.inZoneShare !== null && pace.inZoneShare < 0.6) {
    reasons.push(
      `Solo ${Math.round(pace.inZoneShare * 100)}% de tus últimos trotes terminó bajo ${goal.maxHR} ppm. Ir más lento (o caminar en las subidas) ahora es lo que te hará más rápido después.`,
    );
  }

  // --- Días disponibles y reparto ---
  const remainingKm = Math.max(0, targetKm - doneKm);
  let remainingSessions = Math.max(0, targetSessions - doneDays.size);

  const ranBefore = new Set<number>();
  for (let i = -3; i < 7; i++) {
    if (kmOn(toISO(addDays(weekStart, i))) > 0 && i <= todayIdx) ranBefore.add(i);
  }

  const candidates: number[] = [];
  for (let i = todayIdx; i < 7; i++) {
    if (ranBefore.has(i)) continue; // hoy ya trotaste
    if (i === todayIdx && (fatigue === "alta" || streak >= 3)) continue;
    candidates.push(i);
  }

  remainingSessions = Math.min(
    remainingSessions,
    maxDays - doneDays.size,
    Math.floor(remainingKm / MIN_SESSION_KM),
  );
  const chosen = chooseDays(candidates, remainingSessions, ranBefore);

  // Fondo largo: el día de fin de semana elegido (o el último), si quedan 2+ trotes
  const sessions = new Map<number, PlannedSession>();
  if (chosen.length) {
    const longCap = longest > 0 ? Math.max(longest * 1.1, longest + 1) : 5;
    const longDay =
      chosen.length >= 2 && fatigue !== "alta"
        ? [...chosen].reverse().find((d) => d >= 5) ?? chosen[chosen.length - 1]
        : null;

    let longKm = 0;
    if (longDay !== null) {
      longKm = Math.min(longCap, (remainingKm / chosen.length) * 1.4);
      longKm = Math.max(MIN_SESSION_KM, round05(longKm));
    }
    const others = chosen.filter((d) => d !== longDay);
    const otherKm = others.length
      ? Math.max(MIN_SESSION_KM, round05((remainingKm - longKm) / others.length))
      : 0;
    // Un rodaje no debería ser mucho más largo que tu trote típico; si hace
    // falta más volumen, ese día va en doble (dos sesiones cortas). Con deriva
    // de pulso alta no se estira más allá de lo habitual.
    const easyCap = Math.max(MIN_SESSION_KM, round05(typicalKm * (drift !== null && drift > 5 ? 1 : 1.2)));
    let doublesLeft = fatigue !== "alta" && baseKm >= 12 ? MAX_DOUBLES : 0;

    for (const d of chosen) {
      let kind: SessionKind = d === longDay ? "long" : "easy";
      let kmD = d === longDay ? longKm : Math.min(otherKm, doublesLeft > 0 ? easyCap * 2 : easyCap);
      if (kind === "easy" && longDay !== null && d === longDay + 1) {
        kind = "recovery";
        kmD = Math.max(MIN_SESSION_KM, round05(kmD * 0.75));
      }
      if (kind === "easy" && fatigue === "alta") {
        kind = "recovery";
        kmD = Math.max(MIN_SESSION_KM, round05(kmD * 0.85));
      }
      if (kind !== "easy") kmD = Math.min(kmD, kind === "long" ? longKm : easyCap);
      const half = round05(kmD / 2);
      const parts =
        kind === "easy" && kmD > easyCap && half >= MIN_SESSION_KM ? [half, half] : undefined;
      if (parts) {
        kmD = half * 2;
        doublesLeft--;
      } else if (kind === "easy") {
        kmD = Math.min(kmD, easyCap);
      }
      sessions.set(d, {
        kind,
        title: parts
          ? "Doble zona 2"
          : kind === "long"
            ? "Fondo suave"
            : kind === "recovery"
              ? "Trote de recuperación"
              : "Rodaje zona 2",
        km: kmD,
        minutes: round5(kmD * easyPace * (kind === "recovery" ? 1.03 : 1)),
        parts,
      });
    }
  }

  const days: PlanDay[] = WEEKDAYS.map((weekday, i) => {
    const date = toISO(addDays(weekStart, i));
    return {
      date,
      weekday,
      isToday: i === todayIdx,
      isPast: i < todayIdx,
      doneKm: kmOn(date),
      session: sessions.get(i) || null,
    };
  });

  // --- Titular de hoy ---
  const todayPlan = sessions.get(todayIdx);
  let todayHeadline: string;
  let todayDetail: string;
  if (kmOn(todayISO) > 0) {
    todayHeadline = `Hoy ya trotaste ${fmtKm(kmOn(todayISO))} km`;
    todayDetail = "Buen trabajo. Lo que queda de la semana está repartido abajo.";
  } else if (todayPlan?.parts) {
    todayHeadline = `Hoy: doble de ${todayPlan.parts.map(fmtKm).join(" + ")} km`;
    todayDetail = `Dos trotes cortos (mañana y tarde, con al menos 4 horas entre ellos), unos ${round5(
      todayPlan.minutes / 2,
    )} minutos cada uno bajo ${goal.maxHR} ppm.`;
  } else if (todayPlan) {
    todayHeadline = `Hoy: ${todayPlan.title.toLowerCase()} de ${fmtKm(todayPlan.km)} km`;
    todayDetail = `Unos ${todayPlan.minutes} minutos sin pasar de ${goal.maxHR} ppm; si sube, baja el ritmo o camina un poco.`;
  } else if (fatigue === "alta") {
    todayHeadline = "Hoy: descanso";
    todayDetail = "Tus señales piden recuperar. Caminar o movilidad suave está bien.";
  } else if (streak >= 3) {
    todayHeadline = "Hoy: descanso";
    todayDetail = `Llevas ${streak} días seguidos trotando; el cuerpo se adapta mientras descansa.`;
  } else if (remainingKm <= 0) {
    todayHeadline = "Semana cumplida 🎉";
    todayDetail = "Ya llegaste al volumen recomendado. Si quieres moverte, que sea muy suave.";
  } else {
    todayHeadline = "Hoy: descanso";
    todayDetail = "Así llegas con piernas frescas a los próximos trotes.";
  }

  const plannedKm = [...sessions.values()].reduce((sum, x) => sum + x.km, 0);
  if (remainingKm - plannedKm > 1 && doneDays.size < targetSessions) {
    reasons.push(
      "Quedan pocos días en la semana: no conviene recuperar todo el volumen de golpe, así que la semana cierra más corta.",
    );
  }
  if (chosen.some((d, i) => i > 0 && chosen[i - 1] === d - 1)) {
    reasons.push("Algún trote cae en días seguidos: el segundo de ellos, bien suave.");
  }
  if ([...sessions.values()].some((x) => x.parts)) {
    reasons.push(
      "Para sumar volumen sin alargar cada salida, algunos días van en doble: dos trotes cortos en el día suman el mismo tiempo en zona 2 con menos deriva de pulso y menos impacto.",
    );
  }
  if (doneDays.size >= targetSessions && remainingKm > 0) {
    reasons.push("Ya completaste los días de trote de esta semana; el resto es opcional.");
  }

  // --- Guía de intensidad ---
  const z2 = intervals?.zone2;
  const maxHR = intervals?.maxHR;
  const zoneFloor = z2 ? z2.min : maxHR ? Math.round(maxHR * 0.6) : null;
  const hrGuide = zoneFloor
    ? `Zona 2: ${zoneFloor}–${goal.maxHR} ppm`
    : `Zona 2: bajo ${goal.maxHR} ppm`;
  const paceGuide =
    pace.current !== null
      ? `Ritmo a ${goal.maxHR} ppm: ${formatPace(pace.current)} → meta ${formatPace(goal.pace)} min/km`
      : recentPaces.length
        ? `Tu ritmo suave habitual: ${formatPace(easyPace)} min/km`
        : "Sin ritmo de referencia aún";

  const recovery = buildRecoveryTips({
    ranToday: kmOn(todayISO) > 0,
    todayKind: todayPlan?.kind ?? null,
    tomorrowKind: sessions.get(todayIdx + 1)?.kind ?? null,
    fatigue,
    signals,
  });

  return {
    recovery,
    weekStart: toISO(weekStart),
    targetKm,
    targetSessions,
    doneKm: Math.round(doneKm * 100) / 100,
    doneSessions: doneDays.size,
    fatigue,
    todayHeadline,
    todayDetail,
    days,
    signals,
    reasons,
    hrGuide,
    paceGuide,
    usedIntervals: Boolean(intervals),
    pace,
    history,
  };
}

// --- Recomendaciones de comida y descanso según el día ---
function buildRecoveryTips({
  ranToday,
  todayKind,
  tomorrowKind,
  fatigue,
  signals,
}: {
  ranToday: boolean;
  todayKind: SessionKind | null;
  tomorrowKind: SessionKind | null;
  fatigue: FatigueLevel;
  signals: Signal[];
}): RecoveryTips {
  const food: RecoveryTip[] = [];
  const rest: RecoveryTip[] = [];
  const level = (label: string) => signals.find((s) => s.label === label)?.level;
  const runDay = ranToday || todayKind !== null;

  // Comida
  if (todayKind === "long") {
    food.push({
      icon: "🍌",
      title: "Antes del fondo",
      text: "Come algo liviano con carbohidratos 1–2 horas antes (pan con miel, plátano, avena). Nada pesado ni muy graso.",
    });
  } else if (todayKind) {
    food.push({
      icon: "🍞",
      title: "Antes de trotar",
      text: "Para un rodaje suave no necesitas comer especial; si tienes hambre, un snack chico (fruta o yogur) 1 hora antes basta.",
    });
  }
  if (runDay) {
    food.push({
      icon: "🥚",
      title: "Después de trotar",
      text: "Dentro de la hora siguiente: proteína (20–30 g: huevos, yogur griego, pollo, legumbres o un batido) más carbohidratos para reponer energía.",
    });
  }
  if (tomorrowKind === "long") {
    food.push({
      icon: "🍝",
      title: "Mañana hay fondo",
      text: "Que la cena de hoy tenga una buena porción de carbohidratos (arroz, papas, pasta) y cena temprano para dormir liviano.",
    });
  }
  food.push({
    icon: "💧",
    title: "Hidratación",
    text: runDay
      ? "Toma agua durante el día y repón después del trote; si sudaste mucho o hace calor, suma algo de sal o una bebida con electrolitos."
      : "Aunque descanses, mantén buena hidratación durante el día: la recuperación también pasa por ahí.",
  });
  if (fatigue !== "baja") {
    food.push({
      icon: "🥗",
      title: "No comas de menos",
      text: "Cuando vienes cargado, comer poco frena la recuperación. Asegura proteína en cada comida y verduras o fruta de colores.",
    });
  }

  // Descanso
  const sleepLevel = level("Sueño");
  rest.push({
    icon: "😴",
    title: "Sueño",
    text:
      sleepLevel === "warn" || sleepLevel === "bad"
        ? "Anoche dormiste poco: hoy prioriza acostarte más temprano. Si puedes, una siesta corta (20 min) ayuda."
        : "Apunta a 7–9 horas con horario regular. Es donde más se recupera el cuerpo y se asimila el entrenamiento.",
  });
  if (level("HRV") === "warn" || level("HRV") === "bad" || level("Pulso en reposo") === "warn" || level("Pulso en reposo") === "bad") {
    rest.push({
      icon: "🫀",
      title: "Tu cuerpo está en alerta",
      text: "HRV baja o pulso en reposo alto suelen venir de estrés, mal sueño o un resfrío incubándose. Baja el ritmo, evita alcohol y cena liviano.",
    });
  }
  if (!runDay) {
    rest.push({
      icon: "🚶",
      title: "Descanso activo",
      text: "Una caminata de 20–30 minutos o movilidad suave ayuda más que estar todo el día quieto.",
    });
  } else {
    rest.push({
      icon: "🧘",
      title: "Después del trote",
      text: "5–10 minutos de caminata suave y estiramientos o movilidad de cadera, gemelos y isquios.",
    });
  }
  if (fatigue === "alta") {
    rest.push({
      icon: "🛑",
      title: "Si algo duele",
      text: "Molestia que aumenta al trotar o te cambia la pisada: descansa ese día. Si dura más de unos días, consulta.",
    });
  }

  return { food, rest };
}
