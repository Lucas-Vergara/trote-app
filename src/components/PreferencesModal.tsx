import React, { useState } from "react";
import { Preferences } from "@/lib/preferences";
import { formatPace } from "@/lib/weeklyRecommendation";
import modalStyles from "./RunModal.module.css";
import styles from "./PreferencesModal.module.css";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
}

export default function PreferencesModal({
  isOpen,
  onClose,
  preferences,
  onChange,
}: PreferencesModalProps) {
  const [paceText, setPaceText] = useState(formatPace(preferences.paceGoal.pace));
  const [hrText, setHrText] = useState(String(preferences.paceGoal.maxHR));

  if (!isOpen) return null;

  // Acepta "8:30" o "8.5"; si no es válido, vuelve al valor guardado
  const savePace = () => {
    const m = paceText.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$|^(\d{1,2}[.,]\d+)$/);
    const pace = m
      ? m[3]
        ? Number(m[3].replace(",", "."))
        : Number(m[1]) + Number(m[2] || 0) / 60
      : NaN;
    if (pace >= 4 && pace <= 15) {
      onChange({ paceGoal: { ...preferences.paceGoal, pace } });
      setPaceText(formatPace(pace));
    } else {
      setPaceText(formatPace(preferences.paceGoal.pace));
    }
  };
  const saveHR = () => {
    const maxHR = Math.round(Number(hrText));
    if (maxHR >= 100 && maxHR <= 200) {
      onChange({ paceGoal: { ...preferences.paceGoal, maxHR } });
    } else {
      setHrText(String(preferences.paceGoal.maxHR));
    }
  };

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div
        className={`${modalStyles.modal} glass-panel fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.modalTitle}>Preferencias</h2>
          <button
            className={modalStyles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={modalStyles.closeIcon}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.optionList}>
          <div className={styles.optionRow}>
            <div className={styles.optionText}>
              <span className={styles.optionTitle}>🎯 Objetivo de ritmo</span>
              <span className={styles.optionDescription}>
                El ritmo que quieres sostener en zona 2 y el pulso medio que no
                debe pasar. El plan de la semana ajusta solo el volumen y las
                sesiones para llegar ahí.
              </span>
              <div className={styles.goalFields}>
                <label className={styles.goalField}>
                  <span>Ritmo (min/km)</span>
                  <input
                    className={styles.goalInput}
                    inputMode="decimal"
                    value={paceText}
                    onChange={(e) => setPaceText(e.target.value)}
                    onBlur={savePace}
                  />
                </label>
                <label className={styles.goalField}>
                  <span>Pulso máximo (ppm)</span>
                  <input
                    className={styles.goalInput}
                    inputMode="numeric"
                    value={hrText}
                    onChange={(e) => setHrText(e.target.value)}
                    onBlur={saveHR}
                  />
                </label>
              </div>
            </div>
          </div>

          <label className={styles.optionRow}>
            <div className={styles.optionText}>
              <span className={styles.optionTitle}>🎒 Mostrar Rucking</span>
              <span className={styles.optionDescription}>
                Muestra las sesiones de rucking en el calendario, estadísticas y
                evolución, y permite registrarlas. Desactivado, la app muestra
                solo tus trotes.
              </span>
            </div>
            <input
              type="checkbox"
              role="switch"
              className={styles.switch}
              checked={preferences.showRucking}
              onChange={(e) => onChange({ showRucking: e.target.checked })}
            />
          </label>
        </div>

        <p className={styles.footnote}>
          Las preferencias se guardan en este dispositivo.
        </p>
      </div>
    </div>
  );
}
