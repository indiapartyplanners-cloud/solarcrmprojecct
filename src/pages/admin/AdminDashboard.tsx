import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/StatsCard";
import {
  StageBadge,
  StatusBadge,
  stageLabels,
} from "@/components/StatusBadges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderKanban, Zap, ListTodo, Clock, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

const dealStageFlow = [
  "lead_created",
  "design_started",
  "proposal_approved",
  "contract_signed",
  "design_approved",
  "build_started",
  "closeout_delivered",
] as const;

const dealStageLabels: Record<string, string> = {
  lead_created: "Site Survey",
  design_started: "Design Started",
  proposal_approved: "Proposal Submitted",
  contract_signed: "Contract Signed",
  design_approved: "Procurement",
  build_started: "Installation",
  closeout_delivered: "Closeout Delivered",
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
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
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => !["closeout_delivered", "lead_created"].includes(p.stage),
  ).length;
  const tasksDue = tasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.due_date &&
      new Date(t.due_date) <= new Date(Date.now() + 7 * 86400000),
  ).length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  const stageGroups = projects.reduce((acc: Record<string, number>, p) => {
    acc[p.stage] = (acc[p.stage] || 0) + 1;
    return acc;
  }, {});

  const extraStages = Object.keys(stageGroups).filter(
    (stage) => !dealStageFlow.includes(stage as (typeof dealStageFlow)[number]),
  );
  const stageDisplayOrder = [...dealStageFlow, ...extraStages];

  const recentDeals = projects.slice(0, 5);
  const urgentTasks = tasks.filter((t) => t.status !== "completed").slice(0, 5);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sun className="h-8 w-8 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of all solar deals and operations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Deals"
          value={totalProjects}
          icon={FolderKanban}
          description="All time"
        />
        <StatsCard
          title="Active Deals"
          value={activeProjects}
          icon={Zap}
          description="Currently in progress"
        />
        <StatsCard
          title="Tasks Due (7d)"
          value={tasksDue}
          icon={Clock}
          description="Due within a week"
        />
        <StatsCard
          title="Completed Tasks"
          value={completedTasks}
          icon={ListTodo}
          description="All time"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stageDisplayOrder.map((key) => {
                const count = stageGroups[key] || 0;
                const pct =
                  totalProjects > 0 ? (count / totalProjects) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <StageBadge
                      stage={key}
                      label={dealStageLabels[key] || stageLabels[key] || key}
                    />
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono text-muted-foreground w-8 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Urgent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {urgentTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No urgent tasks</p>
            ) : (
              <div className="space-y-3">
                {urgentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(task as any).projects?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <StatusBadge status={task.status} />
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Recent Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Capacity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDeals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No deals yet
                  </TableCell>
                </TableRow>
              ) : (
                recentDeals.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>
                      {(project as any).clients?.name || "—"}
                    </TableCell>
                    <TableCell className="capitalize">
                      {project.project_type?.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <StageBadge stage={project.stage} />
                    </TableCell>
                    <TableCell>
                      {project.capacity_kw ? `${project.capacity_kw} kW` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
