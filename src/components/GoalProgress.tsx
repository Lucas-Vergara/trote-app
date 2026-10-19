import React, { useEffect, useRef, useState } from "react";
import { WeekPlan, formatPace } from "@/lib/weeklyRecommendation";
import PaceGoalCard from "./PaceGoalCard";
import styles from "./GoalProgress.module.css";

interface GoalProgressProps {
  plan: WeekPlan;
  onEditGoal?: () => void;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fmtKm = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 1 });
const fmtDay = (iso: string) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const dayNum = (iso: string) => new Date(iso + "T00:00:00").getTime() / 86400000;

// Ancho real del contenedor, para dibujar el SVG a escala 1:1 (texto nítido)
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// Ticks redondos para el eje Y
function niceStep(range: number, target: number, steps: number[]) {
  return steps.find((s) => range / s <= target) ?? steps[steps.length - 1];
}

interface Tip {
  x: number;
  y: number;
  title: string;
  value: string;
  lines: string[];
}

function Tooltip({ tip, width }: { tip: Tip | null; width: number }) {
  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 90), width - 90);
  return (
    <div className={styles.tooltip} style={{ left, top: tip.y }} role="status">
      <span className={styles.tipValue}>{tip.value}</span>
      <span className={styles.tipTitle}>{tip.title}</span>
      {tip.lines.map((l) => (
        <span key={l} className={styles.tipLine}>
          {l}
        </span>
      ))}
    </div>
  );
}

// --- Ritmo a maxHR a lo largo del tiempo, contra la meta ---
function PaceChart({ plan }: { plan: WeekPlan }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const { series, goal } = plan.pace;

  const height = 240;
  const m = { top: 16, right: 64, bottom: 28, left: 44 };
  const iw = Math.max(0, width - m.left - m.right);
  const ih = height - m.top - m.bottom;

  if (!series.length) {
    return (
      <div ref={ref} className={styles.empty}>
        Aún no hay trotes con pulso cerca de {goal.maxHR} ppm para dibujar tu evolución.
      </div>
    );
  }

  // X: días; Y: ritmo invertido (más rápido = más arriba)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const x0 = dayNum(series[0].date);
  const x1 = Math.max(today.getTime() / 86400000, x0 + 7);
  const sx = (iso: string) => m.left + ((dayNum(iso) - x0) / (x1 - x0)) * iw;

  const values = series.flatMap((p) => [p.eq, p.trend]).concat(goal.pace);
  const step = niceStep((Math.max(...values) - Math.min(...values)) * 60, 5, [10, 15, 30, 60]) / 60;
  const yMin = Math.floor((Math.min(...values) - step / 3) / step) * step;
  const yMax = Math.ceil((Math.max(...values) + step / 3) / step) * step;
  const sy = (pace: number) => m.top + ((pace - yMin) / (yMax - yMin)) * ih;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += step) ticks.push(v);

  const trendPath = series
    .map((p, i) => `${i ? "L" : "M"}${sx(p.date).toFixed(1)},${sy(p.trend).toFixed(1)}`)
    .join("");
  const last = series[series.length - 1];
  const goalY = sy(goal.pace);
  const lastY = sy(last.trend);
  // Etiquetas del borde derecho: si chocan, la de la meta se corre
  const goalLabelY = Math.abs(goalY - lastY) < 16 ? (goalY < lastY ? lastY - 16 : lastY + 16) : goalY;

  const monthTicks: string[] = [];
  for (let d = new Date(series[0].date + "T00:00:00"); d.getTime() / 86400000 <= x1; d.setDate(d.getDate() + 1)) {
    if (d.getDate() === 1) monthTicks.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  }

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left + m.left;
    let best = 0;
    series.forEach((p, i) => {
      if (Math.abs(sx(p.date) - px) < Math.abs(sx(series[best].date) - px)) best = i;
    });
    setHover(best);
  };

  const h = hover !== null ? series[hover] : null;
  const tip: Tip | null = h
    ? {
        x: sx(h.date),
        y: Math.min(sy(h.eq), sy(h.trend)) - 12,
        value: `${formatPace(h.eq)} min/km`,
        title: `${fmtDay(h.date)} · ritmo a ${goal.maxHR} ppm`,
        lines: [
          `Real: ${formatPace(h.pace)} min/km · ${Math.round(h.avgHR)} ppm · ${fmtKm(h.km)} km`,
          `Tendencia: ${formatPace(h.trend)} min/km`,
        ],
      }
    : null;

  return (
    <div ref={ref} className={styles.chartBox}>
      {width > 0 && (
        <svg width={width} height={height} className={styles.svg} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={m.left + iw} y1={sy(t)} y2={sy(t)} className={styles.grid} />
              <text x={m.left - 8} y={sy(t)} className={styles.axisY}>
                {formatPace(t)}
              </text>
            </g>
          ))}
          {monthTicks.map((d) => (
            <text key={d} x={sx(d)} y={height - 8} className={styles.axisX}>
              {MONTHS[Number(d.slice(5, 7)) - 1]}
            </text>
          ))}

          {/* Meta */}
          <line x1={m.left} x2={m.left + iw} y1={goalY} y2={goalY} className={styles.goalLine} />
          <text x={m.left + iw + 8} y={goalLabelY} className={styles.endLabel}>
            Meta {formatPace(goal.pace)}
          </text>

          {/* Cada trote */}
          {series.map((p, i) => (
            <circle
              key={p.date + i}
              cx={sx(p.date)}
              cy={sy(p.eq)}
              r={hover === i ? 5 : 4}
              className={styles.dot}
            />
          ))}

          {/* Tendencia */}
          <path d={trendPath} className={styles.trendLine} />
          <circle cx={sx(last.date)} cy={lastY} r={5} className={styles.endDot} />
          <text x={m.left + iw + 8} y={lastY} className={`${styles.endLabel} ${styles.endLabelStrong}`}>
            {formatPace(last.trend)}
          </text>

          {h && (
            <line x1={sx(h.date)} x2={sx(h.date)} y1={m.top} y2={m.top + ih} className={styles.crosshair} />
          )}
          <rect
            x={m.left}
            y={m.top}
            width={iw}
            height={ih}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
    </div>
  );
}

// --- Km por semana, con el objetivo dinámico de esta semana ---
function VolumeChart({ plan }: { plan: WeekPlan }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const weeks = [
    ...plan.history.map((w) => ({ ...w, target: null as number | null, current: false })),
    {
      weekStart: plan.weekStart,
      km: plan.doneKm,
      sessions: plan.doneSessions,
      target: plan.targetKm,
      current: true,
    },
  ];

  const height = 220;
  const m = { top: 24, right: 8, bottom: 28, left: 36 };
  const iw = Math.max(0, width - m.left - m.right);
  const ih = height - m.top - m.bottom;
  const band = iw / weeks.length;
  const barW = Math.min(24, band - 6);

  const maxKm = Math.max(5, ...weeks.map((w) => Math.max(w.km, w.target ?? 0)));
  const step = niceStep(maxKm, 4, [2, 5, 10, 20, 50]);
  const yMax = Math.ceil(maxKm / step) * step;
  const sy = (km: number) => m.top + ih - (km / yMax) * ih;
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);

  // Barra con la punta redondeada (4px) y la base recta
  const bar = (x: number, km: number) => {
    const top = sy(km);
    const base = m.top + ih;
    const r = Math.min(4, (base - top) / 2, barW / 2);
    if (base - top < 0.5) return "";
    return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${
      x + barW
    },${top + r}V${base}Z`;
  };

  const peak = weeks.slice(0, -1).reduce((best, w, i, arr) => (w.km > arr[best].km ? i : best), 0);
  const labelEvery = band < 34 ? 2 : 1;

  const h = hover !== null ? weeks[hover] : null;
  const tip: Tip | null =
    h && hover !== null
      ? {
          x: m.left + band * hover + band / 2,
          y: sy(Math.max(h.km, h.target ?? 0)) - 12,
          value: h.current ? `${fmtKm(h.km)} de ${fmtKm(h.target as number)} km` : `${fmtKm(h.km)} km`,
          title: h.current ? "Esta semana" : `Semana del ${fmtDay(h.weekStart)}`,
          lines: [
            h.current
              ? `${h.sessions} de ${plan.targetSessions} días de trote`
              : `${h.sessions} ${h.sessions === 1 ? "día" : "días"} de trote`,
          ],
        }
      : null;

  return (
    <div ref={ref} className={styles.chartBox}>
      {width > 0 && (
        <svg width={width} height={height} className={styles.svg} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={m.left + iw} y1={sy(t)} y2={sy(t)} className={styles.grid} />
              <text x={m.left - 8} y={sy(t)} className={styles.axisY}>
                {t}
              </text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const x = m.left + band * i + (band - barW) / 2;
            // En pantallas angostas solo se rotula la semana actual (el resto, en el tooltip)
            const showValue = w.current || (i === peak && w.km > 0 && band >= 40);
            return (
              <g
                key={w.weekStart}
                className={`${styles.barGroup} ${hover === i ? styles.barHover : ""}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              >
                {w.target !== null && <path d={bar(x, w.target)} className={styles.targetBar} />}
                <path d={bar(x, w.km)} className={w.current ? styles.currentBar : styles.bar} />
                {showValue && (
                  <text x={x + barW / 2} y={sy(Math.max(w.km, w.target ?? 0)) - 6} className={styles.capLabel}>
                    {w.current ? `${fmtKm(w.km)}/${fmtKm(w.target as number)}` : fmtKm(w.km)}
                  </text>
                )}
                {(i % labelEvery === (weeks.length - 1) % labelEvery || w.current) && (
                  <text x={x + barW / 2} y={height - 8} className={styles.axisX}>
                    {w.current ? "Hoy" : fmtDay(w.weekStart)}
                  </text>
                )}
                {/* Zona de hover más grande que la barra */}
                <rect x={m.left + band * i} y={m.top} width={band} height={ih} fill="transparent" />
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
    </div>
  );
}

export default function GoalProgress({ plan, onEditGoal }: GoalProgressProps) {
  const { pace } = plan;
  return (
    <div className={styles.container}>
      <PaceGoalCard plan={plan} onEditGoal={onEditGoal} />

      <div className={`${styles.card} glass-panel fade-in`}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Ritmo a {pace.goal.maxHR} ppm</h3>
          <span className={styles.cardSubtitle}>últimas 12 semanas · más arriba es más rápido</span>
        </div>
        <div className={styles.legend}>
          <span>
            <i className={styles.keyDot} /> cada trote
          </span>
          <span>
            <i className={styles.keyLine} /> tendencia (últimos 5)
          </span>
          <span>
            <i className={styles.keyGoal} /> meta
          </span>
        </div>
        <PaceChart plan={plan} />
        {pace.series.length > 0 && (
          <details className={styles.table}>
            <summary>Ver datos</summary>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Km</th>
                  <th>Ritmo real</th>
                  <th>Pulso</th>
                  <th>A {pace.goal.maxHR} ppm</th>
                </tr>
              </thead>
              <tbody>
                {[...pace.series].reverse().map((p, i) => (
                  <tr key={p.date + i}>
                    <td>{fmtDay(p.date)}</td>
                    <td>{fmtKm(p.km)}</td>
                    <td>{formatPace(p.pace)}</td>
                    <td>{Math.round(p.avgHR)}</td>
                    <td>{formatPace(p.eq)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>

      <div className={`${styles.card} ${styles.wide} glass-panel fade-in`}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Km por semana</h3>
          <span className={styles.cardSubtitle}>
            esta semana: {fmtKm(plan.doneKm)} de {fmtKm(plan.targetKm)} km recomendados
          </span>
        </div>
        <VolumeChart plan={plan} />
        <details className={styles.table}>
          <summary>Ver datos</summary>
          <table>
            <thead>
              <tr>
                <th>Semana</th>
                <th>Km</th>
                <th>Días</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Esta semana</td>
                <td>
                  {fmtKm(plan.doneKm)} / {fmtKm(plan.targetKm)}
                </td>
                <td>
                  {plan.doneSessions} / {plan.targetSessions}
                </td>
              </tr>
              {[...plan.history].reverse().map((w) => (
                <tr key={w.weekStart}>
                  <td>{fmtDay(w.weekStart)}</td>
                  <td>{fmtKm(w.km)}</td>
                  <td>{w.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  );
}
