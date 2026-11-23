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
import { listCourseCatalog } from "@/features/new-sale/courses/catalogApi";
import type { TeachingCatalog } from "@/features/new-sale/courses/types";
import type { SaleItem } from "@/services/commercialApi";
import {
  createSaleStudent,
  isEmailAlreadyExists,
  listSaleStudents,
  type SaleStudent,
  type SaleStudentRelease,
} from "@/services/contractsApi";
import { formatDate } from "@/shared/utils/format";

type Props = { saleId: string; items?: SaleItem[] };

function releasesFromSaleItems(items: SaleItem[] | undefined, catalog?: TeachingCatalog): SaleStudentRelease[] {
  const releases: SaleStudentRelease[] = [];
  for (const item of items ?? []) {
    if (item.kind !== "course" && item.kind !== "module") continue;
    const id = item.kind === "module" ? item.moduleId : item.courseId;
    const name = item.kind === "module" ? item.moduleName || item.name : item.courseName || item.name;
    if (!id || !name?.trim()) continue;
    const cover = item.kind === "module"
      ? catalog?.modules?.find((module) => module.id === id)?.thumbnailUrl
      : catalog?.courses?.find((course) => course.id === id)?.thumbnailUrl;
    releases.push({
      kind: item.kind,
      id,
      name: name.trim(),
      startsAt: (item.startsAt ?? "").slice(0, 10),
      thumbnailUrl: cover ?? null,
    });
  }
  return releases;
}

const emptyForm = { email: "", name: "", document: "", phone: "" };

/** A sale releases the same courses to every student, so the card shows them once. */
export function releasesForSale(students: SaleStudent[]): SaleStudentRelease[] {
  const seen = new Set<string>();
  const releases: SaleStudentRelease[] = [];
  for (const student of students) {
    for (const release of student.releases ?? []) {
      const key = `${release.kind}:${release.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      releases.push(release);
    }
  }
  return releases;
}

export default function SalePortalUsers({ saleId, items }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
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
    if (query.isSuccess && (query.data ?? []).length === 0) {
      setReview(true);
      return;
    }
    createUser.mutate();
  }

  const students = query.data ?? [];
  const fromStudents = releasesForSale(students);
  const catalogQuery = useQuery({
    queryKey: ["sales", "course-catalog"],
    queryFn: listCourseCatalog,
    enabled: fromStudents.length === 0,
  });
  const releases = fromStudents.length > 0 ? fromStudents : releasesFromSaleItems(items, catalogQuery.data);
  const firstStudent = query.isSuccess && students.length === 0;

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
            setReview(false);
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
        ) : (
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <div className="min-w-0">
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("portalAccess.empty")}</p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {students.map((student) => (
                    <li key={student.id} className="py-2">
                      <p className="text-sm font-medium">{student.name || student.email}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                      <p className="text-xs text-muted-foreground">{student.createdAt ? formatDate(student.createdAt) : "—"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="min-w-0 md:border-l md:border-border/70 md:pl-6">
              <h3 className="mb-2 text-sm font-semibold">{t("portalAccess.granted")}</h3>
              {releases.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("portalAccess.grantedEmpty")}</p>
              ) : (
                <ul className="space-y-1.5" aria-label={t("portalAccess.granted")}>
                  {releases.map((release) => (
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
              )}
            </div>
          </div>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setReview(false); }}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("portalAccess.associate")}</DialogTitle>
          </DialogHeader>
          {review ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                createUser.mutate();
              }}
            >
              <ReleaseList releases={releases} />
              {releases.length === 0 ? <p className="text-sm text-muted-foreground">{t("portalAccess.reviewEmpty")}</p> : null}
              <p className="text-sm text-[#52657A]">{t("portalAccess.reviewWarning")}</p>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setReview(false)}>{t("portalAccess.reviewBack")}</Button>
                <Button type="submit" disabled={createUser.isPending}>{t("portalAccess.associate")}</Button>
              </DialogFooter>
            </form>
          ) : (
          <form className="space-y-3" onSubmit={submit}>
            {!firstStudent ? (
              releases.length === 0
                ? <p className="text-sm text-muted-foreground">{t("portalAccess.grantedEmpty")}</p>
                : <ReleaseList releases={releases} />
            ) : null}
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
              <Button type="submit" disabled={createUser.isPending}>{t(firstStudent ? "portalAccess.continue" : "portalAccess.associate")}</Button>
            </DialogFooter>
          </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ReleaseList({ releases }: { releases: SaleStudentRelease[] }) {
  if (releases.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{t("portalAccess.granted")}</h3>
      <ul className="space-y-1.5" aria-label={t("portalAccess.granted")}>
        {releases.map((release) => (
          <li key={`${release.kind}-${release.id}`} className="flex min-w-0 items-center gap-2">
            <Thumb src={release.thumbnailUrl} size={release.kind === "module" ? "module" : "course"} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{release.name}</p>
              <p className="text-xs text-muted-foreground">
                {release.startsAt ? t("portalAccess.startsOn", { data: formatDate(release.startsAt) }) : t("portalAccess.released")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
