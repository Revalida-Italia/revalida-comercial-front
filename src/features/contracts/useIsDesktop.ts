import { useEffect, useState } from "react";

function useMediaQuery(query: string): boolean {
  const read = () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(read);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

const DESKTOP_QUERY = "(min-width: 1024px)";

/** Sale column sits beside the form from this width. Below it, the sale folds above the form. */
export const CONTRACT_RAIL_QUERY = "(min-width: 1400px)";

/** True from the width where the Resumo sits beside the form. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}

export function useContractRail(): boolean {
  return useMediaQuery(CONTRACT_RAIL_QUERY);
}
