import React from 'react';
import styles from './Navbar.module.css';

interface NavbarProps {
  isCloudSynced: boolean;
}

export default function Navbar({ isCloudSynced }: NavbarProps) {
  return (
    <header className={`${styles.header} glass-panel`}>
      <div className={styles.container}>
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

        <div className={styles.statusBadge}>
          {isCloudSynced ? (
            <>
              <span className={`${styles.statusDot} ${styles.dotSynced}`}></span>
              <span className={styles.statusTextMobile}>Nube</span>
              <span className={styles.statusTextDesktop}>Sincronizado con Supabase</span>
            </>
          ) : (
            <>
              <span className={`${styles.statusDot} ${styles.dotLocal}`}></span>
              <span className={styles.statusTextMobile}>Local</span>
              <span className={styles.statusTextDesktop}>Modo Local (Guardado en Navegador)</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
