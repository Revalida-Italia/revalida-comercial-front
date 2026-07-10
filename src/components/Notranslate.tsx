import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NotranslateProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps API-driven labels (career plans, roles, etc.) so browser
 * auto-translation does not mutate values used by the application.
 */
export function Notranslate({ children, className }: NotranslateProps) {
  return (
    <span translate="no" className={cn("notranslate", className)}>
      {children}
    </span>
  );
}
