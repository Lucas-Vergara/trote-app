import React, { useState, useEffect } from 'react';
import styles from './RunModal.module.css';

interface Run {
  id?: string;
  date: string;
  distance: number;
  duration: number;
  notes?: string;
}

interface RunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (runData: { id?: string; date: string; distance: number; duration: number; notes: string }) => void;
  onDelete?: (id: string) => void;
  selectedDate: string;
  existingRun: Run | null;
}

export default function RunModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  selectedDate,
  existingRun
}: RunModalProps) {
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingRun) {
      setDate(existingRun.date);
      setDistance(existingRun.distance.toString());
      setDuration(existingRun.duration.toString());
      setNotes(existingRun.notes || '');
    } else {
      setDate(selectedDate);
      setDistance('');
      setDuration('');
      setNotes('');
    }
  }, [existingRun, selectedDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !distance || !duration) {
      alert('Por favor completa los campos requeridos.');
      return;
    }

    const distNum = parseFloat(distance);
    const durNum = parseInt(duration, 10);

    if (isNaN(distNum) || distNum <= 0) {
      alert('La distancia debe ser un número positivo.');
      return;
    }

    if (isNaN(durNum) || durNum <= 0) {
      alert('La duración debe ser mayor a 0 minutos.');
      return;
    }

    onSubmit({
      id: existingRun?.id,
      date,
      distance: distNum,
      duration: durNum,
      notes
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glass-panel fade-in`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {existingRun ? 'Editar Entrenamiento' : 'Registrar Entrenamiento'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.closeIcon}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
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

          <div className={styles.formRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="run-distance">Distancia (km)</label>
              <input
                id="run-distance"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="ej. 5.2"
                className="form-control"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                required
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

          <div className="form-group">
            <label htmlFor="run-notes">Notas / ¿Cómo te sentiste?</label>
            <textarea
              id="run-notes"
              rows={3}
              placeholder="ej. Buen ritmo, me sentí con energía. Clima fresco."
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
