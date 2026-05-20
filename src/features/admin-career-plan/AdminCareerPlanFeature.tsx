import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { updateUserCareerPlanById } from "@/services/careerPlansApi";
import { searchUsers, type UserSearchResult } from "@/services/usersApi";
import UserSearchCard from "./organisms/UserSearchCard";
import CareerAssignmentCard from "./organisms/CareerAssignmentCard";

const AdminCareerPlanFeature = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [careerPlanId, setCareerPlanId] = useState("");
  const [percentage, setPercentage] = useState("");

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UserSearchCard
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        searchResults={searchResults}
        isSearching={isSearching}
        selectedUser={selectedUser}
        onSelectUser={handleSelectUser}
        disabled={updateCareerMutation.isPending}
      />

      <CareerAssignmentCard
        selectedUser={selectedUser}
        careerPlanId={careerPlanId}
        percentage={percentage}
        onCareerPlanIdChange={setCareerPlanId}
        onPercentageChange={setPercentage}
        onSubmit={handleSubmit}
        onReset={resetForm}
        isSubmitting={updateCareerMutation.isPending}
      />
    </div>
  );
};

export default AdminCareerPlanFeature;
