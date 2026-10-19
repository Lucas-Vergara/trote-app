import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PACE_GOAL, PaceGoal } from "@/lib/weeklyRecommendation";

// Preferencias de visualización, guardadas en este dispositivo (localStorage)
export interface Preferences {
  showRucking: boolean;
  paceGoal: PaceGoal;
}

export const DEFAULT_PREFERENCES: Preferences = {
  showRucking: false,
  paceGoal: DEFAULT_PACE_GOAL,
};

const STORAGE_KEY = "trote_preferences";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Preferences } | null = null;

function readPreferences(): Preferences {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage bloqueado (modo privado, etc.): usamos lo último conocido
    if (cache) return cache.value;
  }
  if (cache && cache.raw === raw) return cache.value;

  let value = DEFAULT_PREFERENCES;
  try {
    if (raw) {
      const parsed = JSON.parse(raw);
      value = {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        paceGoal: { ...DEFAULT_PACE_GOAL, ...parsed.paceGoal },
      };
    }
  } catch {
    value = DEFAULT_PREFERENCES;
  }
  cache = { raw, value };
  return value;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function usePreferences() {
  const preferences = useSyncExternalStore(
    subscribe,
    readPreferences,
    () => DEFAULT_PREFERENCES,
  );

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    const next = { ...readPreferences(), ...patch };
    const raw = JSON.stringify(next);
    try {
      localStorage.setItem(STORAGE_KEY, raw);
    } catch (e) {
      console.error("No se pudieron guardar las preferencias:", e);
    }
    cache = { raw, value: next };
    listeners.forEach((listener) => listener());
  }, []);

  return [preferences, updatePreferences] as const;
}
