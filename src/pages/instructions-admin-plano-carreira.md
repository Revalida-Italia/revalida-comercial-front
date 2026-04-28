# Plano de Carreira — Especificação para Implementação (Frontend Mock)

## Visão Geral

O **Plano de Carreira** é um dos pilares do sistema comercial. Ele gamifica o progresso do vendedor com um sistema de estrelas e níveis. As regras serão aplicadas no backend futuramente; por ora, toda a lógica deve ser implementada no frontend como simulação, usando os dados já existentes em `mockData.ts`.

---

## 1. Tipos e Constantes — adicionar em `mockData.ts`

### 1.1 Níveis de carreira (enum/union type)

```ts
export type CareerLevel =
  | "TRAINEE_JUNIOR"
  | "TRAINEE_PLENO"
  | "TRAINEE_SENIOR"
  | "LANCAMENTO_GERENTE"
  | "GERENTE"
  | "GERENTE_PLENO"
  | "GERENTE_SENIOR"
  | "DIRETOR";
```

### 1.2 Tabela de configuração por nível

Criar uma constante `careerConfig` do tipo `Record<CareerLevel, CareerLevelConfig>` com a seguinte estrutura por nível:

| Nível               | Label                  | Salário Fixo | Comissão Individual | Comissão do Time | Vendas p/ 1 estrela | Estrelas para subir | Meta mensal (vendas) | Mín. vendas/mês (contrato ativo) | Equipe de Trainees |
|---------------------|------------------------|-------------|---------------------|-----------------|----------------------|----------------------|----------------------|-----------------------------------|--------------------|
| TRAINEE_JUNIOR      | Trainee Junior         | R$ 1.500    | 5%                  | 0%              | 2                    | 4                    | 8                    | 3                                 | 0                  |
| TRAINEE_PLENO       | Trainee Pleno          | R$ 1.500    | 6%                  | 0%              | 3                    | 4                    | 12                   | 4                                 | 0                  |
| TRAINEE_SENIOR      | Trainee Sênior         | R$ 1.500    | 7%                  | 0%              | 4                    | 4                    | 16                   | 5                                 | 0                  |
| LANCAMENTO_GERENTE  | Lançamento a Gerente * | R$ 2.500    | 8%                  | 2%              | 5                    | especial*            | 20                   | 5                                 | 1                  |
| GERENTE             | Gerente                | R$ 4.000    | 8%                  | 2%              | 6                    | 4                    | 20                   | 6                                 | 2                  |
| GERENTE_PLENO       | Gerente Pleno          | R$ 6.000    | 9%                  | 2,5%            | 7                    | 4                    | 24                   | 7                                 | 3                  |
| GERENTE_SENIOR      | Gerente Sênior         | R$ 8.000    | 10%                 | 3%              | 8                    | 4                    | 28                   | 8                                 | 6                  |
| DIRETOR             | Diretor                | R$ 10.000   | 10%                 | 4%              | 9                    | 4                    | 32                   | 8                                 | 12                 |

> **Regra especial de Lançamento a Gerente:** o vendedor só avança para Gerente quando **pelo menos 1 trainee subordinado** fechar 4 estrelas. Não é pelo próprio desempenho de estrelas.

### 1.3 Interface `CareerLevelConfig`

```ts
export interface CareerLevelConfig {
  label: string;
  fixedSalary: number;
  individualCommissionPct: number;
  teamCommissionPct: number;
  salesPerStar: number;           // quantas vendas valem 1 estrela nesse nível
  starsToLevelUp: number | "special"; // 4 para a maioria; "special" para LANCAMENTO_GERENTE
  monthlyGoalSales: number;       // meta mensal em vendas (pontos)
  minMonthlySales: number;        // mínimo para manter contrato ativo
  traineeTeamSize: number;        // número de trainees na equipe
}
```

### 1.4 Interface `SellerCareerProfile` — adicionar ao mock de vendedores

```ts
export interface SellerCareerProfile {
  sellerId: string;
  sellerName: string;
  currentLevel: CareerLevel;
  salesCountCurrentCycle: number; // vendas acumuladas no ciclo atual (para cálculo de estrelas)
  salesCountCurrentMonth: number; // vendas no mês corrente (para meta mensal)
  subordinateIds?: string[];       // IDs dos trainees subordinados (para LANCAMENTO_GERENTE)
}
```

Criar um array `mockSellerProfiles: SellerCareerProfile[]` com pelo menos 4 vendedores fictícios em níveis diferentes para visualização no Admin.

---

## 2. Funções utilitárias — adicionar em `mockData.ts` ou novo arquivo `careerUtils.ts`

```ts
// Quantas estrelas completas o vendedor tem no ciclo atual
getStarsCount(profile: SellerCareerProfile): number

// Quantas vendas faltam para completar a próxima estrela
getSalesToNextStar(profile: SellerCareerProfile): number

// Quantas estrelas faltam para subir de nível (retorna null em LANCAMENTO_GERENTE)
getStarsToLevelUp(profile: SellerCareerProfile): number | null

// Percentual de progresso dentro do nível atual (0–100)
getLevelProgressPct(profile: SellerCareerProfile): number

// Verifica se o vendedor está abaixo do mínimo mensal (risco de perda de contrato)
isBelowMinimum(profile: SellerCareerProfile): boolean

// Retorna o próximo nível de carreira ou null se for DIRETOR
getNextLevel(level: CareerLevel): CareerLevel | null
```

---

## 3. Componentes a criar

### 3.1 `CareerBadge` — indicador compacto para o header do vendedor

- Exibir: ícone de estrela + nível atual (label curto) + "X★ / 4★"
- Deve ser visível no `AppSidebar` ou no topo do `Dashboard` do vendedor (não admin)
- Ao clicar, abre um popover/tooltip com detalhes: nível, estrelas, vendas no mês vs meta

### 3.2 `CareerProgressCard` — card de progresso individual

Usado tanto na view do vendedor quanto no admin (por vendedor selecionado). Contém:
- Nome e nível atual com badge colorido por nível
- Barra de progresso visual com estrelas preenchidas/vazias (4 ou N estrelas)
- Contador: "X vendas este ciclo / Y vendas p/ próxima estrela"
- Contador mensal: "X vendas este mês / Meta: Y / Mínimo: Z" com cor de alerta se abaixo do mínimo
- Para LANCAMENTO_GERENTE: mostrar status do subordinado ("Trainee: X/4 estrelas")

### 3.3 `AdminCareerTable` — tabela de referência do plano (view admin)

Tabela com todas as colunas da imagem (Cargo, Valor Fixo, Comissão Individual, Comissão do Time, Meta para Crescimento, Meta Mensal Individual, Equipe de Trainees). Dados vindos de `careerConfig`. Linha destacada para o nível selecionado ou do usuário logado.

### 3.4 `AdminCareerOverview` — visão geral de todos os vendedores (view admin)

Lista/grid de cards `CareerProgressCard` para cada vendedor em `mockSellerProfiles`. Deve incluir:
- Filtro por nível
- Alerta visual para vendedores abaixo do mínimo mensal

---

## 4. Páginas afetadas

### 4.1 `AdminDashboard.tsx`

Adicionar seção "Plano de Carreira" com:
- `AdminCareerTable` (tabela de referência do plano completo)
- `AdminCareerOverview` (progresso de todos os vendedores)

### 4.2 `Dashboard.tsx` (view do vendedor)

- Adicionar `CareerBadge` no topo da página (próximo ao título ou no header)
- Adicionar `CareerProgressCard` do vendedor logado (usar `demoSellerId` como referência)

### 4.3 Nova página `/plano-de-carreira` (view do vendedor)

Página dedicada com:
- `CareerProgressCard` expandido com histórico mensal simulado
- `AdminCareerTable` com a linha do nível atual destacada
- Seção "O que preciso para subir de nível" com checklist visual

---

## 5. Roteamento

Adicionar rota `/plano-de-carreira` em `App.tsx` apontando para a nova página. Adicionar link no `AppSidebar`.

---

## 6. Regras de negócio importantes

1. **Ciclo de estrelas:** ao atingir 4 estrelas, o contador `salesCountCurrentCycle` é zerado e o nível pode subir (se regras atendidas). No mock, simular como dado estático.
2. **Comissão do time:** apenas para níveis LANCAMENTO_GERENTE e acima; calculada sobre o total de vendas dos subordinados.
3. **Contrato ativo:** se `salesCountCurrentMonth < minMonthlySales`, exibir alerta vermelho no card e na tabela admin.
4. **LANCAMENTO_GERENTE é transitório:** não é um nível permanente; o vendedor fica nele até o subordinado bater 4 estrelas.
5. **Diretor não tem nível seguinte:** `getNextLevel("DIRETOR")` retorna `null`.

---

## 7. Estilo visual

- Usar as cores e componentes já existentes no projeto (shadcn/ui + Tailwind)
- Estrelas preenchidas: `text-yellow-400` / `fill-yellow-400`
- Estrelas vazias: `text-muted-foreground`
- Barra de progresso: usar o componente `Progress` de `@/components/ui/progress`
- Alerta de mínimo: `Badge` com variant `destructive`
- Badge de nível: cor diferente por grupo (trainee = azul, gerente = verde, diretor = dourado)
