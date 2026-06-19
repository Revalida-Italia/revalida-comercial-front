import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CostCategory } from "@/features/costs-calendar/types";
import { ChevronLeft, ChevronRight, FolderCog, Plus } from "lucide-react";

type CostsCalendarHeaderProps = {
  monthLabel: string;
  categories: CostCategory[];
  selectedCategoryId: string;
  isMonthlyLoading: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCategoryChange: (value: string) => void;
  onOpenCreateEvent: () => void;
  onOpenCategories: () => void;
};

const CostsCalendarHeader = ({
  monthLabel,
  categories,
  selectedCategoryId,
  isMonthlyLoading,
  onPreviousMonth,
  onNextMonth,
  onCategoryChange,
  onOpenCreateEvent,
  onOpenCategories,
}: CostsCalendarHeaderProps) => {
  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPreviousMonth} disabled={isMonthlyLoading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-44 text-center text-base font-semibold">{monthLabel}</p>
          <Button variant="outline" size="icon" onClick={onNextMonth} disabled={isMonthlyLoading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={onOpenCategories}>
            <FolderCog className="h-4 w-4" />
            Categorias
          </Button>
          <Button className="gap-2" onClick={onOpenCreateEvent}>
            <Plus className="h-4 w-4" />
            Criar custo
          </Button>
        </div>
      </div>

      <div className="max-w-xs">
        <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CostsCalendarHeader;
