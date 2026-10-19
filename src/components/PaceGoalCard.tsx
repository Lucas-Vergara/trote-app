import React from "react";
import { WeekPlan, formatPace } from "@/lib/weeklyRecommendation";
import styles from "./PaceGoalCard.module.css";

interface PaceGoalCardProps {
  plan: WeekPlan;
  onEditGoal?: () => void;
}

const fmtKm = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 1 });

// Objetivo de ritmo en zona 2 y el volumen dinámico de la semana
export default function PaceGoalCard({ plan, onEditGoal }: PaceGoalCardProps) {
  const { pace } = plan;
  const weekPct = plan.targetKm > 0 ? Math.min(100, (plan.doneKm / plan.targetKm) * 100) : 0;
  const doubles = plan.days.filter((d) => d.session?.parts && d.doneKm === 0).length;

  return (
    <div className={`${styles.card} glass-panel fade-in`}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Objetivo de ritmo</h3>
          <span className={styles.subtitle}>
            {formatPace(pace.goal.pace)} min/km bajo {pace.goal.maxHR} ppm
          </span>
        </div>
        {onEditGoal && (
          <button className={styles.editBtn} onClick={onEditGoal}>
            Editar
          </button>
        )}
      </div>

      <div className={styles.paceRow}>
        <div className={styles.paceBlock}>
          <span className={styles.paceLabel}>Hoy, a {pace.goal.maxHR} ppm</span>
          <span className={styles.paceValue}>
            {pace.current !== null ? formatPace(pace.current) : "—"}
            <span className={styles.paceUnit}> min/km</span>
          </span>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
        <div className={styles.paceBlock}>
          <span className={styles.paceLabel}>Meta</span>
          <span className={`${styles.paceValue} ${styles.goalValue}`}>
            {formatPace(pace.goal.pace)}
            <span className={styles.paceUnit}> min/km</span>
          </span>
        </div>
      </div>

      {pace.progressPct !== null && (
        <>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${pace.progressPct}%` }} />
          </div>
          <span className={styles.trackCaption}>
            {Math.round(pace.progressPct)}% del camino desde {formatPace(pace.start ?? pace.goal.pace)} min/km
            hace dos meses
          </span>
        </>
      )}

      <p className={styles.detail}>{pace.detail}</p>

      <div className={styles.facts}>
        {pace.trendPerWeek !== null && (
          <span>
            {pace.trendPerWeek < -0.5 ? "▲" : pace.trendPerWeek > 2 ? "▼" : "■"} Tendencia:{" "}
            {pace.trendPerWeek <= 0 ? "−" : "+"}
            {Math.abs(Math.round(pace.trendPerWeek))} s/km por semana
          </span>
        )}
        {pace.inZoneShare !== null && (
          <span>
            {pace.inZoneShare >= 0.6 ? "✓" : "✗"} {Math.round(pace.inZoneShare * 100)}% de tus últimos trotes
            bajo {pace.goal.maxHR} ppm
          </span>
        )}
      </div>

      <div className={styles.week}>
        <div className={styles.weekRow}>
          <span className={styles.weekLabel}>Esta semana</span>
          <span className={styles.weekValue}>
            <strong>{fmtKm(plan.doneKm)}</strong> / {fmtKm(plan.targetKm)} km · {plan.doneSessions} /{" "}
            {plan.targetSessions} días
          </span>
        </div>
        <div className={styles.weekTrack}>
          <div className={styles.weekFill} style={{ width: `${weekPct}%` }} />
        </div>
        <span className={styles.trackCaption}>
          Volumen y días calculados según tu carga y cansancio
          {doubles > 0 ? ` · ${doubles} ${doubles === 1 ? "día en doble" : "días en doble"}` : ""}
        </span>
      </div>
    </div>
  );
}
