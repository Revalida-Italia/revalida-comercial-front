import type { ReactNode } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FormIssue } from "@/features/contracts/contractFormModel";

/** What the sections need from the page to show errors and move focus. */
export interface FormControl {
  /** Text to show under a field, or null. */
  error: (fieldId: string) => string | null;
  touch: (fieldId: string) => void;
  disabled: boolean;
}

export function errorId(fieldId: string): string {
  return `${fieldId}-error`;
}

export function FieldError({ fieldId, message }: { fieldId: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={errorId(fieldId)} className="mt-1.5 text-[13px] leading-snug text-destructive">
      {message}
    </p>
  );
}

export function Field({
  id,
  label,
  error,
  className,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
  hint?: string | null;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </Label>
      {children}
      {error ? <FieldError fieldId={id} message={error} /> : hint ? <p className="mt-1.5 text-[13px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SectionHeading({ number, title, id }: { number: number; title: string; id?: string }) {
  return (
    <h2 id={id} className="mb-4 flex items-baseline gap-3 text-lg font-semibold text-foreground">
      <span className="text-sm font-medium text-muted-foreground tabular-nums">{number}</span>
      {title}
    </h2>
  );
}

/** Shows a short entrance when it mounts (150 ms, off with reduced motion). */
export function Expand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "animate-in fade-in-0 slide-in-from-top-1 duration-150 motion-reduce:animate-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

/** Two or three mutually exclusive options drawn side by side; a radio group underneath. */
export function SegmentedChoice<T extends string>({
  value,
  onChange,
  options,
  label,
  id,
  disabled,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<ChoiceOption<T>>;
  label: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      id={id}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      aria-label={label}
      disabled={disabled}
      orientation="horizontal"
      className={cn("inline-flex rounded-md bg-muted p-0.5", className)}
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "h-9 rounded-[6px] px-4 text-sm font-medium text-muted-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

/** Moves the screen and the cursor to a field. Used by the pendências and by a blocked submit. */
export function focusField(fieldId: string): void {
  const element = document.getElementById(fieldId);
  if (!element) return;
  const reduce =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView?.({ block: "center", behavior: reduce ? "auto" : "smooth" });
  element.focus({ preventScroll: true });
}

export function firstIssue(issues: FormIssue[]): FormIssue | undefined {
  return issues[0];
}
