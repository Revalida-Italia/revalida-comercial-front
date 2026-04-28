import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockSellerProfiles, careerConfig, careerLevelOrder, CareerLevel } from "@/lib/mockData";
import { isBelowMinimum } from "@/lib/careerUtils";
import CareerProgressCard from "./CareerProgressCard";

const AdminCareerOverview = () => {
  const [filterLevel, setFilterLevel] = useState<CareerLevel | "ALL">("ALL");

  const profiles =
    filterLevel === "ALL"
      ? mockSellerProfiles
      : mockSellerProfiles.filter((p) => p.currentLevel === filterLevel);

  const belowMinCount = mockSellerProfiles.filter(isBelowMinimum).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {mockSellerProfiles.length} vendedor(es)
          </p>
          {belowMinCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {belowMinCount} abaixo do mínimo
            </Badge>
          )}
        </div>
        <Select
          value={filterLevel}
          onValueChange={(v) => setFilterLevel(v as CareerLevel | "ALL")}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filtrar por nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os níveis</SelectItem>
            {careerLevelOrder.map((level) => (
              <SelectItem key={level} value={level}>
                {careerConfig[level].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {profiles.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum vendedor neste nível.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <CareerProgressCard key={profile.sellerId} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCareerOverview;
