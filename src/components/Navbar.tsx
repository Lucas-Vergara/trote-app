import React from 'react';
import styles from './Navbar.module.css';

interface NavbarProps {
  isCloudSynced: boolean;
  userEmail?: string | null;
  onLogout?: () => void;
  onLoginClick?: () => void;
  onPreferencesClick?: () => void;
  onSyncClick?: () => void;
  isSyncing?: boolean;
}

export default function Navbar({ isCloudSynced, userEmail, onLogout, onLoginClick, onPreferencesClick, onSyncClick, isSyncing }: NavbarProps) {
  // Extract name prefix from email (e.g. lucas@example.com -> lucas)
  const displayName = userEmail ? userEmail.split('@')[0] : '';

  return (
    <header className={`${styles.header} glass-panel`}>
      <div className={styles.container}>
        {/* LOGO */}
        <div className={styles.logoContainer}>
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h.01" />
            <path d="M17 22v-3a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3" />
            <path d="M2 10h20" />
            <path d="M12 2v8" />
            <path d="M12 14v8" />
            <path d="M20 14h2" />
            <path d="M2 14h2" />
            <path d="M6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
          </svg>
          <span className={styles.logoText}>Trote<span className="text-gradient">App</span></span>
        </div>

        {/* STATUS AND USER INFO */}
        <div className={styles.rightActionsContainer}>
          <div className={styles.statusBadge}>
            {isCloudSynced ? (
              <>
                <span className={`${styles.statusDot} ${styles.dotSynced}`}></span>
                <span className={styles.statusTextMobile}>Nube</span>
                <span className={styles.statusTextDesktop}>Nube</span>
              </>
            ) : (
              <>
                <span className={`${styles.statusDot} ${styles.dotLocal}`}></span>
                <span className={styles.statusTextMobile}>Local</span>
                <span className={styles.statusTextDesktop}>Modo Local</span>
              </>
            )}
          </div>

          {onSyncClick && (
            <button
              className={styles.prefsBtn}
              onClick={onSyncClick}
              disabled={isSyncing}
              aria-label="Sincronizar con Zepp"
              title="Sincronizar con Zepp"
            >
              <svg className={`${styles.prefsIcon} ${isSyncing ? styles.spinning : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          )}

          {onPreferencesClick && (
            <button className={styles.prefsBtn} onClick={onPreferencesClick} aria-label="Preferencias" title="Preferencias">
              <svg className={styles.prefsIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}

          {!isCloudSynced && onLoginClick && (
            <button className={styles.loginBtn} onClick={onLoginClick} aria-label="Conectar nube">
              <svg className={styles.loginIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span className={styles.loginText}>Conectar Nube</span>
            </button>
          )}

          {userEmail && (
            <div className={styles.userSection}>
              <span className={styles.userEmail} title={userEmail}>
                👤 {displayName}
              </span>
              <button className={styles.logoutBtn} onClick={onLogout} aria-label="Cerrar sesión">
                <svg className={styles.logoutIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className={styles.logoutText}>Salir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
