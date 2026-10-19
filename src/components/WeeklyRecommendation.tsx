import React from "react";
import { WeekPlan } from "@/lib/weeklyRecommendation";
import type { IntervalsState } from "@/lib/useIntervalsData";
import PaceGoalCard from "./PaceGoalCard";
import styles from "./WeeklyRecommendation.module.css";

interface WeeklyRecommendationProps {
  plan: WeekPlan;
  intervals: IntervalsState;
  onEditGoal?: () => void;
}

const fmtKm = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 1 });

const FATIGUE_LABEL = {
  baja: "Recuperado",
  moderada: "Algo cargado",
  alta: "Cansado",
} as const;

export default function WeeklyRecommendation({
  plan,
  intervals,
  onEditGoal,
}: WeeklyRecommendationProps) {
  if (intervals.status === "loading") {
    return (
      <div className={styles.container}>
        <div className={`${styles.card} glass-panel`}>
          <p className={styles.muted}>Leyendo tu estado en Intervals.icu…</p>
        </div>
      </div>
    );
  }

  const progress = plan.targetKm > 0 ? Math.min(100, (plan.doneKm / plan.targetKm) * 100) : 0;

  return (
    <div className={`${styles.container} fade-in`}>
      {/* HOY */}
      <div className={`${styles.card} ${styles.todayCard} glass-panel`}>
        <span className={`${styles.badge} ${styles[`fatigue_${plan.fatigue}`]}`}>
          {FATIGUE_LABEL[plan.fatigue]}
        </span>
        <h2 className={styles.todayTitle}>{plan.todayHeadline}</h2>
        <p className={styles.todayDetail}>{plan.todayDetail}</p>
        <div className={styles.guides}>
          <span>❤️ {plan.hrGuide}</span>
          <span>⏱️ {plan.paceGuide}</span>
        </div>
      </div>

      {/* OBJETIVO */}
      <PaceGoalCard plan={plan} onEditGoal={onEditGoal} />

      {/* SEMANA */}
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Tu semana</h3>
          <span className={styles.cardSubtitle}>
            {fmtKm(plan.doneKm)} de {fmtKm(plan.targetKm)} km · {plan.doneSessions} de{" "}
            {plan.targetSessions} días de trote
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        <ul className={styles.dayList}>
          {plan.days.map((d) => {
            const done = d.doneKm > 0;
            return (
              <li
                key={d.date}
                className={`${styles.day} ${d.isToday ? styles.dayToday : ""} ${
                  d.isPast && !done ? styles.dayPast : ""
                }`}
              >
                <div className={styles.dayName}>
                  <span>{d.weekday}</span>
                  <span className={styles.dayDate}>{Number(d.date.slice(8))}</span>
                </div>
                <div className={styles.dayBody}>
                  {done ? (
                    <span className={styles.done}>✓ {fmtKm(d.doneKm)} km trotados</span>
                  ) : d.session ? (
                    <>
                      <span className={`${styles.sessionTitle} ${styles[`kind_${d.session.kind}`]}`}>
                        {d.session.title}
                      </span>
                      <span className={styles.sessionMeta}>
                        {d.session.parts
                          ? `${d.session.parts.map(fmtKm).join(" km + ")} km (mañana y tarde) · ~${d.session.minutes} min en total`
                          : `${fmtKm(d.session.km)} km · ~${d.session.minutes} min`}
                      </span>
                    </>
                  ) : (
                    <span className={styles.rest}>{d.isPast ? "—" : "Descanso"}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* SEÑALES */}
      {plan.signals.length > 0 && (
        <div className={`${styles.card} glass-panel`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Cómo vienes</h3>
            {plan.usedIntervals && <span className={styles.cardSubtitle}>con datos de Intervals.icu</span>}
          </div>
          <div className={styles.signals}>
            {plan.signals.map((s) => (
              <div key={s.label} className={`${styles.signal} ${styles[`level_${s.level}`]}`}>
                <span className={styles.signalLabel}>{s.label}</span>
                <span className={styles.signalValue}>{s.value}</span>
                <span className={styles.signalHint}>{s.hint}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECUPERACIÓN */}
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Recuperación de hoy</h3>
          <span className={styles.cardSubtitle}>comida y descanso</span>
        </div>
        <div className={styles.recoveryGrid}>
          {(
            [
              ["Qué comer", plan.recovery.food],
              ["Cómo descansar", plan.recovery.rest],
            ] as const
          ).map(([heading, tips]) => (
            <div key={heading} className={styles.recoveryColumn}>
              <h4 className={styles.recoveryHeading}>{heading}</h4>
              <ul className={styles.tipList}>
                {tips.map((t) => (
                  <li key={t.title} className={styles.tip}>
                    <span className={styles.tipIcon} aria-hidden="true">
                      {t.icon}
                    </span>
                    <div>
                      <span className={styles.tipTitle}>{t.title}</span>
                      <p className={styles.tipText}>{t.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* POR QUÉ */}
      <div className={`${styles.card} glass-panel`}>
        <h3 className={styles.cardTitle}>Por qué esta semana</h3>
        <ul className={styles.reasons}>
          {plan.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
          <li>
            Todo bajo {plan.pace.goal.maxHR} ppm: si el pulso sube, baja el ritmo o camina un poco. El ritmo a
            ese pulso mejora con semanas constantes de volumen suave, no apurando los trotes.
          </li>
        </ul>
        {intervals.status === "unavailable" && (
          <p className={styles.muted}>
            {intervals.message ||
              "Sin conexión a Intervals.icu: la recomendación usa solo tus trotes registrados."}
          </p>
        )}
      </div>
    </div>
  );
}
