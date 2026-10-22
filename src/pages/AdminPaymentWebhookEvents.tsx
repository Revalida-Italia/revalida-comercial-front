import PaymentWebhookEventsFeature from "@/features/admin-payment-webhooks/PaymentWebhookEventsFeature";

const AdminPaymentWebhookEvents = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Eventos de pagamento não conciliados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revise webhooks de pagamento que precisam de conciliação manual.
        </p>
      </div>
      <PaymentWebhookEventsFeature />
    </div>
  );
};

export default AdminPaymentWebhookEvents;
