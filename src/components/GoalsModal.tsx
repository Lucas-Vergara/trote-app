import React, { useState } from "react";
import styles from "./GoalsModal.module.css";

interface Goal {
  id?: string;
  type: "weekly" | "monthly";
  target_distance: number;
  target_runs: number;
  start_date: string;
  end_date: string;
}

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goalData: {
    id?: string;
    type: "weekly" | "monthly";
    target_distance: number;
    target_runs: number;
    start_date: string;
    end_date: string;
  }) => void;
  type: "weekly" | "monthly";
  existingGoal: Goal | null;
}

export default function GoalsModal({
  isOpen,
  onClose,
  onSubmit,
  type,
  existingGoal,
}: GoalsModalProps) {
  const [distance, setDistance] = useState(
    existingGoal ? existingGoal.target_distance.toString() : "",
  );
  const [runs, setRuns] = useState(
    existingGoal ? existingGoal.target_runs.toString() : "",
  );

  // Remove the useEffect syncing state since we can just use keys on the parent to unmount/remount
  // or initialize values based on props directly.

  if (!isOpen) return null;

  // Helper to format Date to YYYY-MM-DD local string
  const formatDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Auto-calculate start and end dates based on type
  const calculateDates = (): { start: string; end: string } => {
    const now = new Date();

    if (type === "weekly") {
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

      const monday = new Date(now);
      monday.setDate(now.getDate() + distanceToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        start: formatDateStr(monday),
        end: formatDateStr(sunday),
      };
    } else {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return {
        start: formatDateStr(firstDay),
        end: formatDateStr(lastDay),
      };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distance || !runs) {
      alert("Por favor completa los campos requeridos.");
      return;
    }

    const distNum = parseFloat(distance);
    const runsNum = parseInt(runs, 10);

    if (isNaN(distNum) || distNum <= 0) {
      alert("La distancia debe ser un número positivo.");
      return;
    }

    if (isNaN(runsNum) || runsNum <= 0) {
      alert("La cantidad de corridas debe ser mayor a 0.");
      return;
    }

    const { start, end } = calculateDates();

    onSubmit({
      id: existingGoal?.id,
      type,
      target_distance: distNum,
      target_runs: runsNum,
      start_date: start,
      end_date: end,
    });
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} glass-panel fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {existingGoal ? "Editar Meta" : "Crear Meta"}{" "}
            {type === "weekly" ? "Semanal" : "Mensual"}
          </h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={styles.closeIcon}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className={styles.description}>
          Define tus objetivos de carrera. Calcularemos automáticamente el
          periodo de validez para esta{" "}
          {type === "weekly" ? "semana (Lunes a Domingo)" : "mes completo"}.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label htmlFor="goal-distance">Distancia Objetivo (km)</label>
            <input
              id="goal-distance"
              type="number"
              step="0.1"
              min="0.1"
              placeholder={type === "weekly" ? "ej. 20" : "ej. 80"}
              className="form-control"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="goal-runs">Cantidad de Corridas (Sesiones)</label>
            <input
              id="goal-runs"
              type="number"
              min="1"
              placeholder={type === "weekly" ? "ej. 3" : "ej. 12"}
              className="form-control"
              value={runs}
              onChange={(e) => setRuns(e.target.value)}
              required
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Meta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
