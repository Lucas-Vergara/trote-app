import React, { useState } from 'react';
import styles from './RunCalendar.module.css';

interface Run {
  id?: string;
  date: string;
  distance: number;
  duration: number;
  notes?: string;
  type?: string;
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
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
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
    
    // Find if there's an existing run on this day
    const existingRun = runs.find(run => run.date === cell.dateStr);
    onSelectDate(cell.dateStr, existingRun);
  };

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
          // Find run for this cell
          const dayRun = cell.dayNumber ? runs.find(run => run.date === cell.dateStr) : null;
          const today = isToday(cell.dayNumber);

          const isRucking = dayRun?.type === 'rucking';

          return (
            <div
              key={index}
              className={`${styles.dayCell} ${!cell.dayNumber ? styles.emptyCell : ''} ${today ? styles.todayCell : ''} ${dayRun ? (isRucking ? styles.ruckingActiveCell : styles.runActiveCell) : ''}`}
              onClick={() => handleCellClick(cell)}
            >
              {cell.dayNumber && (
                <>
                  <span className={styles.dayNumber}>{cell.dayNumber}</span>
                  {dayRun && (
                    <div className={styles.runIndicator}>
                      <span className={styles.runEmoji}>{isRucking ? '🎒' : '🏃'}</span>
                      <span className={isRucking ? styles.ruckingKm : styles.runKm}>{dayRun.distance} km</span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
