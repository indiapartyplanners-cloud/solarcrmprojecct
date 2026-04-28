import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageBadge, StatusBadge } from "@/components/StatusBadges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Handshake,
  UserRoundPlus,
  FileCheck2,
  CalendarClock,
  TrendingUp,
  Gauge,
} from "lucide-react";

const salesStages = [
  "lead_created",
  "proposal_approved",
  "contract_signed",
] as const;

const SalesDashboard = () => {
  const { data: projects = [] } = useQuery({
    queryKey: ["sales-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["sales-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const now = Date.now();
  const next14Days = now + 14 * 24 * 60 * 60 * 1000;

  const safePct = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  const leadCount = projects.filter(
    (project) => project.stage === "lead_created",
  ).length;
  const proposalCount = projects.filter(
    (project) => project.stage === "proposal_approved",
  ).length;
  const contractCount = projects.filter(
    (project) => project.stage === "contract_signed",
  ).length;

  const handoffReadyCount = projects.filter((project) =>
    ["design_started", "design_approved", "build_started"].includes(
      project.stage,
    ),
  ).length;

  const allPipelineCount = leadCount + proposalCount + contractCount;
  const proposalWinRate = safePct(proposalCount, leadCount || 1);
  const contractWinRate = safePct(contractCount, proposalCount || 1);
  const overallLeadToContract = safePct(contractCount, leadCount || 1);

  const pipelineAgingDays = projects
    .filter((project) =>
      salesStages.includes(project.stage as (typeof salesStages)[number]),
    )
    .map((project) => {
      const createdAt = new Date(project.created_at).getTime();
      return Number.isFinite(createdAt)
        ? Math.floor((now - createdAt) / (24 * 60 * 60 * 1000))
        : 0;
    });

  const avgPipelineAgeDays = pipelineAgingDays.length
    ? Math.round(
        pipelineAgingDays.reduce((sum, age) => sum + age, 0) /
          pipelineAgingDays.length,
      )
    : 0;

  const stalePipelineCount = pipelineAgingDays.filter((age) => age > 30).length;

  const weightedForecastKw = projects
    .filter((project) =>
      salesStages.includes(project.stage as (typeof salesStages)[number]),
    )
    .reduce((sum, project) => {
      const capacity = Number(project.capacity_kw || 0);
      if (!capacity) return sum;
      const weight =
        project.stage === "lead_created"
          ? 0.2
          : project.stage === "proposal_approved"
            ? 0.55
            : 0.85;
      return sum + capacity * weight;
    }, 0);

  const upcomingFollowUps = tasks
    .filter((task) => {
      if (task.status === "completed" || !task.due_date) return false;
      const dueDate = new Date(task.due_date).getTime();
      return dueDate >= now && dueDate <= next14Days;
    })
    .slice(0, 8);

  const pipelineProjects = projects
    .filter((project) =>
      salesStages.includes(project.stage as (typeof salesStages)[number]),
    )
    .slice(0, 8);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Handshake className="h-8 w-8 text-primary" /> Sales Command Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Pipeline health, commitments, and pre-construction handoffs
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="New Leads"
          value={leadCount}
          icon={UserRoundPlus}
          description="Stage: Site Survey"
        />
        <StatsCard
          title="Proposals Submitted"
          value={proposalCount}
          icon={FileCheck2}
          description="Ready for commercial close"
        />
        <StatsCard
          title="Contracts Signed"
          value={contractCount}
          icon={TrendingUp}
          description="Won opportunities"
        />
        <StatsCard
          title="Weighted Forecast (kW)"
          value={weightedForecastKw.toFixed(1)}
          icon={Gauge}
          description="Probability-weighted pipeline"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lead → Proposal</span>
                <span className="font-semibold">{proposalWinRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${proposalWinRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Proposal → Contract
                </span>
                <span className="font-semibold">{contractWinRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-success"
                  style={{ width: `${contractWinRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lead → Contract</span>
                <span className="font-semibold">{overallLeadToContract}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-info"
                  style={{ width: `${overallLeadToContract}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Velocity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                Average Pipeline Age
              </p>
              <p className="text-2xl font-bold">{avgPipelineAgeDays} days</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                Stale Deals (&gt;30 days)
              </p>
              <p className="text-2xl font-bold">{stalePipelineCount}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                Ready for Delivery Handoff
              </p>
              <p className="text-2xl font-bold">{handoffReadyCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Commercial Throughput</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Pipeline Opportunities
              </span>
              <span className="font-semibold">{allPipelineCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Follow-ups Next 14 Days
              </span>
              <span className="font-semibold">{upcomingFollowUps.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Open Pipeline Capacity
              </span>
              <span className="font-semibold">
                {projects
                  .filter((project) =>
                    salesStages.includes(
                      project.stage as (typeof salesStages)[number],
                    ),
                  )
                  .reduce(
                    (sum, project) => sum + Number(project.capacity_kw || 0),
                    0,
                  )
                  .toFixed(1)}{" "}
                kW
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      No active sales pipeline deals
                    </TableCell>
                  </TableRow>
                ) : (
                  pipelineProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell>
                        {(project as any).clients?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <StageBadge stage={project.stage} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">
              Upcoming Follow-Ups (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming follow-up tasks due in the next two weeks.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingFollowUps.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-border/60 bg-muted/40 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(task as any).projects?.name || "No deal linked"}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={task.status} />
                      <p className="text-xs text-muted-foreground">
                        {task.due_date || "No due date"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesDashboard;
