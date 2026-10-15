import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { displayToIso, isoToDisplay, maskDateInput } from "@/features/contracts/contractDates";

type Props = {
  id: string;
  /** ISO "YYYY-MM-DD"; empty string while the date is missing or incomplete. */
  value: string;
  onChange: (iso: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  placeholder?: string;
};

/** Typed dd/mm/aaaa with an optional calendar. The value that leaves is always ISO or empty. */
export function DateField({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  disabled,
  fromYear = new Date().getFullYear() - 1,
  toYear = new Date().getFullYear() + 10,
  placeholder = "dd/mm/aaaa",
}: Props) {
  const [text, setText] = useState(isoToDisplay(value));

  useEffect(() => {
    if (value !== (displayToIso(text) ?? "")) setText(isoToDisplay(value));
    // Only react to the outside value; the text is the source while the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <div className="flex gap-1.5">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn("h-10", invalid && "border-destructive focus-visible:ring-destructive")}
        onChange={(event) => {
          const masked = maskDateInput(event.target.value);
          setText(masked);
          onChange(displayToIso(masked) ?? "");
        }}
        onBlur={onBlur}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={disabled}
            aria-label="Abrir calendário"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (!date) return;
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, "0");
              const d = String(date.getDate()).padStart(2, "0");
              const iso = `${y}-${m}-${d}`;
              setText(isoToDisplay(iso));
              onChange(iso);
            }}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
