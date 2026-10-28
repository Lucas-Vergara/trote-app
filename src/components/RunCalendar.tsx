import React, { useState } from 'react';
import styles from './RunCalendar.module.css';

interface Run {
  id?: string;
  date: string;
  distance: number | null;
  duration: number;
  notes?: string;
  type?: string;
  rucking_weight?: number | null;
}

interface RunCalendarProps {
  runs: Run[];
  onSelectDate: (dateStr: string, existingRun?: Run) => void;
  onQuickLog: () => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function RunCalendar({ runs, onSelectDate, onQuickLog }: RunCalendarProps) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  // Día con varias sesiones cuyo selector está abierto
  const [pickerDate, setPickerDate] = useState<string | null>(null);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    // Adjusting so week starts on Monday:
    // Sunday (0) -> 6, Monday (1) -> 0, Tuesday (2) -> 1 ...
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    setPickerDate(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    setPickerDate(null);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate calendar days
  const calendarCells = [];
  
  // Fillers for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ dayNumber: null, dateStr: '' });
  }

  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = (currentMonth + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    calendarCells.push({ dayNumber: day, dateStr });
  }

  const handleCellClick = (cell: { dayNumber: number | null; dateStr: string }) => {
    if (!cell.dayNumber) return;
    
    const dayRuns = runs.filter(run => run.date === cell.dateStr);
    if (dayRuns.length > 1) {
      // Con varias sesiones, se elige cuál abrir
      setPickerDate(pickerDate === cell.dateStr ? null : cell.dateStr);
      return;
    }
    setPickerDate(null);
    onSelectDate(cell.dateStr, dayRuns[0]);
  };

  const formatKm = (distance: number | null | undefined) =>
    `${distance !== null && distance !== undefined ? parseFloat(Number(distance).toFixed(1)) : 0} km`;

  const formatRuck = (run: Run) =>
    run.rucking_weight !== null && run.rucking_weight !== undefined ? `${run.rucking_weight} kg` : 'Ruck';

  const pickerRuns = pickerDate ? runs.filter(run => run.date === pickerDate) : [];
  const pickerLabel = pickerDate
    ? new Date(`${pickerDate}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  const isToday = (dayNumber: number | null) => {
    if (!dayNumber) return false;
    const today = new Date();
    return today.getDate() === dayNumber && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  return (
    <div className={`${styles.calendarWrapper} glass-panel fade-in`} style={{ animationDelay: '0.3s' }}>
      
      {/* CABECERA CALENDARIO */}
      <div className={styles.calendarHeader}>
        <div className={styles.monthTitle}>
          <h2>{MONTH_NAMES[currentMonth]} <span className="text-gradient">{currentYear}</span></h2>
        </div>
        
        <div className={styles.headerActions}>
          <button className={styles.navBtn} onClick={prevMonth} aria-label="Mes anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.navIcon}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          
          <button className={styles.navBtn} onClick={nextMonth} aria-label="Mes siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.navIcon}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={onQuickLog}>
            <span>+ Trote</span>
          </button>
        </div>
      </div>

      {/* DÍAS DE LA SEMANA */}
      <div className={styles.weekdaysGrid}>
        {WEEKDAYS.map(day => (
          <div key={day} className={styles.weekdayCell}>{day}</div>
        ))}
      </div>

      {/* GRID DE DÍAS */}
      <div className={styles.daysGrid}>
        {calendarCells.map((cell, index) => {
          const dayRuns = cell.dayNumber ? runs.filter(run => run.date === cell.dateStr) : [];
          const dayRun = dayRuns[0];
          const today = isToday(cell.dayNumber);

          // Si hubo trote ese día manda el trote; el rucking solo cuando es lo único
          const trotes = dayRuns.filter(run => run.type !== 'rucking');
          const isRucking = dayRuns.length > 0 && trotes.length === 0;
          const totalKm = trotes.reduce((sum, run) => sum + Number(run.distance ?? 0), 0);

          return (
            <div
              key={index}
              className={`${styles.dayCell} ${!cell.dayNumber ? styles.emptyCell : ''} ${today ? styles.todayCell : ''} ${dayRun ? (isRucking ? styles.ruckingActiveCell : styles.runActiveCell) : ''} ${pickerDate === cell.dateStr ? styles.pickedCell : ''}`}
              onClick={() => handleCellClick(cell)}
            >
              {cell.dayNumber && (
                <>
                  <span className={styles.dayNumber}>{cell.dayNumber}</span>
                  {dayRuns.length > 1 && (
                    <span className={styles.countBadge} aria-label={`${dayRuns.length} sesiones`}>×{dayRuns.length}</span>
                  )}
                  {dayRun && <span className={styles.dayEmoji}>{isRucking ? '🎒' : '🏃'}</span>}
                  {dayRun && (
                    <div className={styles.runInfo}>
                      <span className={isRucking ? styles.ruckingKm : styles.runKm}>
                        {isRucking ? formatRuck(dayRun) : formatKm(totalKm)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* SESIONES DEL DÍA (cuando hay más de una) */}
      {pickerRuns.length > 1 && pickerDate && (
        <div className={styles.dayPicker}>
          <div className={styles.dayPickerHeader}>
            <span className={styles.dayPickerTitle}>{pickerLabel}</span>
            <button className={styles.dayPickerClose} onClick={() => setPickerDate(null)} aria-label="Cerrar sesiones del día">×</button>
          </div>
          {pickerRuns.map((run, i) => (
            <button key={run.id ?? i} className={styles.sessionRow} onClick={() => onSelectDate(pickerDate, run)}>
              <span>{run.type === 'rucking' ? '🎒' : '🏃'}</span>
              <span className={styles.sessionMain}>{run.type === 'rucking' ? formatRuck(run) : formatKm(run.distance)}</span>
              <span className={styles.sessionMeta}>{run.duration} min</span>
              <span className={styles.sessionAction}>Editar</span>
            </button>
          ))}
          <button className={styles.addSession} onClick={() => onSelectDate(pickerDate)}>+ Agregar otra sesión</button>
        </div>
      )}
    </div>
  );
}
