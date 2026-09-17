import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssinaturaClientDraft } from "@/features/sales/utils/paymentLink";

type AssinaturaClientFieldsProps = {
  client: AssinaturaClientDraft;
  onUpdateClient: (field: keyof AssinaturaClientDraft, value: string) => void;
};

const AssinaturaClientFields = ({ client, onUpdateClient }: AssinaturaClientFieldsProps) => (
  <div className="space-y-3 rounded-lg border p-4">
    <div>
      <p className="text-sm font-medium">Dados do cliente</p>
      <p className="text-xs text-muted-foreground">
        Preencha ou atualize CPF, e-mail e telefone para gerar o link.
      </p>
    </div>

    <div className="space-y-1.5">
      <Label>Nome *</Label>
      <Input
        value={client.nome}
        onChange={(event) => onUpdateClient("nome", event.target.value)}
        placeholder="Nome do cliente"
      />
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>CPF *</Label>
        <Input
          value={client.cpf}
          onChange={(event) => onUpdateClient("cpf", event.target.value)}
          placeholder="000.000.000-00"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Telefone *</Label>
        <Input
          value={client.telefone}
          onChange={(event) => onUpdateClient("telefone", event.target.value)}
          placeholder="5534999999999"
        />
      </div>
    </div>

    <div className="space-y-1.5">
      <Label>E-mail</Label>
      <Input
        type="email"
        value={client.email}
        onChange={(event) => onUpdateClient("email", event.target.value)}
        placeholder="cliente@email.com"
      />
    </div>
  </div>
);

export default AssinaturaClientFields;
