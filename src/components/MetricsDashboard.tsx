import React, { useState, useMemo } from 'react';
import styles from './MetricsDashboard.module.css';

interface Run {
  id?: string;
  date: string;
  distance: number | null;
  duration: number;
  notes?: string;
  type?: string;
  rucking_weight?: number | null;
}

interface Goal {
  id?: string;
  type: 'weekly' | 'monthly';
  target_distance: number;
  target_runs: number;
  start_date: string;
  end_date: string;
}

interface MetricsDashboardProps {
  runs: Run[];
  weeklyGoal: Goal | null;
  monthlyGoal: Goal | null;
  onEditGoals: (type: 'weekly' | 'monthly') => void;
}

export default function MetricsDashboard({ runs, weeklyGoal, monthlyGoal, onEditGoals }: MetricsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'trote' | 'rucking' | 'combinado'>('trote');

  // Filter runs based on the active tab for the historical stats
  const filteredRunsForStats = useMemo(() => {
    return runs.filter(run => {
      if (activeTab === 'trote') {
        return run.type !== 'rucking';
      }
      if (activeTab === 'rucking') {
        return run.type === 'rucking';
      }
      return true; // 'combinado'
    });
  }, [runs, activeTab]);

  // Helper to get start and end of current week (Monday-Sunday) in local time
  const getCurrentWeekRange = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
  };

  // Helper to get start and end of current month
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: firstDay, end: lastDay };
  };

  const weekRange = getCurrentWeekRange();
  const monthRange = getCurrentMonthRange();

  // Filter runs
  const weeklyRuns = runs.filter(run => {
    const runDate = new Date(run.date + 'T00:00:00'); // Prevent timezone shift
    return runDate >= weekRange.start && runDate <= weekRange.end;
  });

  const monthlyRuns = runs.filter(run => {
    const runDate = new Date(run.date + 'T00:00:00');
    return runDate >= monthRange.start && runDate <= monthRange.end;
  });

  // Calculate achievements
  const weeklyDistance = weeklyRuns.reduce((sum, run) => sum + Number(run.distance), 0);
  const weeklyCount = weeklyRuns.length;

  const monthlyDistance = monthlyRuns.reduce((sum, run) => sum + Number(run.distance), 0);
  const monthlyCount = monthlyRuns.length;

  // Total stats (All-time or overall filtered)
  const totalDistance = filteredRunsForStats.reduce((sum, run) => sum + Number(run.distance || 0), 0);
  const totalRuns = filteredRunsForStats.length;
  const totalDuration = filteredRunsForStats.reduce((sum, run) => sum + run.duration, 0);
  
  // Average Pace: duration in mins / distance in km -> min/km
  const avgPaceRaw = totalDistance > 0 ? totalDuration / totalDistance : 0;
  const avgPaceMinutes = Math.floor(avgPaceRaw);
  const avgPaceSeconds = Math.round((avgPaceRaw - avgPaceMinutes) * 60);

  // Average Weight of backpack for rucking runs
  const ruckingRunsWithWeight = filteredRunsForStats.filter(r => r.rucking_weight !== null && r.rucking_weight !== undefined);
  const totalRuckingWeight = ruckingRunsWithWeight.reduce((sum, r) => sum + Number(r.rucking_weight), 0);
  const avgRuckingWeight = ruckingRunsWithWeight.length > 0 ? totalRuckingWeight / ruckingRunsWithWeight.length : 0;

  // SVG Progress Ring generator
  const ProgressRing = ({ percentage, colorClass }: { percentage: number; colorClass: string }) => {
    const radius = 32;
    const strokeWidth = 6;
    const size = (radius + strokeWidth) * 2;
    const circumference = radius * 2 * Math.PI;
    const clampedPercentage = Math.min(100, Math.max(0, percentage));
    const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

    return (
      <div className={styles.progressRingWrapper}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            className={styles.progressRingBg}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className={`${styles.progressRingCircle} ${colorClass}`}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className={styles.progressValue}>{Math.round(percentage)}%</span>
      </div>
    );
  };

  // Percentages for rings
  const weekDistPct = weeklyGoal ? (weeklyDistance / weeklyGoal.target_distance) * 100 : 0;
  const weekRunsPct = weeklyGoal ? (weeklyCount / weeklyGoal.target_runs) * 100 : 0;
  const weekOverallPct = weeklyGoal ? (weekDistPct + weekRunsPct) / 2 : 0;

  const monthDistPct = monthlyGoal ? (monthlyDistance / monthlyGoal.target_distance) * 100 : 0;
  const monthRunsPct = monthlyGoal ? (monthlyCount / monthlyGoal.target_runs) * 100 : 0;
  const monthOverallPct = monthlyGoal ? (monthDistPct + monthRunsPct) / 2 : 0;

  return (
    <div className={styles.dashboardContainer}>
      {/* SECCIÓN METAS */}
      <div className={styles.goalsGrid}>
        
        {/* Meta Semanal */}
        <div className={`${styles.goalCard} glass-panel fade-in`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Plan Semanal</h3>
            <button className={styles.editBtn} onClick={() => onEditGoals('weekly')}>
              {weeklyGoal ? 'Editar' : 'Configurar'}
            </button>
          </div>
          
          {weeklyGoal ? (
            <div className={styles.goalBody}>
              <ProgressRing percentage={weekOverallPct} colorClass={styles.colorCyan} />
              <div className={styles.goalStats}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Distancia:</span>
                  <span className={styles.statValue}>
                    <strong>{weeklyDistance.toFixed(1)}</strong> / {weeklyGoal.target_distance} km
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div className={`${styles.progressBarFill} ${styles.bgCyan}`} style={{ width: `${Math.min(100, weekDistPct)}%` }}></div>
                </div>

                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Sesiones:</span>
                  <span className={styles.statValue}>
                    <strong>{weeklyCount}</strong> / {weeklyGoal.target_runs}
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div className={`${styles.progressBarFill} ${styles.bgCyan}`} style={{ width: `${Math.min(100, weekRunsPct)}%` }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.noGoal}>
              <p>No tienes una meta semanal configurada.</p>
              <button className="btn-primary" onClick={() => onEditGoals('weekly')}>
                Crear Meta Semanal
              </button>
            </div>
          )}
        </div>

        {/* Meta Mensual */}
        <div className={`${styles.goalCard} glass-panel fade-in`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Plan Mensual</h3>
            <button className={styles.editBtn} onClick={() => onEditGoals('monthly')}>
              {monthlyGoal ? 'Editar' : 'Configurar'}
            </button>
          </div>
          
          {monthlyGoal ? (
            <div className={styles.goalBody}>
              <ProgressRing percentage={monthOverallPct} colorClass={styles.colorViolet} />
              <div className={styles.goalStats}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Distancia:</span>
                  <span className={styles.statValue}>
                    <strong>{monthlyDistance.toFixed(1)}</strong> / {monthlyGoal.target_distance} km
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div className={`${styles.progressBarFill} ${styles.bgViolet}`} style={{ width: `${Math.min(100, monthDistPct)}%` }}></div>
                </div>

                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Sesiones:</span>
                  <span className={styles.statValue}>
                    <strong>{monthlyCount}</strong> / {monthlyGoal.target_runs}
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div className={`${styles.progressBarFill} ${styles.bgViolet}`} style={{ width: `${Math.min(100, monthRunsPct)}%` }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.noGoal}>
              <p>No tienes una meta mensual configurada.</p>
              <button className="btn-primary" onClick={() => onEditGoals('monthly')}>
                Crear Meta Mensual
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN ESTADÍSTICAS GENERALES */}
      <div className={`${styles.statsCard} glass-panel fade-in`} style={{ animationDelay: '0.2s' }}>
        <div className={styles.statsHeader}>
          <h3 className={styles.cardTitle}>Estadísticas Históricas</h3>
          <div className={styles.filterTabs}>
            <button 
              className={`${styles.filterTabBtn} ${activeTab === 'trote' ? `${styles.activeFilterTab} ${styles.activeTrote}` : ''}`}
              onClick={() => setActiveTab('trote')}
            >
              🏃 Trote
            </button>
            <button 
              className={`${styles.filterTabBtn} ${activeTab === 'rucking' ? `${styles.activeFilterTab} ${styles.activeRucking}` : ''}`}
              onClick={() => setActiveTab('rucking')}
            >
              🎒 Rucking
            </button>
            <button 
              className={`${styles.filterTabBtn} ${activeTab === 'combinado' ? `${styles.activeFilterTab} ${styles.activeCombinado}` : ''}`}
              onClick={() => setActiveTab('combinado')}
            >
              🔄 Combinado
            </button>
          </div>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <span className={styles.boxLabel}>Km Totales</span>
            <span className={`${styles.boxValue} text-gradient`}>{totalDistance.toFixed(1)} <span className={styles.boxUnit}>km</span></span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.boxLabel}>Entrenamientos</span>
            <span className={styles.boxValue}>{totalRuns}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.boxLabel}>
              {activeTab === 'rucking' ? 'Peso Promedio' : 'Ritmo Promedio'}
            </span>
            <span className={styles.boxValue}>
              {activeTab === 'rucking' ? (
                `${avgRuckingWeight.toFixed(1)}`
              ) : totalDistance > 0 ? (
                `${avgPaceMinutes}:${avgPaceSeconds.toString().padStart(2, '0')}`
              ) : (
                '0:00'
              )}
              <span className={styles.boxUnit}>
                {activeTab === 'rucking' ? ' kg' : ' min/km'}
              </span>
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.boxLabel}>Tiempo Total</span>
            <span className={styles.boxValue}>
              {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
