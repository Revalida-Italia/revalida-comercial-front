import AdminPaymentGatewaysFeature from "@/features/admin-payment-gateways/AdminPaymentGatewaysFeature";

const AdminPaymentGateways = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Taxas de Pagamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie as taxas de cada gateway de pagamento</p>
      </div>

      <AdminPaymentGatewaysFeature />
    </div>
  );
};

export default AdminPaymentGateways;
