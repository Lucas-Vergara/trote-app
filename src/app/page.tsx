'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import MetricsDashboard from '@/components/MetricsDashboard';
import RunCalendar from '@/components/RunCalendar';
import RunModal from '@/components/RunModal';
import GoalsModal from '@/components/GoalsModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import styles from './page.module.css';

interface Run {
  id?: string;
  date: string;
  distance: number;
  duration: number;
  notes?: string;
}

interface Goal {
  id?: string;
  type: 'weekly' | 'monthly';
  target_distance: number;
  target_runs: number;
  start_date: string;
  end_date: string;
}

export default function Home() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<Goal | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<Goal | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [useLocalMode, setUseLocalMode] = useState(!isSupabaseConfigured);
  const [dbError, setDbError] = useState<string | null>(null);

  // Modals state
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [editingRun, setEditingRun] = useState<Run | null>(null);

  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState<'weekly' | 'monthly'>('weekly');

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      
      if (isSupabaseConfigured && !useLocalMode) {
        try {
          // Fetch runs
          const { data: runsData, error: runsError } = await supabase
            .from('runs')
            .select('*')
            .order('date', { ascending: false });

          // Fetch goals
          const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select('*');

          if (runsError || goalsError) {
            console.error('Error cargando de Supabase, activando Modo Local:', runsError || goalsError);
            setDbError('¿Falta ejecutar el script SQL de las tablas? Activando Modo Local de respaldo.');
            setUseLocalMode(true);
            loadLocalData();
          } else {
            setRuns(runsData || []);
            
            const wGoal = goalsData?.find(g => g.type === 'weekly') || null;
            const mGoal = goalsData?.find(g => g.type === 'monthly') || null;
            setWeeklyGoal(wGoal);
            setMonthlyGoal(mGoal);
            setDbError(null);
          }
        } catch (err) {
          console.error('Fallo al conectar con Supabase, usando Modo Local:', err);
          setDbError('Error de red al conectar con Supabase. Usando Modo Local.');
          setUseLocalMode(true);
          loadLocalData();
        }
      } else {
        loadLocalData();
      }
      setIsLoading(false);
    }

    loadData();
  }, [useLocalMode]);

  // Load from localStorage (with beautiful default mock data if empty)
  const loadLocalData = () => {
    try {
      const cachedRuns = localStorage.getItem('trote_runs');
      const cachedWeeklyGoal = localStorage.getItem('trote_weekly_goal');
      const cachedMonthlyGoal = localStorage.getItem('trote_monthly_goal');

      if (cachedRuns) {
        setRuns(JSON.parse(cachedRuns));
      } else {
        // Generate mock runs relative to current date
        const today = new Date();
        const formatDateOffset = (daysOffset: number) => {
          const d = new Date(today);
          d.setDate(today.getDate() - daysOffset);
          return d.toISOString().split('T')[0];
        };

        const mockRuns: Run[] = [
          { date: formatDateOffset(1), distance: 5.4, duration: 28, notes: 'Buen trote suave, excelente clima fresco.' },
          { date: formatDateOffset(3), distance: 8.2, duration: 45, notes: 'Trote de fondo a ritmo moderado. Muy buenas sensaciones.' },
          { date: formatDateOffset(6), distance: 4.0, duration: 22, notes: 'Entrenamiento corto de velocidad y pasadas.' },
        ];
        setRuns(mockRuns);
        localStorage.setItem('trote_runs', JSON.stringify(mockRuns));
      }

      if (cachedWeeklyGoal) {
        setWeeklyGoal(JSON.parse(cachedWeeklyGoal));
      } else {
        // Mock weekly goal
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const wGoal: Goal = {
          type: 'weekly',
          target_distance: 20,
          target_runs: 3,
          start_date: monday.toISOString().split('T')[0],
          end_date: sunday.toISOString().split('T')[0],
        };
        setWeeklyGoal(wGoal);
        localStorage.setItem('trote_weekly_goal', JSON.stringify(wGoal));
      }

      if (cachedMonthlyGoal) {
        setMonthlyGoal(JSON.parse(cachedMonthlyGoal));
      } else {
        // Mock monthly goal
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const mGoal: Goal = {
          type: 'monthly',
          target_distance: 80,
          target_runs: 12,
          start_date: firstDay.toISOString().split('T')[0],
          end_date: lastDay.toISOString().split('T')[0],
        };
        setMonthlyGoal(mGoal);
        localStorage.setItem('trote_monthly_goal', JSON.stringify(mGoal));
      }
    } catch (e) {
      console.error('Error leyendo del almacenamiento local:', e);
    }
  };

  // Run Mutations: Add/Edit
  const handleRunSubmit = async (runData: { id?: string; date: string; distance: number; duration: number; notes: string }) => {
    if (useLocalMode) {
      let updatedRuns;
      if (runData.id) {
        // Edit
        updatedRuns = runs.map(r => r.id === runData.id ? { ...r, ...runData } : r);
      } else {
        // Add
        const newRun: Run = {
          id: Math.random().toString(36).substring(2, 9),
          ...runData
        };
        updatedRuns = [newRun, ...runs];
      }
      setRuns(updatedRuns);
      localStorage.setItem('trote_runs', JSON.stringify(updatedRuns));
    } else {
      setIsLoading(true);
      try {
        if (runData.id) {
          const { error } = await supabase
            .from('runs')
            .update({
              date: runData.date,
              distance: runData.distance,
              duration: runData.duration,
              notes: runData.notes
            })
            .eq('id', runData.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('runs')
            .insert([{
              date: runData.date,
              distance: runData.distance,
              duration: runData.duration,
              notes: runData.notes
            }]);
          if (error) throw error;
        }
        
        // Reload
        const { data } = await supabase.from('runs').select('*').order('date', { ascending: false });
        setRuns(data || []);
      } catch (err) {
        console.error('Error guardando en Supabase:', err);
        alert('Error al guardar en la nube. Revisa la consola o usa el modo local.');
      }
      setIsLoading(false);
    }
  };

  // Run Mutation: Delete
  const handleRunDelete = async (id: string) => {
    if (useLocalMode) {
      const updatedRuns = runs.filter(r => r.id !== id);
      setRuns(updatedRuns);
      localStorage.setItem('trote_runs', JSON.stringify(updatedRuns));
    } else {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('runs').delete().eq('id', id);
        if (error) throw error;
        
        const { data } = await supabase.from('runs').select('*').order('date', { ascending: false });
        setRuns(data || []);
      } catch (err) {
        console.error('Error eliminando de Supabase:', err);
        alert('Error al eliminar de la nube.');
      }
      setIsLoading(false);
    }
  };

  // Goal Mutation: Add/Edit
  const handleGoalSubmit = async (goalData: { id?: string; type: 'weekly' | 'monthly'; target_distance: number; target_runs: number; start_date: string; end_date: string }) => {
    if (useLocalMode) {
      const updatedGoal: Goal = {
        id: goalData.id || Math.random().toString(36).substring(2, 9),
        ...goalData
      };
      
      if (goalData.type === 'weekly') {
        setWeeklyGoal(updatedGoal);
        localStorage.setItem('trote_weekly_goal', JSON.stringify(updatedGoal));
      } else {
        setMonthlyGoal(updatedGoal);
        localStorage.setItem('trote_monthly_goal', JSON.stringify(updatedGoal));
      }
    } else {
      setIsLoading(true);
      try {
        if (goalData.id) {
          const { error } = await supabase
            .from('goals')
            .update({
              target_distance: goalData.target_distance,
              target_runs: goalData.target_runs,
              start_date: goalData.start_date,
              end_date: goalData.end_date
            })
            .eq('id', goalData.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('goals')
            .insert([{
              type: goalData.type,
              target_distance: goalData.target_distance,
              target_runs: goalData.target_runs,
              start_date: goalData.start_date,
              end_date: goalData.end_date
            }]);
          if (error) throw error;
        }

        // Reload goals
        const { data } = await supabase.from('goals').select('*');
        setWeeklyGoal(data?.find(g => g.type === 'weekly') || null);
        setMonthlyGoal(data?.find(g => g.type === 'monthly') || null);
      } catch (err) {
        console.error('Error guardando meta en Supabase:', err);
        alert('Error al guardar la meta en la nube.');
      }
      setIsLoading(false);
    }
  };

  // Modal Triggers
  const handleSelectDate = (dateStr: string, existingRun?: Run) => {
    setSelectedDate(dateStr);
    setEditingRun(existingRun || null);
    setIsRunModalOpen(true);
  };

  const handleQuickLog = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    handleSelectDate(todayStr);
  };

  const handleEditGoals = (type: 'weekly' | 'monthly') => {
    setSelectedGoalType(type);
    setIsGoalsModalOpen(true);
  };

  const activeGoalForModal = selectedGoalType === 'weekly' ? weeklyGoal : monthlyGoal;

  return (
    <main className={styles.mainContainer}>
      <Navbar isCloudSynced={!useLocalMode} />

      {/* ALERTAS Y MENSAJES DE ESTADO */}
      <div className={styles.infoArea}>
        {!isSupabaseConfigured && (
          <div className={`${styles.alertBanner} glass-panel fade-in`}>
            <div className={styles.alertIcon}>💡</div>
            <div className={styles.alertContent}>
              <p className={styles.alertTitle}>Aplicación Ejecutándose en Modo Local</p>
              <p className={styles.alertText}>
                Tus datos están guardados localmente en este dispositivo. Para sincronizarlos entre tu celular y computador en la nube, duplica el archivo <code>.env.local.example</code> como <code>.env.local</code> y configura tus credenciales de Supabase.
              </p>
            </div>
          </div>
        )}

        {isSupabaseConfigured && dbError && (
          <div className={`${styles.alertBanner} ${styles.alertWarning} glass-panel fade-in`}>
            <div className={styles.alertIcon}>⚠️</div>
            <div className={styles.alertContent}>
              <p className={styles.alertTitle}>Base de Datos No Configurada</p>
              <p className={styles.alertText}>
                No pudimos acceder a las tablas de Supabase. Recuerda copiar y ejecutar el script SQL de <code>supabase_schema.sql</code> en el **SQL Editor** de tu consola de Supabase.
              </p>
            </div>
            <button className={styles.bannerCloseBtn} onClick={() => setUseLocalMode(true)}>
              Usar Modo Local
            </button>
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className={styles.dashboardSection}>
        <MetricsDashboard
          runs={runs}
          weeklyGoal={weeklyGoal}
          monthlyGoal={monthlyGoal}
          onEditGoals={handleEditGoals}
        />
      </div>

      <div className={styles.calendarSection}>
        <RunCalendar
          runs={runs}
          onSelectDate={handleSelectDate}
          onQuickLog={handleQuickLog}
        />
      </div>

      {/* CARGANDO OVERLAY */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}

      {/* MODALES */}
      <RunModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        selectedDate={selectedDate}
        existingRun={editingRun}
        onSubmit={handleRunSubmit}
        onDelete={handleRunDelete}
      />

      <GoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        type={selectedGoalType}
        existingGoal={activeGoalForModal}
        onSubmit={handleGoalSubmit}
      />
    </main>
  );
}
