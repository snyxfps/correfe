import { useCallback, useEffect, useState } from "react";
export function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const go = useCallback((next: string) => {
    if (!next.startsWith("/") || next.startsWith("//")) next = "/";
    window.history.pushState(null, "", next);
    setPath(next.split("?")[0]);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return { path, go };
}
