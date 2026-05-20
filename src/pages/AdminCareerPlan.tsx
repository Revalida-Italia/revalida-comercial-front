import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, Loader2, UserCircle } from "lucide-react";
import { listCareerPlans, updateUserCareerPlanById, type CareerPlanOption } from "@/services/careerPlansApi";
import { searchUsers, type UserSearchResult } from "@/services/usersApi";

const AdminCareerPlan = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [careerPlanId, setCareerPlanId] = useState("");
  const [percentage, setPercentage] = useState("");

  // Fetch career plans
  const { data: careerPlans = [] } = useQuery({
    queryKey: ["careerPlans"],
    queryFn: listCareerPlans,
  });

  // Search users with debounce
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["searchUsers", debouncedSearchTerm],
    queryFn: () => searchUsers(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length > 0,
  });

  // Mutation para atualizar career plan
  const updateCareerMutation = useMutation({
    mutationFn: async (data: { externalId: string; careerPlanId: string; percentage: string }) => {
      await updateUserCareerPlanById(data.externalId, data.careerPlanId, Number(data.percentage));
    },
    onSuccess: () => {
      toast.success("Carreira atualizada com sucesso");
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao atualizar carreira";
      toast.error(message);
    },
  });

  const resetForm = () => {
    setSelectedUser(null);
    setSearchTerm("");
    setCareerPlanId("");
    setPercentage("");
  };

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user);
    
    // Preencher com dados existentes se o usuário já tiver carreira
    if (user.careerPlan) {
      setCareerPlanId(user.careerPlan.id);
      setPercentage(user.careerPlan.individualCommissionRate?.toString() || "");
    } else {
      setCareerPlanId("");
      setPercentage("");
    }
    
    toast.success(`Usuário ${user.email} selecionado`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !careerPlanId || !percentage) {
      toast.error("Selecione um usuário, nível de carreira e percentual");
      return;
    }
    updateCareerMutation.mutate({
      externalId: selectedUser.externalId,
      careerPlanId,
      percentage,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Carreira</h1>
        <p className="text-muted-foreground mt-2">Associe usuários a níveis de carreira e defina percentuais de comissão</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda: Busca + Lista de Usuários */}
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={updateCareerMutation.isPending}
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
                          onClick={() => handleSelectUser(user)}
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

        {/* Coluna Direita: Formulário de Atribuição */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atualizar Carreira</CardTitle>
            <CardDescription>
              {selectedUser ? (
                <>
                  Usuário: <span className="font-semibold text-foreground">{selectedUser.email}</span>
                </>
              ) : (
                "Selecione um usuário à esquerda para atribuir carreira"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email do usuário</Label>
                <Input
                  id="email"
                  value={selectedUser?.email || ""}
                  placeholder="Selecione um usuário..."
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="careerPlan">Nível de carreira</Label>
                  <Select
                    value={careerPlanId}
                    onValueChange={setCareerPlanId}
                    disabled={updateCareerMutation.isPending || !selectedUser}
                  >
                    <SelectTrigger id="careerPlan">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {careerPlans.map((plan: CareerPlanOption) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="percentage">Percentual de comissão (%)</Label>
                  <Input
                    id="percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="5"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    disabled={updateCareerMutation.isPending || !selectedUser}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateCareerMutation.isPending || !selectedUser}
                >
                  {updateCareerMutation.isPending ? "Atualizando..." : "Atualizar carreira"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={updateCareerMutation.isPending || !selectedUser}
                >
                  Limpar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCareerPlan;
