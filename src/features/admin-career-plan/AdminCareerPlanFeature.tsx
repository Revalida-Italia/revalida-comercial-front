import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { updateUserCareerPlanById } from "@/services/careerPlansApi";
import { searchUsers, type UserSearchResult } from "@/services/usersApi";
import UserSearchCard from "./organisms/UserSearchCard";
import CareerAssignmentCard from "./organisms/CareerAssignmentCard";
import { useLocation } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  dateInputValueToIso,
  formatCareerPlanStartDateLabel,
  formatDateInputLabel,
  getCareerPlanUpdateErrorMessage,
  getTodayDateInputValue,
  isoToDateInputValue,
} from "./careerPlanStartDate";

interface CareerLocationState {
  prefilledUser?: UserSearchResult;
}

function applyUserToForm(
  user: UserSearchResult,
  setters: {
    setSelectedUser: (user: UserSearchResult) => void;
    setCareerPlanId: (value: string) => void;
    setPercentage: (value: string) => void;
    setCareerPlanStartDate: (value: string) => void;
  },
) {
  setters.setSelectedUser(user);

  if (user.careerPlan) {
    setters.setCareerPlanId(user.careerPlan.id);
    setters.setPercentage(user.careerPlan.individualCommissionRate?.toString() || "");
    setters.setCareerPlanStartDate(
      user.inTheCareerPlanSince
        ? isoToDateInputValue(user.inTheCareerPlanSince)
        : getTodayDateInputValue(),
    );
    return;
  }

  setters.setCareerPlanId("");
  setters.setPercentage("");
  setters.setCareerPlanStartDate(getTodayDateInputValue());
}

const AdminCareerPlanFeature = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [careerPlanId, setCareerPlanId] = useState("");
  const [percentage, setPercentage] = useState("");
  const [careerPlanStartDate, setCareerPlanStartDate] = useState(getTodayDateInputValue());
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["searchUsers", debouncedSearchTerm],
    queryFn: () => searchUsers(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length > 0,
  });

  const updateCareerMutation = useMutation({
    mutationFn: async (data: {
      externalId: string;
      careerPlanId: string;
      percentage: string;
      careerPlanStartDate: string;
    }) => {
      const inTheCareerPlanSince = data.careerPlanStartDate
        ? dateInputValueToIso(data.careerPlanStartDate)
        : undefined;

      return updateUserCareerPlanById(data.externalId, {
        careerPlanId: data.careerPlanId,
        percentage: Number(data.percentage),
        inTheCareerPlanSince,
      });
    },
    onSuccess: (updatedUser) => {
      setConfirmUpdateOpen(false);

      applyUserToForm(updatedUser, {
        setSelectedUser,
        setCareerPlanId,
        setPercentage,
        setCareerPlanStartDate,
      });

      toast.success("Carreira atualizada com sucesso");
      void queryClient.invalidateQueries({ queryKey: ["searchUsers"] });
      void queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: unknown) => {
      toast.error(getCareerPlanUpdateErrorMessage(error));
    },
  });

  const resetForm = () => {
    setSelectedUser(null);
    setSearchTerm("");
    setCareerPlanId("");
    setPercentage("");
    setCareerPlanStartDate(getTodayDateInputValue());
  };

  const applySelectedUser = (user: UserSearchResult, showToast = true) => {
    setSearchTerm(user.email ?? "");
    applyUserToForm(user, {
      setSelectedUser,
      setCareerPlanId,
      setPercentage,
      setCareerPlanStartDate,
    });

    if (showToast) {
      toast.success(`Usuário ${user.email} selecionado`);
    }
  };

  const handleSelectUser = (user: UserSearchResult) => {
    applySelectedUser(user, true);
  };

  const handleCareerPlanIdChange = (value: string) => {
    setCareerPlanId(value);

    if (selectedUser?.careerPlan?.id !== value) {
      setCareerPlanStartDate(getTodayDateInputValue());
    }
  };

  useEffect(() => {
    const state = (location.state as CareerLocationState | null) ?? null;
    const prefilledUser = state?.prefilledUser;

    if (!prefilledUser) {
      return;
    }

    if (selectedUser?.id === prefilledUser.id) {
      return;
    }

    applySelectedUser(prefilledUser, false);
  }, [location.state, selectedUser?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !careerPlanId || !percentage) {
      toast.error("Selecione um usuário, nível de carreira e percentual");
      return;
    }

    if (!careerPlanStartDate) {
      toast.error("Selecione a data de início no plano de carreira");
      return;
    }

    setConfirmUpdateOpen(true);
  };

  const handleConfirmUpdate = () => {
    if (!selectedUser || !careerPlanId || !percentage || !careerPlanStartDate) {
      return;
    }

    updateCareerMutation.mutate({
      externalId: selectedUser.externalId,
      careerPlanId,
      percentage,
      careerPlanStartDate,
    });
  };

  return (
    <>
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
        careerPlanStartDate={careerPlanStartDate}
        onCareerPlanIdChange={handleCareerPlanIdChange}
        onPercentageChange={setPercentage}
        onCareerPlanStartDateChange={setCareerPlanStartDate}
        onSubmit={handleSubmit}
        onReset={resetForm}
        isSubmitting={updateCareerMutation.isPending}
      />
    </div>

    <AlertDialog
      open={confirmUpdateOpen}
      onOpenChange={(open) => {
        if (!updateCareerMutation.isPending) {
          setConfirmUpdateOpen(open);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atualizar plano de carreira?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Ao confirmar, o backend pode <strong className="text-foreground">recalcular o progresso de carreira</strong>{" "}
                do vendedor com base na data de início informada (
                <strong className="text-foreground">{formatDateInputLabel(careerPlanStartDate)}</strong>
                ).
              </p>
              <p>
                Isso pode alterar estrelas, metas mensais e, se os critérios forem atingidos,
                promover automaticamente para o próximo nível. A data salva atualmente é{" "}
                <strong className="text-foreground">
                  {formatCareerPlanStartDateLabel(selectedUser?.inTheCareerPlanSince)}
                </strong>
                .
              </p>
              <p>Deseja continuar com a atualização?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateCareerMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmUpdate}
            disabled={updateCareerMutation.isPending}
          >
            {updateCareerMutation.isPending ? "Atualizando..." : "Sim, atualizar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default AdminCareerPlanFeature;
