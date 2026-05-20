import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listGatewayFees, updateGatewayFees, type GatewayFees, type GatewayPaymentOption } from "@/services/commercialApi";
import GatewayFeesCard from "./organisms/GatewayFeesCard";
import type { EditingGateway } from "./types";

const AdminPaymentGatewaysFeature = () => {
  const [editingGateway, setEditingGateway] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingGateway>({});
  const [openGateways, setOpenGateways] = useState<Record<string, boolean>>({});

  const { data: gateways = [], isLoading, refetch } = useQuery({
    queryKey: ["gatewayFees", "includeInactive"],
    queryFn: () => listGatewayFees({ includeInactive: true }),
  });

  const updateFeesMutation = useMutation({
    mutationFn: async (data: GatewayFees[]) => {
      await updateGatewayFees(data);
    },
    onSuccess: () => {
      toast.success("Taxas atualizadas com sucesso");
      setEditingGateway(null);
      setEditingData({});
      refetch();
    },
    onError: () => {
      toast.error("Erro ao atualizar taxas");
    },
  });

  const handleEditGateway = (gateway: GatewayFees) => {
    setEditingGateway(gateway.gateway);
    setOpenGateways((prev) => ({ ...prev, [gateway.gateway]: true }));
    setEditingData({
      [gateway.gateway]: gateway.paymentOptions.reduce((acc, option, idx) => {
        acc[idx] = { ...option };
        return acc;
      }, {} as Record<number, GatewayPaymentOption>),
    });
  };

  const handleCancelEdit = () => {
    setEditingGateway(null);
    setEditingData({});
  };

  const handleToggleGateway = (gatewayName: string) => {
    setOpenGateways((prev) => ({ ...prev, [gatewayName]: !prev[gatewayName] }));
  };

  const handleFeeRateChange = (gatewayName: string, optionIndex: number, value: string) => {
    setEditingData((prev) => ({
      ...prev,
      [gatewayName]: {
        ...prev[gatewayName],
        [optionIndex]: {
          ...prev[gatewayName]?.[optionIndex],
          feeRate: value,
        },
      },
    }));
  };

  const handleIsActiveChange = (gatewayName: string, optionIndex: number, checked: boolean) => {
    setEditingData((prev) => ({
      ...prev,
      [gatewayName]: {
        ...prev[gatewayName],
        [optionIndex]: {
          ...prev[gatewayName]?.[optionIndex],
          isActive: checked,
        },
      },
    }));
  };

  const handleSave = () => {
    if (!editingGateway) {
      return;
    }

    const gateway = gateways.find((item) => item.gateway === editingGateway);
    if (!gateway) {
      return;
    }

    const updatedPaymentOptions = gateway.paymentOptions.map((_, idx) => editingData[editingGateway][idx]);

    updateFeesMutation.mutate([
      {
        gateway: editingGateway,
        paymentOptions: updatedPaymentOptions,
      },
    ]);
  };

  if (isLoading) {
    return <div className="py-4 text-sm text-muted-foreground">Carregando gateways...</div>;
  }

  return (
    <div className="grid gap-3">
      {gateways.map((gateway) => (
        <GatewayFeesCard
          key={gateway.gateway}
          gateway={gateway}
          isOpen={Boolean(openGateways[gateway.gateway])}
          isEditing={editingGateway === gateway.gateway}
          editingOptions={editingData[gateway.gateway]}
          isPending={updateFeesMutation.isPending}
          onToggle={() => handleToggleGateway(gateway.gateway)}
          onEdit={() => handleEditGateway(gateway)}
          onCancel={handleCancelEdit}
          onSave={handleSave}
          onFeeRateChange={(optionIndex, value) => handleFeeRateChange(gateway.gateway, optionIndex, value)}
          onIsActiveChange={(optionIndex, checked) => handleIsActiveChange(gateway.gateway, optionIndex, checked)}
        />
      ))}
    </div>
  );
};

export default AdminPaymentGatewaysFeature;
