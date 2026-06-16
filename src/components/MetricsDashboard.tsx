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
  showOnly?: 'goals' | 'stats' | 'all';
}

export default function MetricsDashboard({ runs, weeklyGoal, monthlyGoal, onEditGoals, showOnly = 'all' }: MetricsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'semanal' | 'mensual' | 'anual'>('semanal');

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

  // Helper to get start and end of current year
  const getCurrentYearRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start: firstDay, end: lastDay };
  };

  const weekRange = getCurrentWeekRange();
  const monthRange = getCurrentMonthRange();

  // Filter runs for goals (keep week/month specific ranges)
  const weeklyRuns = runs.filter(run => {
    const runDate = new Date(run.date + 'T00:00:00'); // Prevent timezone shift
    return runDate >= weekRange.start && runDate <= weekRange.end;
  });

  const monthlyRuns = runs.filter(run => {
    const runDate = new Date(run.date + 'T00:00:00');
    return runDate >= monthRange.start && runDate <= monthRange.end;
  });

  // Calculate achievements for goals progress rings
  const weeklyDistance = weeklyRuns.reduce((sum, run) => sum + Number(run.distance || 0), 0);
  const weeklyCount = weeklyRuns.length;

  const monthlyDistance = monthlyRuns.reduce((sum, run) => sum + Number(run.distance || 0), 0);
  const monthlyCount = monthlyRuns.length;

  // Filter runs for the active tab (period range)
  const filteredRunsForStats = useMemo(() => {
    const range = 
      activeTab === 'semanal' ? getCurrentWeekRange() :
      activeTab === 'mensual' ? getCurrentMonthRange() :
      getCurrentYearRange();
      
    return runs.filter(run => {
      const runDate = new Date(run.date + 'T00:00:00'); // Prevent timezone shift
      return runDate >= range.start && runDate <= range.end;
    });
  }, [runs, activeTab]);

  // Split runs inside the selected period into Trote and Rucking
  const troteRuns = useMemo(() => filteredRunsForStats.filter(r => r.type !== 'rucking'), [filteredRunsForStats]);
  const ruckingRuns = useMemo(() => filteredRunsForStats.filter(r => r.type === 'rucking'), [filteredRunsForStats]);

  // --- Km Totales ---
  const totalDistanceCombined = useMemo(() => filteredRunsForStats.reduce((sum, run) => sum + Number(run.distance || 0), 0), [filteredRunsForStats]);
  const totalDistanceTrote = useMemo(() => troteRuns.reduce((sum, run) => sum + Number(run.distance || 0), 0), [troteRuns]);
  const totalDistanceRucking = useMemo(() => ruckingRuns.reduce((sum, run) => sum + Number(run.distance || 0), 0), [ruckingRuns]);

  // --- Entrenamientos ---
  const totalRunsCombined = filteredRunsForStats.length;
  const totalRunsTrote = troteRuns.length;
  const totalRunsRucking = ruckingRuns.length;

  // --- Rendimiento Promedio ---
  // Trote Pace: duration / distance
  const troteDuration = useMemo(() => troteRuns.reduce((sum, run) => sum + run.duration, 0), [troteRuns]);
  const avgPaceRaw = totalDistanceTrote > 0 ? troteDuration / totalDistanceTrote : 0;
  const avgPaceMinutes = Math.floor(avgPaceRaw);
  const avgPaceSeconds = Math.round((avgPaceRaw - avgPaceMinutes) * 60);
  const trotePaceStr = totalDistanceTrote > 0 ? `${avgPaceMinutes}:${avgPaceSeconds.toString().padStart(2, '0')} min/km` : '0:00 min/km';

  // Rucking Average Weight
  const ruckingRunsWithWeight = useMemo(() => ruckingRuns.filter(r => r.rucking_weight !== null && r.rucking_weight !== undefined), [ruckingRuns]);
  const totalRuckingWeight = useMemo(() => ruckingRunsWithWeight.reduce((sum, r) => sum + Number(r.rucking_weight), 0), [ruckingRunsWithWeight]);
  const avgRuckingWeight = ruckingRunsWithWeight.length > 0 ? totalRuckingWeight / ruckingRunsWithWeight.length : 0;
  const ruckingWeightStr = avgRuckingWeight > 0 ? `${avgRuckingWeight.toFixed(1)} kg` : '0.0 kg';

  // --- Tiempo Total ---
  const totalDurationCombined = useMemo(() => filteredRunsForStats.reduce((sum, run) => sum + run.duration, 0), [filteredRunsForStats]);
  const totalDurationTrote = useMemo(() => troteRuns.reduce((sum, run) => sum + run.duration, 0), [troteRuns]);
  const totalDurationRucking = useMemo(() => ruckingRuns.reduce((sum, run) => sum + run.duration, 0), [ruckingRuns]);

  // Formatter helper for duration (e.g. 2h 45m or 45m)
  const formatDuration = (mins: number) => {
    if (mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const renderRendimientoValue = () => {
    if (totalDistanceTrote > 0 && avgRuckingWeight > 0) {
      return (
        <span className={styles.boxValueSplit}>
          <span className={styles.boxValueTroteSub}>{avgPaceMinutes}:{avgPaceSeconds.toString().padStart(2, '0')}</span>
          <span className={styles.boxValueSeparator}>/</span>
          <span className={styles.boxValueRuckingSub}>{avgRuckingWeight.toFixed(1)}<span className={styles.boxUnitSub}>kg</span></span>
        </span>
      );
    } else if (totalDistanceTrote > 0) {
      return (
        <>
          {avgPaceMinutes}:{avgPaceSeconds.toString().padStart(2, '0')} <span className={styles.boxUnit}>min/km</span>
        </>
      );
    } else if (avgRuckingWeight > 0) {
      return (
        <>
          {avgRuckingWeight.toFixed(1)} <span className={styles.boxUnit}>kg</span>
        </>
      );
    } else {
      return '0:00';
    }
  };

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
      {(showOnly === 'all' || showOnly === 'goals') && (
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
      )}

      {/* SECCIÓN ESTADÍSTICAS POR PERIODO */}
      {(showOnly === 'all' || showOnly === 'stats') && (
        <div className={`${styles.statsCard} glass-panel fade-in`} style={{ animationDelay: '0.2s' }}>
        <div className={styles.statsHeader}>
          <h3 className={styles.cardTitle}>Resumen por Periodo</h3>
          <div className={styles.filterTabs}>
            <button 
              className={`${styles.filterTabBtn} ${activeTab === 'semanal' ? `${styles.activeFilterTab} ${styles.activeSemanal}` : ''}`}
              onClick={() => setActiveTab('semanal')}
            >
              📅 Semanal
            </button>
            <button 
              className={`${styles.filterTabBtn} ${activeTab === 'mensual' ? `${styles.activeFilterTab} ${styles.activeMensual}` : ''}`}
              onClick={() => setActiveTab('mensual')}
            >
              📆 Mensual
            </button>
            <button 
              className={`${styles.filterTabBtn} ${activeTab === 'anual' ? `${styles.activeFilterTab} ${styles.activeAnual}` : ''}`}
              onClick={() => setActiveTab('anual')}
            >
              🗓️ Anual
            </button>
          </div>
        </div>
        
        <div className={styles.statsGrid}>
          {/* Tarjeta 1: Km Totales */}
          <div className={styles.statBox}>
            <span className={styles.boxLabel}>Km Totales</span>
            <span className={`${styles.boxValue} text-gradient`}>
              {totalDistanceCombined.toFixed(1)} <span className={styles.boxUnit}>km</span>
            </span>
            <div className={styles.boxBreakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>🏃 Trote</span>
                <span className={styles.breakdownValue}>{totalDistanceTrote.toFixed(1)} km</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>🎒 Rucking</span>
                <span className={styles.breakdownValue}>{totalDistanceRucking.toFixed(1)} km</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Entrenamientos */}
          <div className={styles.statBox}>
            <span className={styles.boxLabel}>Entrenamientos</span>
            <span className={styles.boxValue}>{totalRunsCombined}</span>
            <div className={styles.boxBreakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>🏃 Trote</span>
                <span className={styles.breakdownValue}>{totalRunsTrote} ses.</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>🎒 Rucking</span>
                <span className={styles.breakdownValue}>{totalRunsRucking} ses.</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Rendimiento Promedio */}
          <div className={styles.statBox}>
            <span className={styles.boxLabel}>Rendimiento Promedio</span>
            <div className={styles.boxValueContainer}>
              {renderRendimientoValue()}
            </div>
            <div className={styles.boxBreakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>🏃 Ritmo Trote</span>
                <span className={styles.breakdownValue}>{trotePaceStr}</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>🎒 Peso Rucking</span>
                <span className={styles.breakdownValue}>{ruckingWeightStr}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 4: Tiempo Total */}
          <div className={styles.statBox}>
            <span className={styles.boxLabel}>Tiempo Total</span>
            <span className={styles.boxValue}>
              {formatDuration(totalDurationCombined)}
            </span>
            <div className={styles.boxBreakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>🏃 Trote</span>
                <span className={styles.breakdownValue}>{formatDuration(totalDurationTrote)}</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.breakdownLabel}>🎒 Rucking</span>
                <span className={styles.breakdownValue}>{formatDuration(totalDurationRucking)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
