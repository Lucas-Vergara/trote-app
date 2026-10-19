// Motor de recomendaciones semanales de trote.
// Pensado para construir base aeróbica en zona 2: subir volumen de a poco,
// respetar el cansancio (forma/fatiga, HRV, pulso en reposo, sueño) y evitar
// trotar muchos días seguidos. Todo en hora local, semanas de lunes a domingo.

export interface AppRun {
  date: string;
  distance: number | null;
  duration: number;
  type?: string;
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
  runs: { date: string; km: number; minutes: number; avgHR: number | null; load: number | null }[];
  zone2: { min: number; max: number } | null;
  maxHR: number | null;
}

export interface WeeklyGoalInput {
  target_distance: number;
  target_runs: number;
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
}

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MIN_SESSION_KM = 2.5;
const DEFAULT_PACE = 7; // min/km si no hay historial

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

export function buildWeekPlan(
  appRuns: AppRun[],
  weeklyGoal: WeeklyGoalInput | null,
  intervals: IntervalsData | null,
  now: Date = new Date(),
): WeekPlan {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayISO = toISO(today);
  const weekStart = startOfWeek(today);
  const todayIdx = Math.round((today.getTime() - weekStart.getTime()) / 86400000);

  const runs = appRuns
    .filter((r) => r.type !== "rucking" && Number(r.distance) > 0)
    .map((r) => ({ date: r.date, km: Number(r.distance), minutes: r.duration }));

  const kmOn = (iso: string) => runs.filter((r) => r.date === iso).reduce((s, r) => s + r.km, 0);

  // --- Historial de las últimas 4 semanas completas ---
  const weeks = [1, 2, 3, 4].map((w) => {
    const from = addDays(weekStart, -7 * w);
    const to = addDays(from, 7);
    const inWeek = runs.filter((r) => {
      const d = parse(r.date);
      return d >= from && d < to;
    });
    return { km: inWeek.reduce((s, r) => s + r.km, 0), sessions: new Set(inWeek.map((r) => r.date)).size };
  });
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

  // --- Objetivo de la semana ---
  const reasons: string[] = [];
  const avgSessions = mean(weeks.slice(0, 3).map((w) => w.sessions).filter((s) => s > 0));
  let targetSessions = weeklyGoal?.target_runs
    ? weeklyGoal.target_runs
    : hasHistory
      ? Math.min(5, Math.max(3, Math.round(avgSessions)))
      : 3;

  let targetKm: number;
  if (!hasHistory || baseKm < MIN_SESSION_KM) {
    targetKm = targetSessions * 3;
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
    } else {
      reasons.push("Vienes bien recuperado: se sube ~8% sobre tu volumen reciente, dentro de lo seguro.");
    }
    targetKm = baseKm * factor;

    if (weeklyGoal?.target_distance) {
      const goal = Number(weeklyGoal.target_distance);
      if (goal < targetKm) {
        targetKm = goal;
        reasons.push(`Tu meta semanal es ${fmtKm(goal)} km, así que no hace falta pasarse de ahí.`);
      } else if (goal > targetKm * 1.05) {
        reasons.push(
          `Tu meta es ${fmtKm(goal)} km; para no lesionarte se llega de a poco, semana a semana.`,
        );
      }
    }
  }
  targetKm = Math.max(MIN_SESSION_KM, round05(targetKm));

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

  // Nunca más de 2 de cada 3 días disponibles (evita 3 trotes seguidos)
  remainingSessions = Math.min(
    remainingSessions,
    Math.ceil((candidates.length * 2) / 3),
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
    // Un rodaje no debería ser mucho más largo que tu trote típico
    const avgRunKm = last4.length ? mean(last4.map((r) => r.km)) : 3;
    const easyCap = Math.max(MIN_SESSION_KM, round05(avgRunKm * 1.2));

    for (const d of chosen) {
      let kind: SessionKind = d === longDay ? "long" : "easy";
      let kmD = d === longDay ? longKm : Math.min(otherKm, easyCap);
      if (kind === "easy" && longDay !== null && d === longDay + 1) {
        kind = "recovery";
        kmD = Math.max(MIN_SESSION_KM, round05(kmD * 0.75));
      }
      if (kind === "easy" && fatigue === "alta") {
        kind = "recovery";
        kmD = Math.max(MIN_SESSION_KM, round05(kmD * 0.85));
      }
      sessions.set(d, {
        kind,
        title: kind === "long" ? "Fondo suave" : kind === "recovery" ? "Trote de recuperación" : "Rodaje zona 2",
        km: kmD,
        minutes: round5(kmD * easyPace * (kind === "recovery" ? 1.03 : 1)),
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
  } else if (todayPlan) {
    todayHeadline = `Hoy: ${todayPlan.title.toLowerCase()} de ${fmtKm(todayPlan.km)} km`;
    todayDetail = `Unos ${todayPlan.minutes} minutos a ritmo cómodo.`;
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
  if (doneDays.size >= targetSessions && remainingKm > 0) {
    reasons.push("Ya completaste los trotes que te propusiste esta semana; el resto es opcional.");
  }

  // --- Guía de intensidad ---
  const z2 = intervals?.zone2;
  const maxHR = intervals?.maxHR;
  const hrGuide = z2
    ? `Zona 2: ${z2.min}–${z2.max} ppm`
    : maxHR
      ? `Zona 2 aprox.: ${Math.round(maxHR * 0.6)}–${Math.round(maxHR * 0.7)} ppm`
      : "Zona 2: ritmo en que puedes conversar";
  const paceGuide = recentPaces.length
    ? `Tu ritmo suave habitual: ${formatPace(easyPace)} min/km`
    : "Sin ritmo de referencia aún";

  return {
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
  };
}
