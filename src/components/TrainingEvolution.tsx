import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./TrainingEvolution.module.css";

interface Run {
  id?: string;
  date: string;
  distance: number | null;
  duration: number;
  type?: string;
  avg_bpm?: number | null;
  rucking_weight?: number | null;
}

interface TrainingEvolutionProps {
  runs: Run[];
  showRucking: boolean;
}

const WEEKS_IN_CHART = 12;
const COMPARE_WEEKS = 4;
const PACE_SESSIONS = 20;
const MIN_KM_FOR_PACE_RECORD = 3;

const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

// --- Helpers de fechas (todo en hora local, semanas de lunes a domingo) ---
const parseDate = (dateStr: string) => new Date(dateStr + "T00:00:00");

const startOfWeek = (d: Date) => {
  const monday = new Date(d);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const addDays = (d: Date, days: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

const shortDate = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;

// --- Helpers de formato ---
const formatPace = (minPerKm: number) => {
  if (!isFinite(minPerKm) || minPerKm <= 0) return "—";
  let m = Math.floor(minPerKm);
  let s = Math.round((minPerKm - m) * 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const isTrote = (r: Run) => r.type !== "rucking";
const km = (r: Run) => Number(r.distance || 0);

// Ancho real del contenedor, para dibujar los gráficos en píxeles
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

interface PeriodSummary {
  distance: number;
  sessions: number;
  pace: number; // min/km de trote
  bpm: number | null;
  ruckingWeight: number | null;
}

function summarize(runs: Run[]): PeriodSummary {
  const trote = runs.filter((r) => isTrote(r) && km(r) > 0);
  const troteKm = trote.reduce((s, r) => s + km(r), 0);
  const troteMin = trote.reduce((s, r) => s + r.duration, 0);
  const withBpm = runs.filter((r) => isTrote(r) && r.avg_bpm);
  const withWeight = runs.filter(
    (r) => !isTrote(r) && r.rucking_weight !== null && r.rucking_weight !== undefined,
  );
  return {
    distance: runs.reduce((s, r) => s + km(r), 0),
    sessions: runs.length,
    pace: troteKm > 0 ? troteMin / troteKm : 0,
    bpm: withBpm.length
      ? withBpm.reduce((s, r) => s + Number(r.avg_bpm), 0) / withBpm.length
      : null,
    ruckingWeight: withWeight.length
      ? withWeight.reduce((s, r) => s + Number(r.rucking_weight), 0) /
        withWeight.length
      : null,
  };
}

// Tarjeta comparativa: valor actual vs periodo anterior
function CompareTile({
  label,
  value,
  unit,
  previous,
  delta,
  higherIsBetter,
  deltaText,
}: {
  label: string;
  value: string;
  unit?: string;
  previous: string;
  delta: number | null;
  higherIsBetter: boolean;
  deltaText: string;
}) {
  let trend: "up" | "down" | "flat" | null = null;
  if (delta !== null) trend = Math.abs(delta) < 0.005 ? "flat" : delta > 0 ? "up" : "down";
  const better =
    trend === null || trend === "flat"
      ? null
      : (trend === "up") === higherIsBetter;

  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>
        {value}
        {unit && <span className={styles.tileUnit}> {unit}</span>}
      </span>
      <span className={styles.tilePrev}>Antes: {previous}</span>
      {trend !== null && (
        <span
          className={`${styles.deltaChip} ${
            better === null ? styles.deltaFlat : better ? styles.deltaGood : styles.deltaBad
          }`}
        >
          {trend === "up" ? "▲" : trend === "down" ? "▼" : "●"} {deltaText}
          {better !== null && <span> · {better ? "mejor" : "peor"}</span>}
        </span>
      )}
    </div>
  );
}

interface WeekBucket {
  start: Date;
  distance: number;
  sessions: number;
}

function WeeklyVolumeChart({ weeks }: { weeks: WeekBucket[] }) {
  const [ref, width] = useContainerWidth();
  const [hover, setHover] = useState<number | null>(null);

  const height = 200;
  const pad = { top: 16, right: 8, bottom: 28, left: 36 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const maxKm = Math.max(5, ...weeks.map((w) => w.distance));
  const step = maxKm > 40 ? 20 : maxKm > 20 ? 10 : 5;
  const yMax = Math.ceil(maxKm / step) * step;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
  const slot = weeks.length ? plotW / weeks.length : 0;
  const barW = Math.max(4, Math.min(28, slot - 6));
  const y = (v: number) => pad.top + plotH - (v / yMax) * plotH;

  const hovered = hover !== null ? weeks[hover] : null;

  return (
    <div ref={ref} className={styles.chartArea} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Kilómetros por semana, últimas 12 semanas">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? styles.axisLine : styles.gridLine}
              />
              <text x={pad.left - 6} y={y(t)} className={styles.axisText} textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const h = Math.max(0, y(0) - y(w.distance));
            const r = Math.min(4, barW / 2, h);
            const x0 = cx - barW / 2;
            const top = y(0) - h;
            return (
              <g key={i}>
                {h > 0 && (
                  <path
                    className={`${styles.bar} ${hover === i ? styles.barActive : ""}`}
                    d={`M${x0},${y(0)} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${y(0)} Z`}
                  />
                )}
                {(i % 2 === weeks.length % 2 || weeks.length <= 6) && (
                  <text x={cx} y={height - 8} className={styles.axisText} textAnchor="middle">
                    {shortDate(w.start)}
                  </text>
                )}
                {/* Zona de hover más grande que la barra */}
                <rect
                  x={pad.left + slot * i}
                  y={pad.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onTouchStart={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hovered && hover !== null && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(Math.max(pad.left + slot * hover + slot / 2, 70), width - 70),
          }}
        >
          <span className={styles.tooltipTitle}>
            Semana del {shortDate(hovered.start)}
          </span>
          <span>
            <strong>{hovered.distance.toFixed(1)} km</strong> · {hovered.sessions} ses.
          </span>
        </div>
      )}
    </div>
  );
}

interface PacePoint {
  date: string;
  pace: number;
  distance: number;
  bpm: number | null;
}

function PaceTrendChart({ points }: { points: PacePoint[] }) {
  const [ref, width] = useContainerWidth();
  const [hover, setHover] = useState<number | null>(null);

  const height = 200;
  const pad = { top: 16, right: 12, bottom: 28, left: 40 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const paces = points.map((p) => p.pace);
  const yMin = Math.floor(Math.min(...paces) - 0.25);
  const yMax = Math.ceil(Math.max(...paces) + 0.25);
  const ticks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);
  const x = (i: number) =>
    pad.left + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => pad.top + ((v - yMin) / (yMax - yMin)) * plotH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.pace)}`).join(" ");

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className={styles.chartArea} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Ritmo por sesión de trote">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className={styles.gridLine} />
              <text x={pad.left - 6} y={y(t)} className={styles.axisText} textAnchor="end" dominantBaseline="middle">
                {formatPace(t)}
              </text>
            </g>
          ))}
          <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} className={styles.axisLine} />
          {[0, points.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 8}
              className={styles.axisText}
              textAnchor={points.length === 1 ? "middle" : i === 0 ? "start" : "end"}
            >
              {shortDate(parseDate(points[i].date))}
            </text>
          ))}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={height - pad.bottom} className={styles.crosshair} />
          )}
          <path d={path} className={styles.line} />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.pace)}
              r={hover === i ? 5 : 4}
              className={styles.dot}
            />
          ))}
          {points.map((_, i) => {
            const half = points.length > 1 ? plotW / (points.length - 1) / 2 : plotW / 2;
            return (
              <rect
                key={`hit-${i}`}
                x={x(i) - half}
                y={pad.top}
                width={half * 2}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            );
          })}
        </svg>
      )}
      {hovered && hover !== null && (
        <div className={styles.tooltip} style={{ left: Math.min(Math.max(x(hover), 70), width - 70) }}>
          <span className={styles.tooltipTitle}>{shortDate(parseDate(hovered.date))}</span>
          <span>
            <strong>{formatPace(hovered.pace)} min/km</strong>
          </span>
          <span>
            {hovered.distance.toFixed(1)} km{hovered.bpm ? ` · ${hovered.bpm} BPM` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export default function TrainingEvolution({ runs, showRucking }: TrainingEvolutionProps) {
  // Clave numérica de la semana actual: los cálculos se rehacen al cambiar de semana
  const weekKey = startOfWeek(new Date()).getTime();

  const { current, previous } = useMemo(() => {
    const thisWeek = new Date(weekKey);
    const currentStart = addDays(thisWeek, -7 * (COMPARE_WEEKS - 1));
    const previousStart = addDays(currentStart, -7 * COMPARE_WEEKS);
    const inRange = (r: Run, from: Date, to: Date) => {
      const d = parseDate(r.date);
      return d >= from && d < to;
    };
    return {
      current: summarize(runs.filter((r) => inRange(r, currentStart, addDays(thisWeek, 7)))),
      previous: summarize(runs.filter((r) => inRange(r, previousStart, currentStart))),
    };
  }, [runs, weekKey]);

  const weeks = useMemo<WeekBucket[]>(() => {
    const thisWeek = new Date(weekKey);
    const buckets = Array.from({ length: WEEKS_IN_CHART }, (_, i) => ({
      start: addDays(thisWeek, -7 * (WEEKS_IN_CHART - 1 - i)),
      distance: 0,
      sessions: 0,
    }));
    for (const r of runs) {
      const idx = buckets.findIndex(
        (b) => parseDate(r.date) >= b.start && parseDate(r.date) < addDays(b.start, 7),
      );
      if (idx >= 0) {
        buckets[idx].distance += km(r);
        buckets[idx].sessions += 1;
      }
    }
    return buckets;
  }, [runs, weekKey]);

  const pacePoints = useMemo<PacePoint[]>(
    () =>
      runs
        .filter((r) => isTrote(r) && km(r) > 0 && r.duration > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-PACE_SESSIONS)
        .map((r) => ({
          date: r.date,
          pace: r.duration / km(r),
          distance: km(r),
          bpm: r.avg_bpm ?? null,
        })),
    [runs],
  );

  const records = useMemo(() => {
    const thisWeek = new Date(weekKey);
    const trote = runs.filter((r) => isTrote(r) && km(r) > 0);
    const longest = trote.reduce<Run | null>((b, r) => (!b || km(r) > km(b) ? r : b), null);
    const fastest = trote
      .filter((r) => km(r) >= MIN_KM_FOR_PACE_RECORD && r.duration > 0)
      .reduce<Run | null>(
        (b, r) => (!b || r.duration / km(r) < b.duration / km(b) ? r : b),
        null,
      );
    const longestTime = runs.reduce<Run | null>((b, r) => (!b || r.duration > b.duration ? r : b), null);

    const byWeek = new Map<number, number>();
    for (const r of runs) {
      const key = startOfWeek(parseDate(r.date)).getTime();
      byWeek.set(key, (byWeek.get(key) || 0) + km(r));
    }
    let bestWeek: { start: Date; distance: number } | null = null;
    for (const [key, distance] of byWeek) {
      if (!bestWeek || distance > bestWeek.distance) bestWeek = { start: new Date(key), distance };
    }

    // Racha: semanas consecutivas con al menos una sesión (la actual cuenta si ya entrenaste)
    let streak = 0;
    let cursor = byWeek.has(thisWeek.getTime()) ? thisWeek : addDays(thisWeek, -7);
    while (byWeek.has(cursor.getTime())) {
      streak += 1;
      cursor = addDays(cursor, -7);
    }

    return { longest, fastest, longestTime, bestWeek, streak };
  }, [runs, weekKey]);

  const pct = (a: number, b: number) => (b > 0 ? (a - b) / b : null);
  const paceDeltaSec =
    current.pace > 0 && previous.pace > 0 ? (current.pace - previous.pace) * 60 : null;
  const bpmDelta =
    current.bpm !== null && previous.bpm !== null ? current.bpm - previous.bpm : null;
  const weightDelta =
    current.ruckingWeight !== null && previous.ruckingWeight !== null
      ? current.ruckingWeight - previous.ruckingWeight
      : null;
  const signed = (n: number, digits = 0) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;

  if (runs.length === 0) {
    return (
      <div className={`${styles.card} glass-panel fade-in`}>
        <h3 className={styles.cardTitle}>Mi Evolución</h3>
        <p className={styles.empty}>
          Aún no hay entrenamientos registrados. Cuando registres sesiones, aquí verás cómo
          evolucionan tu volumen, ritmo y pulso.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* COMPARATIVA ÚLTIMAS 4 SEMANAS */}
      <div className={`${styles.card} glass-panel fade-in`}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Últimas {COMPARE_WEEKS} semanas</h3>
          <span className={styles.cardSubtitle}>vs. las {COMPARE_WEEKS} anteriores</span>
        </div>
        <div className={styles.tilesGrid}>
          <CompareTile
            label="Distancia"
            value={current.distance.toFixed(1)}
            unit="km"
            previous={`${previous.distance.toFixed(1)} km`}
            delta={pct(current.distance, previous.distance)}
            deltaText={`${signed((pct(current.distance, previous.distance) || 0) * 100)}%`}
            higherIsBetter
          />
          <CompareTile
            label="Sesiones"
            value={current.sessions.toString()}
            previous={previous.sessions.toString()}
            delta={previous.sessions > 0 ? current.sessions - previous.sessions : null}
            deltaText={signed(current.sessions - previous.sessions)}
            higherIsBetter
          />
          <CompareTile
            label="Ritmo trote"
            value={formatPace(current.pace)}
            unit="min/km"
            previous={previous.pace > 0 ? `${formatPace(previous.pace)} min/km` : "—"}
            delta={paceDeltaSec}
            deltaText={`${signed(paceDeltaSec || 0)} s/km`}
            higherIsBetter={false}
          />
          <CompareTile
            label="Pulso promedio"
            value={current.bpm !== null ? Math.round(current.bpm).toString() : "—"}
            unit={current.bpm !== null ? "BPM" : undefined}
            previous={previous.bpm !== null ? `${Math.round(previous.bpm)} BPM` : "—"}
            delta={bpmDelta}
            deltaText={`${signed(bpmDelta || 0)} BPM`}
            higherIsBetter={false}
          />
          {showRucking && (
            <CompareTile
              label="🎒 Carga rucking"
              value={current.ruckingWeight !== null ? current.ruckingWeight.toFixed(1) : "—"}
              unit={current.ruckingWeight !== null ? "kg" : undefined}
              previous={previous.ruckingWeight !== null ? `${previous.ruckingWeight.toFixed(1)} kg` : "—"}
              delta={weightDelta}
              deltaText={`${signed(weightDelta || 0, 1)} kg`}
              higherIsBetter
            />
          )}
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className={styles.chartsGrid}>
        <div className={`${styles.card} glass-panel fade-in`} style={{ animationDelay: "0.1s" }}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Km por semana</h3>
            <span className={styles.cardSubtitle}>Últimas {WEEKS_IN_CHART} semanas</span>
          </div>
          <WeeklyVolumeChart weeks={weeks} />
        </div>

        <div className={`${styles.card} glass-panel fade-in`} style={{ animationDelay: "0.2s" }}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Ritmo por sesión</h3>
            <span className={styles.cardSubtitle}>min/km · más arriba es más rápido</span>
          </div>
          {pacePoints.length > 0 ? (
            <PaceTrendChart points={pacePoints} />
          ) : (
            <p className={styles.empty}>Registra trotes con distancia para ver tu ritmo.</p>
          )}
        </div>
      </div>

      {/* RÉCORDS */}
      <div className={`${styles.card} glass-panel fade-in`} style={{ animationDelay: "0.3s" }}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Récords personales</h3>
        </div>
        <div className={styles.recordsGrid}>
          <div className={styles.record}>
            <span className={styles.recordLabel}>🏃 Trote más largo</span>
            <span className={styles.recordValue}>
              {records.longest ? `${km(records.longest).toFixed(1)} km` : "—"}
            </span>
            {records.longest && (
              <span className={styles.recordDate}>{shortDate(parseDate(records.longest.date))}</span>
            )}
          </div>
          <div className={styles.record}>
            <span className={styles.recordLabel}>⚡ Mejor ritmo (≥{MIN_KM_FOR_PACE_RECORD} km)</span>
            <span className={styles.recordValue}>
              {records.fastest
                ? `${formatPace(records.fastest.duration / km(records.fastest))} min/km`
                : "—"}
            </span>
            {records.fastest && (
              <span className={styles.recordDate}>
                {shortDate(parseDate(records.fastest.date))} · {km(records.fastest).toFixed(1)} km
              </span>
            )}
          </div>
          <div className={styles.record}>
            <span className={styles.recordLabel}>⏱️ Sesión más larga</span>
            <span className={styles.recordValue}>
              {records.longestTime ? formatDuration(records.longestTime.duration) : "—"}
            </span>
            {records.longestTime && (
              <span className={styles.recordDate}>{shortDate(parseDate(records.longestTime.date))}</span>
            )}
          </div>
          <div className={styles.record}>
            <span className={styles.recordLabel}>📈 Mejor semana</span>
            <span className={styles.recordValue}>
              {records.bestWeek ? `${records.bestWeek.distance.toFixed(1)} km` : "—"}
            </span>
            {records.bestWeek && (
              <span className={styles.recordDate}>Semana del {shortDate(records.bestWeek.start)}</span>
            )}
          </div>
          <div className={styles.record}>
            <span className={styles.recordLabel}>🔥 Racha actual</span>
            <span className={styles.recordValue}>
              {records.streak} {records.streak === 1 ? "semana" : "semanas"}
            </span>
            <span className={styles.recordDate}>con al menos una sesión</span>
          </div>
        </div>
      </div>
    </div>
  );
}
