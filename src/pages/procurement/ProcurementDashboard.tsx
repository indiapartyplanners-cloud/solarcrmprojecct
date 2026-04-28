import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocStateBadge, StatusBadge } from "@/components/StatusBadges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  FileCheck,
  FileClock,
  AlertTriangle,
  ClipboardList,
  Timer,
  ShieldAlert,
} from "lucide-react";

const procurementKeywords = [
  "procure",
  "purchase",
  "vendor",
  "supply",
  "material",
  "po",
];

const ProcurementDashboard = () => {
  const { data: tasks = [] } = useQuery({
    queryKey: ["procurement-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["procurement-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, projects(name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["procurement-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, stage")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const scopedTasks = tasks.filter((task) => {
    const haystack =
      `${task.title || ""} ${task.description || ""}`.toLowerCase();
    return procurementKeywords.some((keyword) => haystack.includes(keyword));
  });

  const openProcurementTasks = scopedTasks.filter(
    (task) => task.status !== "completed",
  );

  const taskAgeInDays = (isoDate?: string | null) => {
    if (!isoDate) return 0;
    const timestamp = new Date(isoDate).getTime();
    if (!Number.isFinite(timestamp)) return 0;
    return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
  };

  const avgOpenTaskAge = openProcurementTasks.length
    ? Math.round(
        openProcurementTasks.reduce(
          (sum, task) => sum + taskAgeInDays(task.created_at),
          0,
        ) / openProcurementTasks.length,
      )
    : 0;

  const agingBuckets = {
    fresh: openProcurementTasks.filter(
      (task) => taskAgeInDays(task.created_at) <= 7,
    ).length,
    warning: openProcurementTasks.filter((task) => {
      const age = taskAgeInDays(task.created_at);
      return age > 7 && age <= 21;
    }).length,
    stale: openProcurementTasks.filter(
      (task) => taskAgeInDays(task.created_at) > 21,
    ).length,
  };

  const overdueTasks = openProcurementTasks.filter((task) => {
    if (!task.due_date) return false;
    return new Date(task.due_date).getTime() < Date.now();
  });

  const dueThisWeek = openProcurementTasks.filter((task) => {
    if (!task.due_date) return false;
    const due = new Date(task.due_date).getTime();
    return due >= Date.now() && due <= Date.now() + 7 * 24 * 60 * 60 * 1000;
  }).length;

  const pendingReviewDocs = documents.filter((document) =>
    ["draft", "in_review"].includes(document.state),
  );
  const afcDocs = documents.filter((document) => document.state === "afc");

  const reviewSlaBreaches = pendingReviewDocs.filter(
    (document) =>
      taskAgeInDays(document.updated_at || document.created_at) > 10,
  ).length;

  const buildPhaseProjects = projects.filter((project) =>
    ["design_approved", "build_started"].includes(project.stage),
  );

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" /> Procurement Control
          Tower
        </h1>
        <p className="text-muted-foreground mt-1">
          Material readiness, documentation queue, and vendor-critical actions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Open Procurement Tasks"
          value={openProcurementTasks.length}
          icon={ClipboardList}
          description="Sourcing and logistics work"
        />
        <StatsCard
          title="Overdue Procurement Tasks"
          value={overdueTasks.length}
          icon={AlertTriangle}
          description="Requires immediate action"
        />
        <StatsCard
          title="Docs Pending Review"
          value={pendingReviewDocs.length}
          icon={FileClock}
          description="Draft / in-review docs"
        />
        <StatsCard
          title="AFC Documents"
          value={afcDocs.length}
          icon={FileCheck}
          description="Approved for construction"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">PO Aging View</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">0-7 days</span>
              <span className="font-semibold">{agingBuckets.fresh}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">8-21 days</span>
              <span className="font-semibold">{agingBuckets.warning}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">21+ days</span>
              <span className="font-semibold text-destructive">
                {agingBuckets.stale}
              </span>
            </div>
            <div className="pt-1 text-xs text-muted-foreground">
              Average open-task age:{" "}
              <span className="font-semibold text-foreground">
                {avgOpenTaskAge} days
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Review SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Pending Reviews
              </span>
              <span className="font-semibold">{pendingReviewDocs.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                SLA Breaches (&gt;10 days)
              </span>
              <span className="font-semibold text-destructive">
                {reviewSlaBreaches}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              SLA window measured from latest document update date
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Expedite Radar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Overdue Tasks
              </span>
              <span className="font-semibold text-destructive">
                {overdueTasks.length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Due This Week
              </span>
              <span className="font-semibold">{dueThisWeek}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Build-Window Deals
              </span>
              <span className="font-semibold">{buildPhaseProjects.length}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" />
              Focus expedite actions on overdue + due-this-week items
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Priority Material Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {openProcurementTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No procurement-specific open tasks detected.
              </p>
            ) : (
              <div className="space-y-3">
                {openProcurementTasks.slice(0, 8).map((task) => (
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

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Document Control Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReviewDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending procurement-related documents.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Deal</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReviewDocs.slice(0, 8).map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        {document.name}
                      </TableCell>
                      <TableCell>
                        {(document as any).projects?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <DocStateBadge state={document.state} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Deals Entering Build Window</CardTitle>
        </CardHeader>
        <CardContent>
          {buildPhaseProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No deals currently in design-approved/build-started stages.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {buildPhaseProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-lg border border-border/60 bg-muted/40 p-3"
                >
                  <p className="text-sm font-semibold truncate">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    Stage: {project.stage.replace("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementDashboard;
