import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { IntervalsData } from "@/lib/weeklyRecommendation";

// Estado físico desde Intervals.icu (vía /api/recommendations/intervals),
// compartido por las pestañas que arman el plan de la semana.
export type IntervalsState =
  | { status: "loading" }
  | { status: "ready"; data: IntervalsData }
  | { status: "unavailable"; message: string | null };

export function useIntervalsData(enabled: boolean): IntervalsState {
  const [state, setState] = useState<IntervalsState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Sin sesión");
        const res = await fetch("/api/recommendations/intervals", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
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
        setState({ status: "ready", data: body as IntervalsData });
      } catch {
        if (!cancelled) setState({ status: "unavailable", message: "No se pudo conectar con Intervals.icu." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? state : { status: "unavailable", message: null };
}
