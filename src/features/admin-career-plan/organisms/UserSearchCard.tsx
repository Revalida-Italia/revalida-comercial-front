import { Input } from "@/components/ui/input";
import { Notranslate } from "@/components/Notranslate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, UserCircle } from "lucide-react";
import type { UserSearchCardProps } from "../types";
import { formatCareerPlanStartDateLabel } from "../careerPlanStartDate";

const UserSearchCard = ({
  searchTerm,
  onSearchTermChange,
  searchResults,
  isSearching,
  selectedUser,
  onSelectUser,
  disabled = false,
  hideResultsWhenSelected = false,
  selectedItemClassName,
}: UserSearchCardProps) => {
  const shouldHideResults = hideResultsWhenSelected && Boolean(selectedUser);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Buscar Usuário</CardTitle>
        <CardDescription>Digite o email ou nome do usuário para buscar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou nome..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Lista de Resultados */}
        {searchTerm && !shouldHideResults && (
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[320px] overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Buscando usuários...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              ) : (
                <div className="divide-y">
                  {searchResults.map((user) => (
                    (() => {
                      const isSelected = selectedUser?.id === user.id;
                      return (
                    <button
                      key={user.id}
                      onClick={() => onSelectUser(user)}
                      className={`w-full text-left px-4 py-3 hover:bg-[#e9f2f9] hover:text-[#0c3559] transition-colors flex items-start gap-3 ${
                        isSelected
                          ? selectedItemClassName ?? "bg-accent"
                          : ""
                      }`}
                    >
                      <UserCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{user.email}</div>
                        {user.name && (
                          <div className={`text-xs truncate ${isSelected ? "text-white/85" : "text-muted-foreground"}`}>{user.name}</div>
                        )}
                        {user.careerPlan && (
                          <div className={`text-xs truncate ${isSelected ? "text-white/85" : "text-muted-foreground"}`}>
                            Carreira: <Notranslate>{user.careerPlan.name}</Notranslate>
                            {" · Início: "}
                            {formatCareerPlanStartDateLabel(user.inTheCareerPlanSince)}
                          </div>
                        )}
                      </div>
                    </button>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSearchCard;
