import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { IntervalsData } from "@/lib/weeklyRecommendation";

// Estado físico desde Intervals.icu (vía /api/recommendations/intervals),
// compartido por las pestañas que arman el plan de la semana.
export type IntervalsState =
  | { status: "loading" }
  | { status: "ready"; data: IntervalsData }
  | { status: "unavailable"; message: string | null };

// Al volver a la app (PWA en segundo plano), se recargan los datos si pasó
// este tiempo o si cambió el día, para no mostrar el estado de la mañana.
const REFRESH_MS = 10 * 60 * 1000;

const localISO = (d = new Date()) => {
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export function useIntervalsData(enabled: boolean): IntervalsState {
  const [state, setState] = useState<IntervalsState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let loadedAt = 0;
    let loadedDay = "";
    let inFlight = false;

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      const today = localISO();
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Sin sesión");
        const res = await fetch("/api/recommendations/intervals", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ today }),
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "unavailable",
            message: res.status === 501 || res.status === 403 ? null : body.error || null,
          });
          return;
        }
        loadedAt = Date.now();
        loadedDay = today;
        setState({ status: "ready", data: body as IntervalsData });
      } catch {
        if (!cancelled) setState({ status: "unavailable", message: "No se pudo conectar con Intervals.icu." });
      } finally {
        inFlight = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - loadedAt > REFRESH_MS || localISO() !== loadedDay) load();
    };

    load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return enabled ? state : { status: "unavailable", message: null };
}
