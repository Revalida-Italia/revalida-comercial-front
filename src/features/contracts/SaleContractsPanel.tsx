import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  FilePlus2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SignedContractActions from "@/features/contracts/SignedContractActions";
import { isSignedContract } from "@/features/contracts/signedContract";
import {
  downloadContractPdf,
  generateContract,
  listContractModules,
  listSaleContracts,
  prefillContract,
  refreshContractSignatureStatus,
  sendContractForSignature,
  type ContractFormPayload,
  type ContractProductType,
  type RevalidaContractPayload,
  type SaleContract,
  type SchoolContractPayload,
} from "@/services/contractsApi";

type Props = { saleId: string };

const DOCUSIGN_BUTTON_ENABLED =
  import.meta.env.VITE_DOCUSIGN_BUTTON_FLAG === "true";

const PROFESSION_OPTIONS = [
  "Médico",
  "Enfermeiro(a)",
  "Fisioterapeuta",
  "Odontólogo(a)",
  "Farmacêutico(a)",
] as const;

const OTHER_PROFESSION = "__OTHER__";

function isRevalida(payload: ContractFormPayload): payload is RevalidaContractPayload {
  return payload.productType === "PROGRAMA_REVALIDA_ITALIA";
}

function isSchool(payload: ContractFormPayload): payload is SchoolContractPayload {
  return payload.productType === "ESCOLA_DE_ITALIANO";
}

function contractStatusLabel(status: SaleContract["status"]): string {
  const labels: Record<SaleContract["status"], string> = {
    GENERATED: "Gerado",
    SENT: "Enviado",
    SIGNED: "Assinado",
    DECLINED: "Recusado",
    VOIDED: "Cancelado",
  };
  return labels[status];
}

function syncFinancialResponsibles(payload: RevalidaContractPayload): RevalidaContractPayload {
  return {
    ...payload,
    financialResponsibles: payload.parties.map((party, idx) => {
      const existing = payload.financialResponsibles?.[idx];
      return {
        fullName: party.fullName,
        document: party.document,
        email: party.email || existing?.email || null,
        phone: party.phone || existing?.phone || null,
      };
    }),
  };
}

function validateBeforeGenerate(payload: ContractFormPayload): string | null {
  if (isRevalida(payload)) {
    for (const [idx, party] of payload.parties.entries()) {
      if (!party.fullName.trim()) return `Informe o nome da parte ${idx + 1}.`;
      if (!party.document.trim()) return `Informe o documento da parte ${idx + 1}.`;
      if (!party.profession.trim()) return `Informe a profissão da parte ${idx + 1}.`;
      if (!party.email?.trim()) return `Informe o e-mail da parte ${idx + 1}.`;
      if (!party.phone?.trim()) return `Informe o telefone da parte ${idx + 1}.`;
    }
    if (!payload.modules.length) return "Selecione ao menos um módulo.";
    for (const mod of payload.modules) {
      if (!mod.plannedReleaseOrTrigger?.trim()) {
        return `Informe a data de liberação do módulo ${mod.code}.`;
      }
    }
    return null;
  }

  if (!payload.student.fullName.trim()) return "Informe o nome do estudante.";
  if (!payload.student.email?.trim()) return "Informe o e-mail do estudante.";
  if (!payload.student.phone?.trim()) return "Informe o telefone do estudante.";
  if (!payload.student.birthDate) return "Informe a data de nascimento.";
  if (!payload.student.birthPlace.trim()) return "Informe o local de nascimento.";
  if (!payload.student.fullAddress.trim()) return "Informe o endereço completo.";
  if (!payload.course.startDate || !payload.course.endDate) {
    return "Informe as datas de início e fim do curso.";
  }
  return null;
}

/** Form lives in the browser; DB only stores generated PDF metadata. */
export default function SaleContractsPanel({ saleId }: Props) {
  const queryClient = useQueryClient();
  const [productType, setProductType] = useState<ContractProductType>("PROGRAMA_REVALIDA_ITALIA");
  const [payload, setPayload] = useState<ContractFormPayload | null>(null);
  const [professionMode, setProfessionMode] = useState<Record<string, string>>({});

  const listQuery = useQuery({
    queryKey: ["sale-contracts", saleId],
    queryFn: () => listSaleContracts(saleId),
  });

  const modulesQuery = useQuery({
    queryKey: ["contract-modules"],
    queryFn: listContractModules,
    enabled: productType === "PROGRAMA_REVALIDA_ITALIA",
  });

  const prefillMutation = useMutation({
    mutationFn: (type: ContractProductType) => prefillContract(saleId, type),
    onSuccess: (data) => {
      setPayload(data);
      if (isRevalida(data)) {
        const modes: Record<string, string> = {};
        for (const party of data.parties) {
          const key = party.id ?? party.fullName;
          modes[key] = PROFESSION_OPTIONS.includes(party.profession as (typeof PROFESSION_OPTIONS)[number])
            ? party.profession
            : OTHER_PROFESSION;
        }
        setProfessionMode(modes);
      }
      toast.success("Formulário pré-preenchido com dados da venda.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro no prefill.");
    },
  });

  useEffect(() => {
    setPayload(null);
    prefillMutation.mutate(productType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleId, productType]);

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!payload) throw new Error("Formulário vazio");
      const toSend = isRevalida(payload) ? syncFinancialResponsibles(payload) : payload;
      const validationError = validateBeforeGenerate(toSend);
      if (validationError) throw new Error(validationError);
      return generateContract(saleId, toSend, productType);
    },
    onSuccess: () => {
      toast.success("PDF gerado e salvo.");
      void queryClient.invalidateQueries({ queryKey: ["sale-contracts", saleId] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar contrato.");
    },
  });

  const contracts = listQuery.data ?? [];
  const selectedCodes = useMemo(() => {
    if (!payload || !isRevalida(payload)) return new Set<string>();
    return new Set(payload.modules.map((m) => m.code));
  }, [payload]);

  if (!payload) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          {prefillMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Carregando formulário do contrato...
          {!prefillMutation.isPending && (
            <Button size="sm" variant="outline" onClick={() => prefillMutation.mutate(productType)}>
              Tentar de novo
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Gerar contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <section className="space-y-2 max-w-md">
            <Label>Modelo do contrato</Label>
            <Select
              value={productType}
              onValueChange={(value) => setProductType(value as ContractProductType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROGRAMA_REVALIDA_ITALIA">
                  Programa Revalida Italia (REVALIDA_v0.9)
                </SelectItem>
                <SelectItem value="ESCOLA_DE_ITALIANO">
                  Escola de Italiano (SCUOLA_IT_v1.0)
                </SelectItem>
              </SelectContent>
            </Select>
          </section>

          {isRevalida(payload) ? (
            <RevalidaForm
              payload={payload}
              setPayload={setPayload}
              modules={modulesQuery.data ?? []}
              selectedCodes={selectedCodes}
              professionMode={professionMode}
              setProfessionMode={setProfessionMode}
            />
          ) : isSchool(payload) ? (
            <SchoolForm payload={payload} setPayload={setPayload} />
          ) : null}

          <Button
            type="button"
            className="gap-1.5"
            disabled={generateMutation.isPending || prefillMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FilePlus2 className="h-4 w-4" />
            )}
            Gerar PDF
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contratos gerados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {contracts.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum PDF gerado ainda.</p>
          )}
          {contracts.map((c) => (
            <ContractRow
              key={c.id}
              contract={c}
              onChanged={() => void queryClient.invalidateQueries({ queryKey: ["sale-contracts", saleId] })}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RevalidaForm({
  payload,
  setPayload,
  modules,
  selectedCodes,
  professionMode,
  setProfessionMode,
}: {
  payload: RevalidaContractPayload;
  setPayload: (p: ContractFormPayload) => void;
  modules: Array<{ code: string; name: string }>;
  selectedCodes: Set<string>;
  professionMode: Record<string, string>;
  setProfessionMode: (m: Record<string, string>) => void;
}) {
  return (
    <>
      <section className="space-y-2">
        <Label>Partes (contratantes)</Label>
        {payload.parties.map((party, idx) => {
          const partyKey = party.id ?? `p${idx}`;
          const mode = professionMode[partyKey] ?? (
            PROFESSION_OPTIONS.includes(party.profession as (typeof PROFESSION_OPTIONS)[number])
              ? party.profession
              : OTHER_PROFESSION
          );
          return (
            <div key={partyKey} className="grid gap-2 md:grid-cols-2 rounded-md border p-3">
              <div>
                <Label className="text-xs">Nome completo</Label>
                <Input
                  value={party.fullName}
                  onChange={(e) => {
                    const parties = [...payload.parties];
                    parties[idx] = { ...party, fullName: e.target.value };
                    setPayload({ ...payload, parties });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Documento</Label>
                <Input
                  value={party.document}
                  onChange={(e) => {
                    const parties = [...payload.parties];
                    parties[idx] = { ...party, document: e.target.value };
                    setPayload({ ...payload, parties });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Profissão</Label>
                <Select
                  value={mode}
                  onValueChange={(value) => {
                    setProfessionMode({ ...professionMode, [partyKey]: value });
                    const parties = [...payload.parties];
                    parties[idx] = {
                      ...party,
                      profession: value === OTHER_PROFESSION ? "" : value,
                    };
                    setPayload({ ...payload, parties });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFESSION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                    <SelectItem value={OTHER_PROFESSION}>Outra (texto livre)</SelectItem>
                  </SelectContent>
                </Select>
                {mode === OTHER_PROFESSION && (
                  <Input
                    className="mt-2"
                    placeholder="Digite a profissão"
                    value={party.profession}
                    onChange={(e) => {
                      const parties = [...payload.parties];
                      parties[idx] = { ...party, profession: e.target.value };
                      setPayload({ ...payload, parties });
                    }}
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">Nacionalidade</Label>
                <Input
                  value={party.nationality ?? ""}
                  onChange={(e) => {
                    const parties = [...payload.parties];
                    parties[idx] = { ...party, nationality: e.target.value };
                    setPayload({ ...payload, parties });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">E-mail *</Label>
                <Input
                  type="email"
                  required
                  value={party.email ?? ""}
                  onChange={(e) => {
                    const parties = [...payload.parties];
                    parties[idx] = { ...party, email: e.target.value };
                    setPayload({ ...payload, parties });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Telefone *</Label>
                <Input
                  required
                  value={party.phone ?? ""}
                  onChange={(e) => {
                    const parties = [...payload.parties];
                    parties[idx] = { ...party, phone: e.target.value };
                    setPayload({ ...payload, parties });
                  }}
                />
              </div>
              {payload.parties.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  onClick={() =>
                    setPayload({
                      ...payload,
                      parties: payload.parties.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => {
            const id = crypto.randomUUID();
            setProfessionMode({ ...professionMode, [id]: "Médico" });
            setPayload({
              ...payload,
              parties: [
                ...payload.parties,
                {
                  id,
                  fullName: "",
                  document: "",
                  profession: "Médico",
                  email: "",
                  phone: "",
                  nationality: "Brasileira",
                },
              ],
            });
          }}
        >
          <Plus className="h-4 w-4" />
          Adicionar parte
        </Button>
      </section>

      <section className="space-y-2">
        <Label>Módulos e datas de liberação</Label>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {modules.map((mod) => {
            const selected = selectedCodes.has(mod.code);
            const current = payload.modules.find((m) => m.code === mod.code);
            return (
              <div key={mod.code} className="rounded border p-2 space-y-2">
                <label className="flex items-start gap-2">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const next = [...payload.modules];
                      if (!checked) {
                        setPayload({
                          ...payload,
                          modules: next.filter((m) => m.code !== mod.code),
                        });
                        return;
                      }
                      if (next.some((m) => m.code === mod.code)) return;
                      setPayload({
                        ...payload,
                        modules: [
                          ...next,
                          {
                            code: mod.code,
                            name: mod.name,
                            beneficiaryPartyIds: payload.parties
                              .map((c, i) => c.id ?? `c${i}`)
                              .filter(Boolean),
                            plannedReleaseOrTrigger: "",
                            accessPeriod: "12 meses",
                          },
                        ],
                      });
                    }}
                  />
                  <span>
                    <strong>{mod.code}</strong> — {mod.name}
                  </span>
                </label>
                {selected && current && (
                  <div className="grid gap-2 md:grid-cols-2 pl-6">
                    <div>
                      <Label className="text-xs">Data de liberação / gatilho *</Label>
                      <Input
                        type="date"
                        value={/^\d{4}-\d{2}-\d{2}$/.test(current.plannedReleaseOrTrigger ?? "")
                          ? current.plannedReleaseOrTrigger ?? ""
                          : ""}
                        onChange={(e) => {
                          setPayload({
                            ...payload,
                            modules: payload.modules.map((m) =>
                              m.code === mod.code
                                ? { ...m, plannedReleaseOrTrigger: e.target.value }
                                : m,
                            ),
                          });
                        }}
                      />
                      <Input
                        className="mt-1"
                        placeholder="Ou descreva o gatilho (ex.: após pagamento)"
                        value={/^\d{4}-\d{2}-\d{2}$/.test(current.plannedReleaseOrTrigger ?? "")
                          ? ""
                          : current.plannedReleaseOrTrigger ?? ""}
                        onChange={(e) => {
                          setPayload({
                            ...payload,
                            modules: payload.modules.map((m) =>
                              m.code === mod.code
                                ? { ...m, plannedReleaseOrTrigger: e.target.value }
                                : m,
                            ),
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Prazo de acesso</Label>
                      <Input
                        value={current.accessPeriod ?? ""}
                        onChange={(e) => {
                          setPayload({
                            ...payload,
                            modules: payload.modules.map((m) =>
                              m.code === mod.code
                                ? { ...m, accessPeriod: e.target.value }
                                : m,
                            ),
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-2 md:grid-cols-2">
        <div>
          <Label>Valor total (BRL)</Label>
          <Input
            type="number"
            value={payload.totalAmount}
            onChange={(e) =>
              setPayload({ ...payload, totalAmount: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <Label>Descrição do pagamento</Label>
          <Input
            value={payload.paymentDescription}
            onChange={(e) =>
              setPayload({ ...payload, paymentDescription: e.target.value })
            }
          />
        </div>
      </section>

      <section className="max-w-md space-y-2">
        <Label>Regime de responsabilidade</Label>
        <Select
          value={payload.liabilityRegime}
          onValueChange={(value) =>
            setPayload({
              ...payload,
              liabilityRegime: value as "INDIVIDUAL" | "JOINT",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INDIVIDUAL">Individual por contratante</SelectItem>
            <SelectItem value="JOINT">Solidária entre as partes</SelectItem>
          </SelectContent>
        </Select>
      </section>
    </>
  );
}

function SchoolForm({
  payload,
  setPayload,
}: {
  payload: SchoolContractPayload;
  setPayload: (p: ContractFormPayload) => void;
}) {
  return (
    <>
      <section className="grid gap-2 md:grid-cols-2 rounded-md border p-3">
        <div className="md:col-span-2">
          <Label className="text-xs">Estudante — nome completo</Label>
          <Input
            value={payload.student.fullName}
            onChange={(e) =>
              setPayload({
                ...payload,
                student: { ...payload.student, fullName: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Data de nascimento *</Label>
          <Input
            type="date"
            value={payload.student.birthDate}
            onChange={(e) =>
              setPayload({
                ...payload,
                student: { ...payload.student, birthDate: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Local de nascimento *</Label>
          <Input
            value={payload.student.birthPlace}
            onChange={(e) =>
              setPayload({
                ...payload,
                student: { ...payload.student, birthPlace: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Nacionalidade</Label>
          <Input
            value={payload.student.nationality}
            onChange={(e) =>
              setPayload({
                ...payload,
                student: { ...payload.student, nationality: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Passaporte</Label>
          <Input
            value={payload.student.passport ?? ""}
            onChange={(e) =>
              setPayload({
                ...payload,
                student: { ...payload.student, passport: e.target.value },
              })
            }
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Endereço completo *</Label>
          <Input
            value={payload.student.fullAddress}
            onChange={(e) =>
              setPayload({
                ...payload,
                student: { ...payload.student, fullAddress: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">E-mail *</Label>
          <Input
            type="email"
            value={payload.student.email}
            onChange={(e) =>
              setPayload({
                ...payload,
                student: { ...payload.student, email: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Telefone *</Label>
          <Input
            value={payload.student.phone}
            onChange={(e) =>
              setPayload({
                ...payload,
                student: { ...payload.student, phone: e.target.value },
              })
            }
          />
        </div>
      </section>

      <section className="grid gap-2 md:grid-cols-2 rounded-md border p-3">
        <div>
          <Label className="text-xs">Finalidade do curso</Label>
          <Select
            value={payload.course.purpose}
            onValueChange={(value) =>
              setPayload({
                ...payload,
                course: {
                  ...payload.course,
                  purpose: value as "LANGUAGE" | "LANGUAGE_STUDY_VISA",
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LANGUAGE">Aperfeiçoamento linguístico</SelectItem>
              <SelectItem value="LANGUAGE_STUDY_VISA">Visto de estudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Duração (meses)</Label>
          <Input
            type="number"
            value={payload.course.durationMonths}
            onChange={(e) =>
              setPayload({
                ...payload,
                course: {
                  ...payload.course,
                  durationMonths: Number(e.target.value) || 0,
                },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Início *</Label>
          <Input
            type="date"
            value={payload.course.startDate}
            onChange={(e) =>
              setPayload({
                ...payload,
                course: { ...payload.course, startDate: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Fim *</Label>
          <Input
            type="date"
            value={payload.course.endDate}
            onChange={(e) =>
              setPayload({
                ...payload,
                course: { ...payload.course, endDate: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Horas semanais</Label>
          <Input
            type="number"
            value={payload.course.weeklyHours}
            onChange={(e) =>
              setPayload({
                ...payload,
                course: {
                  ...payload.course,
                  weeklyHours: Number(e.target.value) || 0,
                },
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Nível inicial → objetivo</Label>
          <div className="flex gap-2">
            <Input
              value={payload.course.initialLevel}
              onChange={(e) =>
                setPayload({
                  ...payload,
                  course: { ...payload.course, initialLevel: e.target.value },
                })
              }
            />
            <Input
              value={payload.course.targetLevel}
              onChange={(e) =>
                setPayload({
                  ...payload,
                  course: { ...payload.course, targetLevel: e.target.value },
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="grid gap-2 md:grid-cols-2">
        <div>
          <Label>Valor total (EUR)</Label>
          <Input
            type="number"
            value={payload.totalAmount}
            onChange={(e) =>
              setPayload({ ...payload, totalAmount: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <Label>Descrição do pagamento</Label>
          <Input
            value={payload.paymentDescription}
            onChange={(e) =>
              setPayload({ ...payload, paymentDescription: e.target.value })
            }
          />
        </div>
      </section>
    </>
  );
}

function ContractRow({
  contract,
  onChanged,
}: {
  contract: SaleContract;
  onChanged: () => void;
}) {
  const downloadMutation = useMutation({
    mutationFn: () => downloadContractPdf(contract.id),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Download falhou"),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendContractForSignature(contract.id),
    onSuccess: () => {
      toast.success("Contrato enviado para assinatura pelo DocuSign.");
      onChanged();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Envio pelo DocuSign falhou");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshContractSignatureStatus(contract.id),
    onSuccess: (updated) => {
      toast.success(
        updated.status === "SIGNED"
          ? "Contrato assinado."
          : "Status do DocuSign atualizado.",
      );
      onChanged();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o status");
    },
  });

  const signed = isSignedContract(contract);

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {contract.productType === "PROGRAMA_REVALIDA_ITALIA" ? "Revalida" : "Escola"}
            </span>
            <Badge variant="outline">{contractStatusLabel(contract.status)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {contract.fileName ?? contract.id}
            {contract.signerEmail ? ` · ${contract.signerEmail}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!signed && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={downloadMutation.isPending}
              onClick={() => downloadMutation.mutate()}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          )}
          {DOCUSIGN_BUTTON_ENABLED && contract.status === "GENERATED" && (
            <Button
              size="sm"
              className="gap-1"
              disabled={sendMutation.isPending}
              onClick={() => {
                const recipients = contract.signers?.map((signer) => signer.email).join(", ");
                const confirmed = window.confirm(
                  `Enviar este contrato para assinatura${recipients ? ` a ${recipients}` : ""}?`,
                );
                if (confirmed) sendMutation.mutate();
              }}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Enviar via DocuSign
            </Button>
          )}
          {contract.docusignEnvelopeId && !signed && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={refreshMutation.isPending}
              onClick={() => refreshMutation.mutate()}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`}
              />
              Atualizar status
            </Button>
          )}
        </div>
      </div>
      {signed && <SignedContractActions contract={contract} onChanged={onChanged} />}
    </div>
  );
}
