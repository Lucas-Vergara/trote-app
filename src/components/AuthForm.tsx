import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './AuthForm.module.css';

interface AuthFormProps {
  onAuthSuccess: () => void;
  onGuestAccess: () => void;
}

export default function AuthForm({ onAuthSuccess, onGuestAccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setMessage({ text: 'Por favor, rellena todos los campos.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Log In
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) throw error;
        onAuthSuccess();
      } else {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
        });

        if (error) throw error;

        // Supabase sometimes requires email confirmation depending on settings
        if (data.session) {
          setMessage({ text: '¡Cuenta creada con éxito!', type: 'success' });
          onAuthSuccess();
        } else {
          setMessage({
            text: '¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.',
            type: 'success',
          });
        }
      }
    } catch (err: any) {
      console.error('Error de autenticación:', err);
      let errorMsg = err.message || 'Ocurrió un error inesperado.';
      
      // Translate common error messages
      if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = 'Credenciales de inicio de sesión inválidas. Revisa tu correo o contraseña.';
      } else if (errorMsg.includes('User already registered')) {
        errorMsg = 'Este correo electrónico ya está registrado.';
      } else if (errorMsg.includes('Signup is disabled')) {
        errorMsg = 'El registro de nuevas cuentas está deshabilitado en esta aplicación. Solo los usuarios invitados pueden acceder.';
      }
      
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={`${styles.authCard} glass-panel fade-in`}>
        {/* LOGO */}
        <div className={styles.logoSection}>
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
          <h1 className={styles.logoText}>Trote<span className="text-gradient">App</span></h1>
          <p className={styles.tagline}>Tu planificador privado de carrera 10K</p>
        </div>

        {/* TABS NAVEGACIÓN */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${isLogin ? styles.activeTab : ''}`}
            onClick={() => {
              setIsLogin(true);
              setMessage(null);
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${!isLogin ? styles.activeTab : ''}`}
            onClick={() => {
              setIsLogin(false);
              setMessage(null);
            }}
          >
            Crear Cuenta
          </button>
        </div>

        {/* MENSAJE DE ESTADO */}
        {message && (
          <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
            {message.type === 'error' ? '⚠️ ' : '✅ '}
            {message.text}
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label htmlFor="auth-email">Correo Electrónico</label>
            <input
              id="auth-email"
              type="email"
              placeholder="correo@ejemplo.com"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? (
              <div className={styles.spinner}></div>
            ) : isLogin ? (
              'Ingresar'
            ) : (
              'Registrarse'
            )}
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', marginTop: '12px' }}
            onClick={onGuestAccess}
            disabled={loading}
          >
            Entrar como Invitado (Datos Locales)
          </button>
        </form>

        <p className={styles.securityNote}>
          {isLogin ? (
            'Ingresa tus credenciales autorizadas.'
          ) : (
            'Nota: Puedes desactivar los registros libres desde el panel de Supabase en Authentication > Providers para hacer tu app 100% privada.'
          )}
        </p>
      </div>
    </div>
  );
}
