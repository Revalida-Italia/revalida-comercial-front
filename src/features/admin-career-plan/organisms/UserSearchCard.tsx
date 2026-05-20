import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, UserCircle } from "lucide-react";
import type { UserSearchCardProps } from "../types";

const UserSearchCard = ({
  searchTerm,
  onSearchTermChange,
  searchResults,
  isSearching,
  selectedUser,
  onSelectUser,
  disabled = false,
}: UserSearchCardProps) => {
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
        {searchTerm && (
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
                    <button
                      key={user.id}
                      onClick={() => onSelectUser(user)}
                      className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3 ${
                        selectedUser?.id === user.id ? "bg-accent" : ""
                      }`}
                    >
                      <UserCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{user.email}</div>
                        {user.name && (
                          <div className="text-xs text-muted-foreground truncate">{user.name}</div>
                        )}
                        {user.careerPlan && (
                          <div className="text-xs text-muted-foreground truncate">
                            Carreira: {user.careerPlan.name}
                          </div>
                        )}
                      </div>
                    </button>
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
