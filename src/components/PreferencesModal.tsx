import React from "react";
import { Preferences } from "@/lib/preferences";
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
  if (!isOpen) return null;

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
