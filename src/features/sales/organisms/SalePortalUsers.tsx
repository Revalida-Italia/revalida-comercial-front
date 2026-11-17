import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Thumb } from "@/features/new-sale/courses/Thumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n";
import {
  createSaleStudent,
  isEmailAlreadyExists,
  listSaleStudents,
} from "@/services/contractsApi";
import { formatDate } from "@/shared/utils/format";

type Props = { saleId: string };

const emptyForm = { email: "", name: "", document: "", phone: "" };

export default function SalePortalUsers({ saleId }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["sale-students", saleId],
    queryFn: () => listSaleStudents(saleId),
  });

  const createUser = useMutation({
    mutationFn: () => createSaleStudent(saleId, form),
    onSuccess: async (result) => {
      toast.success(t("portalAccess.createdNow"));
      if (result.enrollments.failed > 0) toast.error(t("portalAccess.enrollmentsFailed"));
      setOpen(false);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["sale-students", saleId] });
    },
    onError: (cause: unknown) => {
      setError(t(isEmailAlreadyExists(cause) ? "portalAccess.emailTaken" : "portalAccess.saveError"));
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const email = form.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("portalAccess.emailInvalid"));
      return;
    }
    setError(null);
    createUser.mutate();
  }

  const students = query.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-sm">{t("portalAccess.title")}</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {t("portalAccess.associate")}
        </Button>
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <p className="text-sm text-destructive">{t("portalAccess.loadError")}</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("portalAccess.empty")}</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {students.map((student) => (
              <li key={student.id} className="py-2">
                <div className="grid gap-1 sm:grid-cols-[1.4fr_1.6fr_auto] sm:items-center">
                  <p className="text-sm font-medium">{student.name || student.email}</p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                  <p className="text-sm text-muted-foreground">{student.createdAt ? formatDate(student.createdAt) : "—"}</p>
                </div>
                {(student.releases ?? []).length > 0 ? (
                  <ul className="mt-2 space-y-1.5" aria-label={t("portalAccess.released")}>
                    {(student.releases ?? []).map((release) => (
                      <li key={`${release.kind}-${release.id}`} className="flex min-w-0 items-center gap-2">
                        <Thumb src={release.thumbnailUrl} size={release.kind === "module" ? "module" : "course"} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{release.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {release.startsAt
                              ? t("portalAccess.startsOn", { data: formatDate(release.startsAt) })
                              : t("portalAccess.released")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{t("portalAccess.noContent")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("portalAccess.associate")}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="sale-student-email">{t("portalAccess.email")}</Label>
              <Input
                id="sale-student-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-student-name">{t("portalAccess.name")}</Label>
              <Input
                id="sale-student-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-student-document">{t("portalAccess.document")}</Label>
              <Input
                id="sale-student-document"
                value={form.document}
                onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-student-phone">{t("portalAccess.phone")}</Label>
              <Input
                id="sale-student-phone"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={createUser.isPending}>{t("portalAccess.associate")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
