import React, { useState, useEffect } from 'react';
import styles from './RunModal.module.css';

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

interface RunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (runData: {
    id?: string;
    date: string;
    distance: number | null;
    duration: number;
    notes: string;
    type: string;
    plan_week?: number | null;
    plan_day?: number | null;
    avg_bpm?: number | null;
    rucking_weight?: number | null;
  }) => void;
  onDelete?: (id: string) => void;
  selectedDate: string;
  existingRun: Run | null;
  defaultType?: string;
  defaultPlanWeek?: number | null;
  defaultPlanDay?: number | null;
}

export default function RunModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  selectedDate,
  existingRun,
  defaultType = 'run',
  defaultPlanWeek = null,
  defaultPlanDay = null
}: RunModalProps) {
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('run');
  const [avgBpm, setAvgBpm] = useState('');
  const [planWeek, setPlanWeek] = useState<number | null>(null);
  const [planDay, setPlanDay] = useState<number | null>(null);
  const [ruckingWeight, setRuckingWeight] = useState('');

  useEffect(() => {
    if (existingRun) {
      setDate(existingRun.date);
      setDistance(existingRun.distance !== null && existingRun.distance !== undefined ? existingRun.distance.toString() : '');
      setDuration(existingRun.duration.toString());
      setNotes(existingRun.notes || '');
      setType(existingRun.type || 'run');
      setAvgBpm(existingRun.avg_bpm?.toString() || '');
      setPlanWeek(existingRun.plan_week ?? null);
      setPlanDay(existingRun.plan_day ?? null);
      setRuckingWeight(existingRun.rucking_weight !== null && existingRun.rucking_weight !== undefined ? existingRun.rucking_weight.toString() : '');
    } else {
      setDate(selectedDate);
      setDistance('');
      setDuration('');
      setNotes('');
      setType(defaultType);
      setAvgBpm('');
      setPlanWeek(defaultPlanWeek);
      setPlanDay(defaultPlanDay);
      setRuckingWeight('');
    }
  }, [existingRun, selectedDate, isOpen, defaultType, defaultPlanWeek, defaultPlanDay]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isRuckingType = type === 'rucking';
    if (!date || (!isRuckingType && !distance) || !duration) {
      alert('Por favor completa los campos requeridos.');
      return;
    }

    const distNum = distance ? parseFloat(distance) : null;
    const durNum = parseInt(duration, 10);
    const bpmNum = avgBpm ? parseInt(avgBpm, 10) : null;
    const weightNum = isRuckingType && ruckingWeight ? parseFloat(ruckingWeight) : null;

    if (!isRuckingType && (distNum === null || isNaN(distNum) || distNum <= 0)) {
      alert('La distancia debe ser un número positivo.');
      return;
    }

    if (isRuckingType && distance && (distNum === null || isNaN(distNum) || distNum <= 0)) {
      alert('La distancia debe ser un número positivo.');
      return;
    }

    if (isNaN(durNum) || durNum <= 0) {
      alert('La duración debe ser mayor a 0 minutos.');
      return;
    }

    if (bpmNum !== null && (isNaN(bpmNum) || bpmNum <= 0)) {
      alert('Las pulsaciones (BPM) deben ser un número positivo.');
      return;
    }

    onSubmit({
      id: existingRun?.id,
      date,
      distance: distNum,
      duration: durNum,
      notes,
      type,
      plan_week: planWeek,
      plan_day: planDay,
      avg_bpm: bpmNum,
      rucking_weight: weightNum
    });
    onClose();
  };

  const handleDelete = () => {
    if (existingRun?.id && onDelete) {
      if (confirm('¿Estás seguro de que quieres eliminar este entrenamiento?')) {
        onDelete(existingRun.id);
        onClose();
      }
    }
  };

  const showBpmWarning = avgBpm && parseInt(avgBpm, 10) > 145;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glass-panel fade-in`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {existingRun ? 'Editar Sesión' : 'Registrar Sesión'}
            {planWeek && ` (Semana ${planWeek} - Día ${planDay})`}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.closeIcon}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="run-date">Fecha</label>
              <input
                id="run-date"
                type="date"
                className="form-control"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="run-type">Tipo de Actividad</label>
              <select
                id="run-type"
                className="form-control"
                value={type}
                onChange={e => setType(e.target.value)}
                required
              >
                <option value="run">Trote General</option>
                <option value="interval">Trote (Intervalos)</option>
                <option value="rucking">Rucking (Carga)</option>
                <option value="fondo">Trote (Fondo)</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="run-distance">
                Distancia (km) {type === 'rucking' ? '(Opcional)' : ''}
              </label>
              <input
                id="run-distance"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="ej. 5.2"
                className="form-control"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                required={type !== 'rucking'}
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="run-duration">Duración (minutos)</label>
              <input
                id="run-duration"
                type="number"
                min="1"
                placeholder="ej. 30"
                className="form-control"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                required
              />
            </div>
          </div>

          {type === 'rucking' && (
            <div className="form-group">
              <label htmlFor="run-weight">Carga de la Mochila (kg)</label>
              <input
                id="run-weight"
                type="number"
                step="0.1"
                min="0"
                placeholder="ej. 10.0"
                className="form-control"
                value={ruckingWeight}
                onChange={e => setRuckingWeight(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="run-bpm">Frecuencia Cardíaca Promedio (BPM)</label>
            <input
              id="run-bpm"
              type="number"
              min="40"
              max="220"
              placeholder="ej. 138 (Opcional)"
              className="form-control"
              value={avgBpm}
              onChange={e => setAvgBpm(e.target.value)}
            />
          </div>

          {showBpmWarning && (
            <div className={styles.bpmAlert}>
              ⚠️ <strong>Límite de Pulso Superado (145 BPM):</strong> El Plan Base indica que si tus BPM superan los 145, debes caminar hasta que bajen de 130. Recuerda mantener un control estricto de tu reloj.
            </div>
          )}

          <div className="form-group">
            <label htmlFor="run-notes">Notas / ¿Cómo te sentiste?</label>
            <textarea
              id="run-notes"
              rows={3}
              placeholder="ej. Trote suave. Controlé el pulso al subir pendientes."
              className="form-control"
              style={{ resize: 'none' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            {existingRun && onDelete && (
              <button type="button" className="btn-danger" onClick={handleDelete}>
                Eliminar
              </button>
            )}
            
            <div className={styles.rightActions}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
