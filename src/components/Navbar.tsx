import React from 'react';
import styles from './Navbar.module.css';

interface NavbarProps {
  isCloudSynced: boolean;
  userEmail?: string | null;
  onLogout?: () => void;
}

export default function Navbar({ isCloudSynced, userEmail, onLogout }: NavbarProps) {
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
