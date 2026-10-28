import { useCallback, useSyncExternalStore } from "react";

// Pestaña activa guardada en la URL (?tab=...), para que el botón "atrás"
// del celular vuelva a la pestaña anterior y solo salga de la app si no hay.
const TAB_CHANGE_EVENT = "trote:tabchange";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(TAB_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(TAB_CHANGE_EVENT, onChange);
  };
}

export function useTabHistory<T extends string>(
  tabs: readonly T[],
  defaultTab: T,
): [T, (tab: T) => void] {
  const getSnapshot = () => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tabs.includes(tab as T) ? (tab as T) : defaultTab;
  };

  const activeTab = useSyncExternalStore(subscribe, getSnapshot, () => defaultTab);

  const goToTab = useCallback(
    (tab: T) => {
      if (tab === activeTab) return;
      const params = new URLSearchParams(window.location.search);
      if (tab === defaultTab) params.delete("tab");
      else params.set("tab", tab);
      const query = params.toString();
      window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
      window.dispatchEvent(new Event(TAB_CHANGE_EVENT));
    },
    [activeTab, defaultTab],
  );

  return [activeTab, goToTab];
}
