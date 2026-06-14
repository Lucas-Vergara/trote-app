import React, { useState, useEffect } from 'react';
import { TRAINING_PLAN_10K, PlanWeek, PlanWorkout } from '@/lib/planData';
import styles from './TrainingPlan.module.css';

interface Run {
  id?: string;
  date: string;
  distance: number | null;
  duration: number;
  notes?: string;
  type?: string;
  plan_week?: number | null;
  plan_day?: number | null;
  avg_bpm?: number | null;
  rucking_weight?: number | null;
}

interface TrainingPlanProps {
  runs: Run[];
  onSelectPlanWorkout: (
    weekNum: number,
    dayNum: number,
    workoutType: string,
    existingRun?: Run
  ) => void;
}

export default function TrainingPlan({ runs, onSelectPlanWorkout }: TrainingPlanProps) {
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(1);
  const [activeWeekNum, setActiveWeekNum] = useState<number>(1);

  // Load the active week from localStorage
  useEffect(() => {
    const savedActiveWeek = localStorage.getItem('trote_active_week');
    if (savedActiveWeek) {
      const wNum = parseInt(savedActiveWeek, 10);
      setActiveWeekNum(wNum);
      setSelectedWeekNum(wNum);
    }
  }, []);

  const handleSetSelectionAsActive = () => {
    setActiveWeekNum(selectedWeekNum);
    localStorage.setItem('trote_active_week', selectedWeekNum.toString());
  };

  const getWeekData = (weekNum: number): PlanWeek => {
    return TRAINING_PLAN_10K.find(w => w.weekNum === weekNum) || TRAINING_PLAN_10K[0];
  };

  // Find run for a given week and day of the plan
  const findLoggedRun = (weekNum: number, dayNum: number): Run | undefined => {
    return runs.find(run => run.plan_week === weekNum && run.plan_day === dayNum);
  };

  const currentWeek = getWeekData(selectedWeekNum);

  // Helpers to render labels
  const getWorkoutTypeLabel = (type: string) => {
    switch (type) {
      case 'interval': return 'Trote (Intervalos)';
      case 'rucking': return 'Rucking (Carga)';
      case 'fondo': return 'Trote (Fondo)';
      default: return 'Trote';
    }
  };

  const getWorkoutTypeColorClass = (type: string) => {
    switch (type) {
      case 'interval': return styles.badgeCyan;
      case 'rucking': return styles.badgeEmerald;
      case 'fondo': return styles.badgeViolet;
      default: return '';
    }
  };

  return (
    <div className={styles.planContainer}>
      {/* SECTOR NAVEGACIÓN SEMANAS */}
      <div className={`${styles.weekNavCard} glass-panel fade-in`}>
        <div className={styles.navHeader}>
          <div>
            <h3 className={styles.navTitle}>Semanas del Plan 10K</h3>
            <p className={styles.navSubtitle}>Completa 3 sesiones semanales para entrenar tu base aeróbica</p>
          </div>
          
          <button 
            className={selectedWeekNum === activeWeekNum ? `${styles.activeWeekBtn} ${styles.currentWeekBadge}` : styles.activeWeekBtn}
            onClick={handleSetSelectionAsActive}
            disabled={selectedWeekNum === activeWeekNum}
          >
            {selectedWeekNum === activeWeekNum ? '⭐ Mi Semana Actual' : 'Marcar como Semana Actual'}
          </button>
        </div>

        <div className={styles.weekButtonsContainer}>
          {TRAINING_PLAN_10K.map(week => {
            const isSelected = week.weekNum === selectedWeekNum;
            const isActive = week.weekNum === activeWeekNum;
            
            // Check how many workouts completed in this week
            const completedCount = week.workouts.filter(w => findLoggedRun(week.weekNum, w.dayNum)).length;

            return (
              <button
                key={week.weekNum}
                className={`${styles.weekBtn} ${isSelected ? styles.selectedWeekBtn : ''} ${isActive ? styles.activeWeekIndicator : ''}`}
                onClick={() => setSelectedWeekNum(week.weekNum)}
              >
                <span className={styles.btnLabel}>Sem {week.weekNum}</span>
                <span className={styles.btnProgress}>
                  {completedCount}/3 {completedCount === 3 && '✅'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDERIZAR ENTRENAMIENTOS DE LA SEMANA */}
      <div className={styles.workoutsGrid}>
        {currentWeek.workouts.map((workout: PlanWorkout) => {
          const completedRun = findLoggedRun(selectedWeekNum, workout.dayNum);

          return (
            <div 
              key={workout.dayNum} 
              className={`${styles.workoutCard} glass-panel fade-in ${completedRun ? styles.completedCard : ''}`}
              style={{ animationDelay: `${workout.dayNum * 0.08}s` }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.headerTitles}>
                  <span className={styles.dayBadge}>Día {workout.dayNum}</span>
                  <span className={`${styles.typeBadge} ${getWorkoutTypeColorClass(workout.workoutType)}`}>
                    {getWorkoutTypeLabel(workout.workoutType)}
                  </span>
                </div>
                {completedRun && <span className={styles.checkmarkIcon}>✓ Completado</span>}
              </div>

              <div className={styles.cardBody}>
                <h4 className={styles.workoutName}>{workout.name}</h4>
                
                <div className={styles.workoutGoal}>
                  <svg className={styles.clockIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>
                    Objetivo: {workout.duration > 0 ? `${workout.duration} minutos` : ''} 
                    {workout.distance > 0 ? `${workout.distance} km` : ''}
                  </span>
                </div>

                <p className={styles.workoutDescription}>{workout.description}</p>

                {/* INFO DEL REGISTRO DE ENTRENAMIENTO */}
                {completedRun ? (
                  <div className={styles.completionStats}>
                    <div className={styles.statLine}>
                      <span>
                        <strong>Registrado:</strong>{' '}
                        {completedRun.distance !== null && completedRun.distance !== undefined ? `${completedRun.distance} km ` : ''}
                        {completedRun.rucking_weight !== null && completedRun.rucking_weight !== undefined ? `(Carga: ${completedRun.rucking_weight} kg) ` : ''}
                        en {completedRun.duration} min
                      </span>
                      {completedRun.avg_bpm && (
                        <span className={`${styles.bpmStat} ${completedRun.avg_bpm > 145 ? styles.bpmHigh : ''}`}>
                          💓 {completedRun.avg_bpm} BPM
                        </span>
                      )}
                    </div>
                    {completedRun.notes && (
                      <p className={styles.completionNotes}>
                        <em>"{completedRun.notes}"</em>
                      </p>
                    )}
                    <button
                      className={styles.logBtnEdit}
                      onClick={() => onSelectPlanWorkout(selectedWeekNum, workout.dayNum, workout.workoutType, completedRun)}
                    >
                      Ver / Editar Registro
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.logBtn}
                    onClick={() => onSelectPlanWorkout(selectedWeekNum, workout.dayNum, workout.workoutType)}
                  >
                    + Registrar Sesión
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
