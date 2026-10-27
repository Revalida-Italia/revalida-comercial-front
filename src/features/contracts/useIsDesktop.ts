import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)";

/** True from the width where the Resumo sits beside the form. */
export function useIsDesktop(): boolean {
  const read = () => (typeof window.matchMedia === "function" ? window.matchMedia(QUERY).matches : false);
  const [matches, setMatches] = useState(read);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(QUERY);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return matches;
}
