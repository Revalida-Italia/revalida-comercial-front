import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatAccessDate, maskAccessDate, parseAccessDate } from "./dates";

type Props = {
  id: string;
  label: string;
  value: string;
  /** "type" while the person is still typing; "commit" when a calendar day is chosen. */
  onChange: (iso: string, source: "type" | "commit") => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  /** Hides the visible label from the tablet table, where the column heading names the field. */
  compact?: boolean;
};

export function AccessDateField({ id, label, value, onChange, onBlur, invalid, describedBy, placeholder, compact }: Props) {
  const hint = placeholder ?? t("sale.access.placeholder");
  const [text, setText] = useState(value ? formatAccessDate(value) : "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const parsed = parseAccessDate(text);
    if ((parsed ?? "") !== value) setText(value ? formatAccessDate(value) : "");
    // The typed text stays while the value is still incomplete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <div>
      <label htmlFor={id} className={cn("mb-1.5 block text-[12.5px] font-semibold text-[#24384F]", compact && "md:sr-only")}>
        {label}
      </label>
      <div className={cn(
        "flex h-10 items-center rounded-md bg-white shadow-[inset_0_0_0_1px_rgba(36,56,79,0.16)]",
        invalid && "shadow-[inset_0_0_0_1px_#9A3F3F]",
      )}>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={hint}
          value={text}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums text-[#24384F] outline-none placeholder:text-[#7C8A9A]",
            !text && "text-[#7C8A9A]",
          )}
          onChange={(event) => {
            const masked = maskAccessDate(event.target.value);
            setText(masked);
            onChange(parseAccessDate(masked) ?? "", "type");
          }}
          onBlur={onBlur}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mr-1 h-8 w-8 shrink-0 text-[#5D6F83] hover:bg-transparent"
              aria-label={t("sale.access.openCalendar")}
            >
              <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (!date) return;
                const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                setText(formatAccessDate(iso));
                onChange(iso, "commit");
                setOpen(false);
              }}
              captionLayout="dropdown"
              fromYear={new Date().getFullYear() - 1}
              toYear={new Date().getFullYear() + 15}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
