import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { PROFILE_COOKIE, parseProfileCookie } from "@/lib/filters";
import { projectGoalCompletion } from "@/lib/projections";
import { goalStatusOptions } from "@/lib/validations/goal";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { DeleteGoalButton } from "@/components/goals/delete-goal-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/finance/money-display";

export const metadata: Metadata = { title: "Metas — Financial Hub Familiar" };

const STATUS_LABELS: Record<(typeof goalStatusOptions)[number], string> = {
  in_progress: "Em andamento",
  completed: "Concluída",
  paused: "Pausada",
  cancelled: "Cancelada",
};

const STATUS_BADGE_VARIANT: Record<(typeof goalStatusOptions)[number], "outline" | "positive" | "warning" | "negative"> = {
  in_progress: "outline",
  completed: "positive",
  paused: "warning",
  cancelled: "negative",
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MetasPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const profileFilter = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value);

  let goalsQuery = supabase
    .from("financial_goals")
    .select(
      "id, name, description, target_amount, current_amount, target_date, monthly_contribution, profile_id, status, profiles(name)",
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (profileFilter !== "all") {
    goalsQuery = goalsQuery.or(`profile_id.is.null,profile_id.eq.${profileFilter}`);
  }

  const [{ data: goals }, { data: profiles }] = await Promise.all([
    goalsQuery,
    supabase
      .from("profiles")
      .select("id, name")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  const profileOptions = profiles ?? [];
  const hasGoals = !!goals && goals.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Metas</h1>
          <p className="text-sm text-muted-foreground">Metas financeiras com progresso e previsão de conclusão.</p>
        </div>
        <GoalFormDialog profiles={profileOptions} />
      </div>

      {!hasGoals ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Target className="size-8" />
            <p>Nenhuma meta cadastrada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const targetAmount = Number(goal.target_amount);
            const currentAmount = Number(goal.current_amount);
            const monthlyContribution = goal.monthly_contribution !== null ? Number(goal.monthly_contribution) : null;
            const pct = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            const projection = projectGoalCompletion({
              targetAmount,
              currentAmount,
              monthlyContribution,
            });
            const status = goal.status as (typeof goalStatusOptions)[number];

            return (
              <Card key={goal.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{goal.name}</h3>
                      <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
                    </div>
                    {goal.description ? <p className="text-xs text-muted-foreground">{goal.description}</p> : null}
                    <p className="text-xs text-muted-foreground">
                      {goal.profiles?.name ?? "Familiar (todos)"}
                      {goal.target_date ? ` · prazo ${formatDate(goal.target_date)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <GoalFormDialog
                      goal={{
                        id: goal.id,
                        name: goal.name,
                        description: goal.description,
                        targetAmount,
                        currentAmount,
                        targetDate: goal.target_date,
                        monthlyContribution,
                        profileId: goal.profile_id,
                        status,
                      }}
                      profiles={profileOptions}
                    />
                    <DeleteGoalButton id={goal.id} name={goal.name} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{pct.toFixed(0)}% concluído</span>
                    <span className="tabular-nums">
                      <MoneyDisplay amount={currentAmount} /> de <MoneyDisplay amount={targetAmount} />
                    </span>
                  </div>
                  <Progress value={Math.min(100, pct)} />

                  <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                    {monthlyContribution ? (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Contribuição mensal</span>
                        <span className="tabular-nums">
                          <MoneyDisplay amount={monthlyContribution} />
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Previsão de conclusão</span>
                      <span className="font-medium text-foreground">
                        {projection.kind === "already_reached"
                          ? "Meta atingida"
                          : projection.kind === "no_contribution"
                            ? "Defina uma contribuição mensal"
                            : `${formatDate(projection.projectedDate)} (${projection.monthsRemaining} ${projection.monthsRemaining === 1 ? "mês" : "meses"})`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
