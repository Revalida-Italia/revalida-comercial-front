import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listUsers, searchUsers, type UserSearchResult } from "@/services/usersApi";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ListFilter, Plus, Search, ShieldCheck, Star, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useNavigate } from "react-router-dom";

function roleLabel(role?: string): string {
  if (role === "ADMIN") {
    return "Administrador";
  }

  if (role === "SELLER") {
    return "Vendedor";
  }

  return role ?? "Não definido";
}

function formatDate(date?: string): string {
  if (!date) {
    return "-";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

const AdminUsersFeature = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 350);

  const usersQuery = useQuery({
    queryKey: ["adminUsers", debouncedSearchTerm],
    queryFn: async () => {
      if (debouncedSearchTerm.trim()) {
        return searchUsers(debouncedSearchTerm);
      }

      return listUsers();
    },
  });

  const users = usersQuery.data ?? [];

  const summary = useMemo(() => {
    const total = users.length;
    const admins = users.filter((user) => user.role === "ADMIN").length;
    const sellers = users.filter((user) => user.role === "SELLER").length;

    return { total, admins, sellers };
  }, [users]);

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-primary/[0.07] via-card to-accent/[0.05] shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />

        <CardHeader className="relative gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary/90">
                <UsersRound className="h-3.5 w-3.5" />
                Hub de Usuários
              </div>
              <CardTitle className="text-2xl">Gestão de usuários</CardTitle>
              <CardDescription className="mt-1 max-w-2xl text-sm">
                Centralize criação de usuários e gerenciamento de carreira em um único painel.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button className="gap-2" onClick={() => navigate("/admin/users/new")}> 
                <Plus className="h-4 w-4" />
                Criar usuário
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/carreira")}>
                <ShieldCheck className="h-4 w-4" />
                Gerenciar carreira
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-card/80 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admins</p>
              <p className="mt-1 text-2xl font-semibold">{summary.admins}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vendedores</p>
              <p className="mt-1 text-2xl font-semibold">{summary.sellers}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Usuários cadastrados</CardTitle>
              <CardDescription>Lista com dados principais para consulta rápida.</CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por email ou nome"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {usersQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando usuários...</p>}

          {usersQuery.isError && (
            <p className="text-sm text-destructive">
              Erro ao listar usuários: {(usersQuery.error as Error).message}
            </p>
          )}

          {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <ListFilter className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum usuário encontrado para este filtro.</p>
            </div>
          )}

          {!usersQuery.isLoading && !usersQuery.isError && users.length > 0 && (
            <div className="grid gap-3">
              {users.map((user: UserSearchResult) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-border/80 bg-card/70 p-4 shadow-sm transition-colors hover:border-primary/35"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">{user.name || "Usuário sem nome"}</p>
                      <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{roleLabel(user.role)}</Badge>
                      {user.careerPlan?.name ? (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          {user.careerPlan.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Sem plano</Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <p>Criado em: {formatDate(user.createdAt)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 rounded-md px-2 text-primary transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                      onClick={() =>
                        navigate("/admin/carreira", {
                          state: {
                            prefilledUser: user,
                          },
                        })
                      }
                    >
                      Gerenciar carreira
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersFeature;
