import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  HardHat,
  ClipboardCheck,
  Camera,
  BookOpen,
  FolderKanban,
  Target,
  Timer,
} from "lucide-react";

const ExecutionDashboard = () => {
  const { user } = useAuth();

  const { data: assignments = [] } = useQuery({
    queryKey: ["execution-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_assignments")
        .select("*, projects(id, name, stage, project_type, capacity_kw)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["execution-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .eq("assigned_to", user!.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["execution-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("id, log_date")
        .eq("logged_by", user!.id)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["execution-photos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("id, created_at")
        .eq("uploaded_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const projects = assignments
    .map((assignment) => (assignment as any).projects)
    .filter(Boolean);
  const openTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");

  const completionRate = tasks.length
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  const onTimeCompletionCount = completedTasks.filter((task) => {
    if (!task.completed_at || !task.due_date) return false;
    return (
      new Date(task.completed_at).getTime() <= new Date(task.due_date).getTime()
    );
  }).length;

  const onTimeRate = completedTasks.length
    ? Math.round((onTimeCompletionCount / completedTasks.length) * 100)
    : 0;

  const recentLogDays = new Set(
    logs
      .filter(
        (log) =>
          new Date(log.log_date).getTime() >=
          Date.now() - 7 * 24 * 60 * 60 * 1000,
      )
      .map((log) => log.log_date),
  ).size;

  const evidencePerCompletedTask = completedTasks.length
    ? (photos.length / completedTasks.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HardHat className="h-8 w-8 text-primary" /> Execution Operations Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Field delivery workload, evidence capture, and completion rhythm
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Assigned Deals"
          value={projects.length}
          icon={FolderKanban}
          description="Current field scope"
        />
        <StatsCard
          title="Open Tasks"
          value={openTasks.length}
          icon={ClipboardCheck}
          description="Pending execution"
        />
        <StatsCard
          title="Daily Logs Submitted"
          value={logs.length}
          icon={BookOpen}
          description="Execution traceability"
        />
        <StatsCard
          title="Photos Uploaded"
          value={photos.length}
          icon={Camera}
          description="Progress evidence"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Assigned Deal Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-8"
                    >
                      No assigned deals
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project: any) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell>
                        <StageBadge stage={project.stage} />
                      </TableCell>
                      <TableCell>
                        {project.capacity_kw
                          ? `${project.capacity_kw} kW`
                          : "—"}
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
            <CardTitle className="text-lg">Task Readiness Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open execution tasks. Great work.
              </p>
            ) : (
              <div className="space-y-3">
                {openTasks.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-border/60 p-3 bg-muted/40 flex items-start justify-between gap-3"
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

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Execution Throughput</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg bg-muted/40 border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Completed Tasks</p>
              <p className="text-2xl font-bold mt-1">{completedTasks.length}</p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">In Progress Tasks</p>
              <p className="text-2xl font-bold mt-1">
                {tasks.filter((task) => task.status === "in_progress").length}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Last 7d Logs</p>
              <p className="text-2xl font-bold mt-1">
                {
                  logs.filter(
                    (log) =>
                      new Date(log.log_date).getTime() >=
                      Date.now() - 7 * 24 * 60 * 60 * 1000,
                  ).length
                }
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Last 7d Photos</p>
              <p className="text-2xl font-bold mt-1">
                {
                  photos.filter(
                    (photo) =>
                      new Date(photo.created_at).getTime() >=
                      Date.now() - 7 * 24 * 60 * 60 * 1000,
                  ).length
                }
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold mt-1">{completionRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Delivery Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Completed On Time
              </span>
              <span className="font-semibold">{onTimeCompletionCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                On-Time Rate
              </span>
              <span className="font-semibold">{onTimeRate}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              Based on completed tasks with due dates
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Daily Productivity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Active Log Days (7d)
              </span>
              <span className="font-semibold">{recentLogDays} / 7</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Evidence / Completed Task
              </span>
              <span className="font-semibold">{evidencePerCompletedTask}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              Tracks consistency and photo evidence density
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Backlog Pressure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">Open Tasks</span>
              <span className="font-semibold">{openTasks.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Overdue Open Tasks
              </span>
              <span className="font-semibold text-destructive">
                {
                  openTasks.filter((task) => {
                    if (!task.due_date) return false;
                    return new Date(task.due_date).getTime() < Date.now();
                  }).length
                }
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Projects In Build
              </span>
              <span className="font-semibold">
                {
                  projects.filter(
                    (project: any) => project.stage === "build_started",
                  ).length
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExecutionDashboard;
