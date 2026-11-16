import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n";
import type { AssinaturaClientDraft } from "@/features/sales/utils/paymentLink";

type AssinaturaClientFieldsProps = {
  client: AssinaturaClientDraft;
  onUpdateClient: (field: keyof AssinaturaClientDraft, value: string) => void;
};

const AssinaturaClientFields = ({ client, onUpdateClient }: AssinaturaClientFieldsProps) => (
  <div className="space-y-3 rounded-lg border p-4">
    <div>
      <p className="text-sm font-medium">{t("sales.paymentLink.clientTitle")}</p>
      <p className="text-xs text-muted-foreground">
        {t("sales.paymentLink.clientHint")}
      </p>
    </div>

    <div className="space-y-1.5">
      <Label>{t("sales.paymentLink.name")} *</Label>
      <Input
        value={client.nome}
        onChange={(event) => onUpdateClient("nome", event.target.value)}
        placeholder={t("sales.paymentLink.namePlaceholder")}
      />
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>{t("sales.paymentLink.document")} *</Label>
        <Input
          value={client.cpf}
          onChange={(event) => onUpdateClient("cpf", event.target.value)}
          placeholder={t("sales.paymentLink.documentPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("sales.paymentLink.phone")} *</Label>
        <Input
          value={client.telefone}
          onChange={(event) => onUpdateClient("telefone", event.target.value)}
          placeholder={t("sales.paymentLink.phonePlaceholder")}
        />
      </div>
    </div>

    <div className="space-y-1.5">
      <Label>{t("sales.paymentLink.email")}</Label>
      <Input
        type="email"
        value={client.email}
        onChange={(event) => onUpdateClient("email", event.target.value)}
        placeholder={t("sales.paymentLink.emailPlaceholder")}
      />
    </div>
  </div>
);

export default AssinaturaClientFields;
