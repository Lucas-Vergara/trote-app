"use client";

import React, { useState, useEffect, useEffectEvent } from "react";
import Navbar from "@/components/Navbar";
import MetricsDashboard from "@/components/MetricsDashboard";
import RunCalendar from "@/components/RunCalendar";
import RunModal from "@/components/RunModal";
import GoalsModal from "@/components/GoalsModal";
// Plan 10K desactivado: la app ahora se enfoca en monitorear la evolución
// import TrainingPlan from "@/components/TrainingPlan";
import TrainingEvolution from "@/components/TrainingEvolution";
import WeeklyRecommendation from "@/components/WeeklyRecommendation";
import PreferencesModal from "@/components/PreferencesModal";
import AuthForm from "@/components/AuthForm";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
// import { TRAINING_PLAN_10K } from "@/lib/planData";
import { usePreferences } from "@/lib/preferences";
import styles from "./page.module.css";

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

interface Goal {
  id?: string;
  type: "weekly" | "monthly";
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

  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // Navigation State
  const [activeTab, setActiveTab] = useState<"progress" | "evolution" | "week">(
    "progress",
  );

  // Preferences (rucking hidden by default)
  const [preferences, updatePreferences] = usePreferences();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const visibleRuns = preferences.showRucking
    ? runs
    : runs.filter((r) => r.type !== "rucking");

  // Modals state
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingRun, setEditingRun] = useState<Run | null>(null);

  // Plan 10K desactivado: contextos ocultos del plan para RunModal
  // const [planDefaultType, setPlanDefaultType] = useState("run");
  // const [planDefaultWeek, setPlanDefaultWeek] = useState<number | null>(null);
  // const [planDefaultDay, setPlanDefaultDay] = useState<number | null>(null);

  // Zepp (Intervals.icu) sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState<
    "weekly" | "monthly"
  >("weekly");

  // Load from localStorage (with default mock data if empty)
  function loadLocalData() {
    try {
      const cachedRuns = localStorage.getItem("trote_runs");
      const cachedWeeklyGoal = localStorage.getItem("trote_weekly_goal");
      const cachedMonthlyGoal = localStorage.getItem("trote_monthly_goal");

      if (cachedRuns) {
        setRuns(JSON.parse(cachedRuns));
      } else {
        // Generate mock runs relative to current date
        const today = new Date();
        const formatDateOffset = (daysOffset: number) => {
          const d = new Date(today);
          d.setDate(today.getDate() - daysOffset);
          return d.toISOString().split("T")[0];
        };

        const mockRuns: Run[] = [
          {
            date: formatDateOffset(1),
            distance: 5.4,
            duration: 28,
            notes: "Buen trote suave, excelente clima fresco.",
            type: "run",
            avg_bpm: 135,
          },
          {
            date: formatDateOffset(3),
            distance: 8.2,
            duration: 45,
            notes: "Trote de fondo a ritmo moderado. Muy buenas sensaciones.",
            type: "run",
            avg_bpm: 138,
          },
          {
            date: formatDateOffset(6),
            distance: 4.0,
            duration: 22,
            notes: "Entrenamiento corto de velocidad y pasadas.",
            type: "run",
            avg_bpm: 142,
          },
        ];
        setRuns(mockRuns);
        localStorage.setItem("trote_runs", JSON.stringify(mockRuns));
      }

      if (cachedWeeklyGoal) {
        setWeeklyGoal(JSON.parse(cachedWeeklyGoal));
      } else {
        // Mock weekly goal
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(
          now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1),
        );
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const wGoal: Goal = {
          type: "weekly",
          target_distance: 20,
          target_runs: 3,
          start_date: monday.toISOString().split("T")[0],
          end_date: sunday.toISOString().split("T")[0],
        };
        setWeeklyGoal(wGoal);
        localStorage.setItem("trote_weekly_goal", JSON.stringify(wGoal));
      }

      if (cachedMonthlyGoal) {
        setMonthlyGoal(JSON.parse(cachedMonthlyGoal));
      } else {
        // Mock monthly goal
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const mGoal: Goal = {
          type: "monthly",
          target_distance: 80,
          target_runs: 12,
          start_date: firstDay.toISOString().split("T")[0],
          end_date: lastDay.toISOString().split("T")[0],
        };
        setMonthlyGoal(mGoal);
        localStorage.setItem("trote_monthly_goal", JSON.stringify(mGoal));
      }
    } catch (e) {
      console.error("Error leyendo del almacenamiento local:", e);
    }
  }

  // Listen for Auth State Changes
  useEffect(() => {
    if (isSupabaseConfigured) {
      // Get current session on load
      supabase.auth.getSession().then(({ data: { session } }) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          setUseLocalMode(false);
        }
      });

      // Subscribe to updates
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          setUseLocalMode(false);
        } else {
          // Reset data when logging out
          setRuns([]);
          setWeeklyGoal(null);
          setMonthlyGoal(null);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Load data based on Auth / Local Mode
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      if (isSupabaseConfigured && !useLocalMode && user) {
        try {
          // Fetch runs for the active user (RLS will automatically enforce user filter,
          // but we can query directly)
          const { data: runsData, error: runsError } = await supabase
            .from("runs")
            .select("*")
            .order("date", { ascending: false });

          // Fetch goals
          const { data: goalsData, error: goalsError } = await supabase
            .from("goals")
            .select("*");

          if (runsError || goalsError) {
            console.error(
              "Error cargando de Supabase, activando Modo Local:",
              runsError || goalsError,
            );
            setDbError(
              "¿Falta ejecutar el script SQL de las tablas? Activando Modo Local de respaldo.",
            );
            setUseLocalMode(true);
            loadLocalData();
          } else {
            setRuns(runsData || []);

            const wGoal = goalsData?.find((g) => g.type === "weekly") || null;
            const mGoal = goalsData?.find((g) => g.type === "monthly") || null;
            setWeeklyGoal(wGoal);
            setMonthlyGoal(mGoal);
            setDbError(null);
          }
        } catch (err) {
          console.error(
            "Fallo al conectar con Supabase, usando Modo Local:",
            err,
          );
          setDbError(
            "Error de red al conectar con Supabase. Usando Modo Local.",
          );
          setUseLocalMode(true);
          loadLocalData();
        }
      } else if (useLocalMode) {
        loadLocalData();
      }
      setIsLoading(false);
    }

    loadData();
  }, [useLocalMode, user]);

  // Sync runs recorded in Zepp through Intervals.icu (server route keeps the API key)
  const syncFromZepp = async (manual: boolean) => {
    if (!isSupabaseConfigured || useLocalMode || !user) return;
    const LAST_SYNC_KEY = "trote_last_zepp_sync";
    let lastSync: number | null = null;
    try {
      const raw = localStorage.getItem(LAST_SYNC_KEY);
      lastSync = raw ? Number(raw) : null;
    } catch {
      lastSync = null;
    }
    // Automatic sync at most every 30 minutes
    if (!manual && lastSync && Date.now() - lastSync < 30 * 60 * 1000) return;

    setIsSyncing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // First sync brings the last year; afterwards, the last 30 days
      const res = await fetch("/api/sync/intervals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ days: lastSync ? 30 : 365 }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 501/403: sync not configured for this deployment/account; stay quiet unless asked
        if (manual || (res.status !== 501 && res.status !== 403)) {
          setSyncMessage(`⚠️ ${result.error || "No se pudo sincronizar con Zepp."}`);
        }
        return;
      }

      try {
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      } catch {
        // ignore storage errors
      }

      if (result.imported > 0 || result.linked > 0) {
        const { data } = await supabase
          .from("runs")
          .select("*")
          .order("date", { ascending: false });
        setRuns(data || []);
        const parts = [];
        if (result.imported > 0)
          parts.push(
            `${result.imported} ${result.imported === 1 ? "trote importado" : "trotes importados"}`,
          );
        if (result.linked > 0)
          parts.push(
            `${result.linked} ${result.linked === 1 ? "vinculado" : "vinculados"} con registros existentes`,
          );
        setSyncMessage(`✅ ${parts.join(" y ")} desde Zepp.`);
      } else if (manual) {
        setSyncMessage("✅ Todo al día: no hay trotes nuevos en Zepp.");
      }
    } catch (err) {
      console.error("Error sincronizando con Zepp:", err);
      if (manual) setSyncMessage("⚠️ Error de red al sincronizar con Zepp.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync from Zepp once the cloud data has loaded
  const onCloudReady = useEffectEvent(() => {
    syncFromZepp(false);
  });
  useEffect(() => {
    if (!user || useLocalMode) return;
    const timer = setTimeout(onCloudReady, 0);
    return () => clearTimeout(timer);
  }, [user, useLocalMode]);

  // Run Mutations: Add/Edit
  const handleRunSubmit = async (runData: {
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
  }) => {
    // Plan 10K desactivado: se conservan los vínculos existentes, pero ya no
    // se detectan automáticamente nuevas sesiones del plan.
    const matchedWeek = runData.plan_week;
    const matchedDay = runData.plan_day;

    /* Plan 10K desactivado: reconocimiento automático de sesiones del plan
    // Auto-detect matching training plan workouts only on creation (new run) and if not already manually linked
    if (!runData.id && !runData.plan_week && !runData.plan_day) {
      // 1st Condition: check if all workouts are already completed
      const isPlanFullyCompleted = () => {
        for (const week of TRAINING_PLAN_10K) {
          for (const workout of week.workouts) {
            const isCompleted = runs.some(
              (r) =>
                r.plan_week === week.weekNum && r.plan_day === workout.dayNum,
            );
            if (!isCompleted) return false;
          }
        }
        return true;
      };

      if (!isPlanFullyCompleted()) {
        // Chronological search (Week 1 Day 1 to Week 8 Day 3)
        for (const week of TRAINING_PLAN_10K) {
          let foundMatch = false;
          for (const workout of week.workouts) {
            // Already completed?
            const isCompleted = runs.some(
              (r) =>
                r.plan_week === week.weekNum && r.plan_day === workout.dayNum,
            );
            if (isCompleted) continue;

            // Type check: rucking matches rucking, run/interval/fondo matches interval/fondo
            const isRuckingWorkout = workout.workoutType === "rucking";
            const isRuckingRun = runData.type === "rucking";
            if (isRuckingWorkout !== isRuckingRun) continue;

            const runDist =
              runData.distance !== null ? Number(runData.distance) : 0;
            const runDur = Number(runData.duration || 0);

            // Meets requirements (~80% target)
            if (workout.duration > 0 && runDur < workout.duration * 0.8)
              continue;
            if (workout.distance > 0 && runDist < workout.distance * 0.8)
              continue;

            matchedWeek = week.weekNum;
            matchedDay = workout.dayNum;
            foundMatch = true;
            break;
          }
          if (foundMatch) break;
        }

        if (matchedWeek && matchedDay) {
          alert(
            `🎯 ¡Reconocimiento Automático! Esta actividad cumple con los requisitos del Plan 10K (Semana ${matchedWeek}, Día ${matchedDay}) y se ha marcado como completada.`,
          );
        }
      }
    }

    */

    const finalRunData = {
      ...runData,
      plan_week: matchedWeek,
      plan_day: matchedDay,
    };

    if (useLocalMode) {
      let updatedRuns;
      if (finalRunData.id) {
        // Edit
        updatedRuns = runs.map((r) =>
          r.id === finalRunData.id ? { ...r, ...finalRunData } : r,
        );
      } else {
        // Add
        const newRun: Run = {
          id: Math.random().toString(36).substring(2, 9),
          ...finalRunData,
        };
        updatedRuns = [newRun, ...runs];
      }
      setRuns(updatedRuns);
      localStorage.setItem("trote_runs", JSON.stringify(updatedRuns));
    } else {
      setIsLoading(true);
      try {
        if (finalRunData.id) {
          const { error } = await supabase
            .from("runs")
            .update({
              date: finalRunData.date,
              distance: finalRunData.distance,
              duration: finalRunData.duration,
              notes: finalRunData.notes,
              type: finalRunData.type,
              plan_week: finalRunData.plan_week,
              plan_day: finalRunData.plan_day,
              avg_bpm: finalRunData.avg_bpm,
              rucking_weight: finalRunData.rucking_weight,
            })
            .eq("id", finalRunData.id);
          if (error) throw error;
        } else {
          // user_id is automatically assigned by auth.uid() DEFAULT in database schema
          const { error } = await supabase.from("runs").insert([
            {
              date: finalRunData.date,
              distance: finalRunData.distance,
              duration: finalRunData.duration,
              notes: finalRunData.notes,
              type: finalRunData.type,
              plan_week: finalRunData.plan_week,
              plan_day: finalRunData.plan_day,
              avg_bpm: finalRunData.avg_bpm,
              rucking_weight: finalRunData.rucking_weight,
            },
          ]);
          if (error) throw error;
        }

        // Reload
        const { data } = await supabase
          .from("runs")
          .select("*")
          .order("date", { ascending: false });
        setRuns(data || []);
      } catch (err) {
        console.error("Error guardando en Supabase:", err);
        alert("Error al guardar en la nube. Los datos no se sincronizaron.");
      }
      setIsLoading(false);
    }
  };

  // Run Mutation: Delete
  const handleRunDelete = async (id: string) => {
    if (useLocalMode) {
      const updatedRuns = runs.filter((r) => r.id !== id);
      setRuns(updatedRuns);
      localStorage.setItem("trote_runs", JSON.stringify(updatedRuns));
    } else {
      setIsLoading(true);
      try {
        const { error } = await supabase.from("runs").delete().eq("id", id);
        if (error) throw error;

        const { data } = await supabase
          .from("runs")
          .select("*")
          .order("date", { ascending: false });
        setRuns(data || []);
      } catch (err) {
        console.error("Error eliminando de Supabase:", err);
        alert("Error al eliminar de la nube.");
      }
      setIsLoading(false);
    }
  };

  // Goal Mutation: Add/Edit
  const handleGoalSubmit = async (goalData: {
    id?: string;
    type: "weekly" | "monthly";
    target_distance: number;
    target_runs: number;
    start_date: string;
    end_date: string;
  }) => {
    if (useLocalMode) {
      const updatedGoal: Goal = {
        id: goalData.id || Math.random().toString(36).substring(2, 9),
        ...goalData,
      };

      if (goalData.type === "weekly") {
        setWeeklyGoal(updatedGoal);
        localStorage.setItem("trote_weekly_goal", JSON.stringify(updatedGoal));
      } else {
        setMonthlyGoal(updatedGoal);
        localStorage.setItem("trote_monthly_goal", JSON.stringify(updatedGoal));
      }
    } else {
      setIsLoading(true);
      try {
        if (goalData.id) {
          const { error } = await supabase
            .from("goals")
            .update({
              target_distance: goalData.target_distance,
              target_runs: goalData.target_runs,
              start_date: goalData.start_date,
              end_date: goalData.end_date,
            })
            .eq("id", goalData.id);
          if (error) throw error;
        } else {
          // user_id is automatically assigned by auth.uid() DEFAULT in database schema
          const { error } = await supabase.from("goals").insert([
            {
              type: goalData.type,
              target_distance: goalData.target_distance,
              target_runs: goalData.target_runs,
              start_date: goalData.start_date,
              end_date: goalData.end_date,
            },
          ]);
          if (error) throw error;
        }

        // Reload goals
        const { data } = await supabase.from("goals").select("*");
        setWeeklyGoal(data?.find((g) => g.type === "weekly") || null);
        setMonthlyGoal(data?.find((g) => g.type === "monthly") || null);
      } catch (err) {
        console.error("Error guardando meta en Supabase:", err);
        alert("Error al guardar la meta en la nube.");
      }
      setIsLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      setIsLoading(true);
      await supabase.auth.signOut();
      setIsLoading(false);
    }
  };

  // Modal Triggers for Calendar / Quick Log
  const handleSelectDate = (dateStr: string, existingRun?: Run) => {
    // Plan 10K desactivado
    // // Reset plan contextual defaults so we don't accidentally link them
    // setPlanDefaultWeek(null);
    // setPlanDefaultDay(null);
    // setPlanDefaultType("run");

    setSelectedDate(dateStr);
    setEditingRun(existingRun || null);
    setIsRunModalOpen(true);
  };

  const handleQuickLog = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    handleSelectDate(todayStr);
  };

/* Plan 10K desactivado
  // Modal Trigger for Plan Workouts
  const handleSelectPlanWorkout = (
    weekNum: number,
    dayNum: number,
    workoutType: string,
    existingRun?: Run,
  ) => {
    setPlanDefaultWeek(weekNum);
    setPlanDefaultDay(dayNum);
    setPlanDefaultType(workoutType);

    setSelectedDate(
      existingRun ? existingRun.date : new Date().toISOString().split("T")[0],
    );
    setEditingRun(existingRun || null);
    setIsRunModalOpen(true);
  };
*/

  const handleEditGoals = (type: "weekly" | "monthly") => {
    setSelectedGoalType(type);
    setIsGoalsModalOpen(true);
  };

  const activeGoalForModal =
    selectedGoalType === "weekly" ? weeklyGoal : monthlyGoal;

  // ROUTE PROTECTION: Show login page if Supabase is active, but we are not logged in and not in local mode
  if (isSupabaseConfigured && !useLocalMode && !user && !isLoading) {
    return (
      <main className={styles.mainContainer}>
        <Navbar isCloudSynced={false} />

        <AuthForm
          onAuthSuccess={() => console.log("Autenticación exitosa")}
          onGuestAccess={() => setUseLocalMode(true)}
        />
      </main>
    );
  }

  return (
    <main className={styles.mainContainer}>
      <Navbar
        isCloudSynced={!useLocalMode}
        userEmail={useLocalMode ? null : user?.email}
        onLogout={handleLogout}
        onPreferencesClick={() => setIsPreferencesOpen(true)}
        onSyncClick={
          isSupabaseConfigured && !useLocalMode && user
            ? () => syncFromZepp(true)
            : undefined
        }
        isSyncing={isSyncing}
        onLoginClick={
          isSupabaseConfigured ? () => setUseLocalMode(false) : undefined
        }
      />

      {/* ALERTAS Y MENSAJES DE ESTADO */}
      <div className={styles.infoArea}>
        {!isSupabaseConfigured && (
          <div className={`${styles.alertBanner} glass-panel fade-in`}>
            <div className={styles.alertIcon}>💡</div>
            <div className={styles.alertContent}>
              <p className={styles.alertTitle}>
                Aplicación Ejecutándose en Modo Local
              </p>
              <p className={styles.alertText}>
                Tus datos están guardados localmente en este dispositivo. Para
                sincronizarlos entre tu celular y computador en la nube,
                configura tus credenciales de Supabase en un archivo{" "}
                <code>.env.local</code>.
              </p>
            </div>
          </div>
        )}

        {syncMessage && (
          <div className={`${styles.alertBanner} glass-panel fade-in`}>
            <div className={styles.alertContent}>
              <p className={styles.alertText}>{syncMessage}</p>
            </div>
            <button
              className={styles.bannerCloseBtn}
              onClick={() => setSyncMessage(null)}
            >
              Cerrar
            </button>
          </div>
        )}

        {isSupabaseConfigured && dbError && (
          <div
            className={`${styles.alertBanner} ${styles.alertWarning} glass-panel fade-in`}
          >
            <div className={styles.alertIcon}>⚠️</div>
            <div className={styles.alertContent}>
              <p className={styles.alertTitle}>Base de Datos No Configurada</p>
              <p className={styles.alertText}>
                No pudimos acceder a las tablas de Supabase. Recuerda copiar y
                ejecutar el script SQL en el panel de control de Supabase.
              </p>
            </div>
            <button
              className={styles.bannerCloseBtn}
              onClick={() => setUseLocalMode(true)}
            >
              Usar Modo Local
            </button>
          </div>
        )}
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN PRINCIPAL */}
      <div className={styles.tabsContainer}>
        <div className={`${styles.tabsWrapper} glass-panel fade-in`}>
          <button
            className={`${styles.tabBtn} ${activeTab === "progress" ? styles.activeTabBtn : ""}`}
            onClick={() => setActiveTab("progress")}
          >
            <svg
              className={styles.tabIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
            <span>Mi Progreso y Calendario</span>
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === "evolution" ? styles.activeTabBtn : ""}`}
            onClick={() => setActiveTab("evolution")}
          >
            <svg
              className={styles.tabIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <span>Mi Evolución</span>
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === "week" ? styles.activeTabBtn : ""}`}
            onClick={() => setActiveTab("week")}
          >
            <svg
              className={styles.tabIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2l2.4 6.9H22l-6 4.6 2.3 7L12 16.3 5.7 20.5 8 13.5 2 8.9h7.6z" />
            </svg>
            <span>Mi Semana</span>
          </button>

          {/* Plan 10K desactivado
          <button
            className={`${styles.tabBtn} ${activeTab === "plan" ? styles.activeTabBtn : ""}`}
            onClick={() => setActiveTab("plan")}
          >
            <svg
              className={styles.tabIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Plan de Entrenamiento 10K</span>
          </button>
          */}
        </div>
      </div>

      {/* VISTA 1: PROGRESO Y CALENDARIO */}
      {activeTab === "progress" && (
        <>
          <div className={styles.calendarSection}>
            <RunCalendar
              runs={visibleRuns}
              onSelectDate={handleSelectDate}
              onQuickLog={handleQuickLog}
            />
          </div>

          <div className={styles.dashboardSection}>
            <MetricsDashboard
              runs={visibleRuns}
              weeklyGoal={weeklyGoal}
              monthlyGoal={monthlyGoal}
              onEditGoals={handleEditGoals}
              showOnly="stats"
              showRucking={preferences.showRucking}
            />
          </div>

          <div className={styles.dashboardSection}>
            <MetricsDashboard
              runs={visibleRuns}
              weeklyGoal={weeklyGoal}
              monthlyGoal={monthlyGoal}
              onEditGoals={handleEditGoals}
              showOnly="goals"
            />
          </div>
        </>
      )}

      {/* VISTA 2: EVOLUCIÓN */}
      {activeTab === "evolution" && (
        <div className={styles.planSection}>
          <TrainingEvolution
            runs={visibleRuns}
            showRucking={preferences.showRucking}
          />
        </div>
      )}

      {/* VISTA 3: RECOMENDACIONES DE LA SEMANA */}
      {activeTab === "week" && (
        <div className={styles.planSection}>
          <WeeklyRecommendation
            runs={runs}
            weeklyGoal={weeklyGoal}
            canUseIntervals={Boolean(user) && !useLocalMode}
          />
        </div>
      )}

      {/* Plan 10K desactivado
      {activeTab === "plan" && (
        <div className={styles.planSection}>
          <TrainingPlan
            runs={runs}
            onSelectPlanWorkout={handleSelectPlanWorkout}
          />
        </div>
      )}
      */}

      {/* CARGANDO OVERLAY */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}

      {/* MODALES */}
      <RunModal
        key={
          isRunModalOpen
            ? `run-modal-${selectedDate}-${editingRun?.id || "new"}`
            : "run-modal-closed"
        }
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        selectedDate={selectedDate}
        existingRun={editingRun}
        showRucking={preferences.showRucking}
        // Plan 10K desactivado
        // defaultType={planDefaultType}
        // defaultPlanWeek={planDefaultWeek}
        // defaultPlanDay={planDefaultDay}
        onSubmit={handleRunSubmit}
        onDelete={handleRunDelete}
      />

      <GoalsModal
        key={
          isGoalsModalOpen
            ? `goals-modal-${selectedGoalType}-${activeGoalForModal?.id || "new"}`
            : "goals-modal-closed"
        }
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        type={selectedGoalType}
        existingGoal={activeGoalForModal}
        onSubmit={handleGoalSubmit}
      />

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        preferences={preferences}
        onChange={updatePreferences}
      />
    </main>
  );
}
