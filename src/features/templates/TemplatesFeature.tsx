import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Braces, MessageSquare, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createWhatsappTemplate, listWhatsappTemplates } from "@/services/whatsappApi";
import {
  buildExemplosArray,
  buildTemplatePreview,
  extractTemplateVariableIndices,
  syncVariableExamples,
} from "./utils";

const TEMPLATE_CATEGORIES = [
  { value: "UTILITY", label: "Utilidade" },
  { value: "MARKETING", label: "Marketing" },
  { value: "AUTHENTICATION", label: "Autenticacao" },
] as const;

type TemplateFormState = {
  nome: string;
  categoria: string;
  idioma: string;
  corpo: string;
  variableExamples: Record<number, string>;
};

const EMPTY_FORM: TemplateFormState = {
  nome: "",
  categoria: "UTILITY",
  idioma: "pt_BR",
  corpo: "",
  variableExamples: {},
};

const TemplatesFeature = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);

  const variableIndices = useMemo(
    () => extractTemplateVariableIndices(form.corpo),
    [form.corpo],
  );

  const previewText = useMemo(
    () => buildTemplatePreview(form.corpo, form.variableExamples),
    [form.corpo, form.variableExamples],
  );

  const templatesQuery = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: listWhatsappTemplates,
  });

  const updateCorpo = (corpo: string) => {
    setForm((current) => ({
      ...current,
      corpo,
      variableExamples: syncVariableExamples(corpo, current.variableExamples),
    }));
  };

  const updateVariableExample = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      variableExamples: {
        ...current.variableExamples,
        [index]: value,
      },
    }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const exemplos = buildExemplosArray(variableIndices, form.variableExamples);

      await createWhatsappTemplate({
        nome: form.nome.trim(),
        categoria: form.categoria,
        idioma: form.idioma.trim() || "pt_BR",
        corpo: form.corpo.trim(),
        exemplos,
      });
    },
    onSuccess: async () => {
      toast.success("Template criado com sucesso.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Erro ao criar template.");
    },
  });

  const handleSubmit = () => {
    if (!form.nome.trim() || !form.corpo.trim()) {
      toast.error("Preencha nome e corpo do template.");
      return;
    }

    if (variableIndices.length > 0) {
      const missing = variableIndices.filter((index) => !form.variableExamples[index]?.trim());
      if (missing.length > 0) {
        toast.error(`Preencha o exemplo da variavel ${missing.map((i) => `{{${i}}}`).join(", ")}.`);
        return;
      }
    }

    createMutation.mutate();
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setForm(EMPTY_FORM);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Templates WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie templates da Meta para envio de mensagens e links de pagamento.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Templates cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {templatesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Carregando templates...</p>
          )}

          {templatesQuery.isError && (
            <p className="text-sm text-destructive">
              Erro ao carregar: {(templatesQuery.error as Error).message}
            </p>
          )}

          {!templatesQuery.isLoading && !templatesQuery.isError && (templatesQuery.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum template cadastrado.</p>
          )}

          {(templatesQuery.data ?? []).map((template) => {
            const indices = extractTemplateVariableIndices(template.corpo);

            return (
              <div key={template.id ?? template.nome} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{template.nome}</p>
                  <Badge variant="outline">{template.categoria}</Badge>
                  <Badge variant="secondary">{template.idioma}</Badge>
                  {template.status && <Badge>{template.status}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">{template.corpo}</p>
                {indices.length > 0 && template.exemplos && template.exemplos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {indices.map((index, position) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs"
                      >
                        <code className="text-primary">{`{{${index}}}`}</code>
                        <span className="text-muted-foreground">→</span>
                        <span>{template.exemplos?.[position] ?? "-"}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar template (Meta)</DialogTitle>
            <DialogDescription>
              Escreva o texto com variaveis numeradas. Cada {"{{n}}"} tera um campo de exemplo proprio para
              aprovacao na Meta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="template-nome">Nome do template *</Label>
              <Input
                id="template-nome"
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                placeholder="link_pagamento"
              />
              <p className="text-xs text-muted-foreground">Identificador unico usado na API (sem espacos).</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(value) => setForm((current) => ({ ...current, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="template-idioma">Idioma *</Label>
                <Input
                  id="template-idioma"
                  value={form.idioma}
                  onChange={(event) => setForm((current) => ({ ...current, idioma: event.target.value }))}
                  placeholder="pt_BR"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-corpo">Corpo da mensagem *</Label>
              <Textarea
                id="template-corpo"
                value={form.corpo}
                onChange={(event) => updateCorpo(event.target.value)}
                placeholder="Ola {{1}}! Para pagar, clique no botao abaixo."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{1}}"}, {"{{2}}"}, {"{{3}}"}... na ordem em que aparecem na mensagem.
              </p>
            </div>

            {variableIndices.length > 0 ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="flex items-start gap-2">
                  <Braces className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Exemplos das variaveis</p>
                    <p className="text-xs text-muted-foreground">
                      A Meta exige um valor de exemplo para cada placeholder. Preencha na mesma ordem dos indices.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {variableIndices.map((index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[88px_1fr] sm:items-center">
                      <div className="flex items-center gap-2 sm:justify-end">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {`{{${index}}}`}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`example-${index}`} className="sr-only">
                          Exemplo para variavel {index}
                        </Label>
                        <Input
                          id={`example-${index}`}
                          value={form.variableExamples[index] ?? ""}
                          onChange={(event) => updateVariableExample(index, event.target.value)}
                          placeholder={index === 1 ? "Joao Silva" : `Exemplo para variavel ${index}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              form.corpo.trim() && (
                <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  Nenhuma variavel detectada. Adicione {"{{1}}"} no corpo para solicitar exemplos dinamicos.
                </p>
              )
            )}

            {form.corpo.trim() && (
              <>
                <Separator />
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Sparkles className="h-4 w-4" />
                    Previa da mensagem
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewText}</p>
                  {variableIndices.length > 0 && variableIndices.some((i) => !form.variableExamples[i]?.trim()) && (
                    <p className="text-xs text-amber-700">
                      Variaveis sem exemplo continuam como {"{{n}}"} na previa.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Criar template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesFeature;
