import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StageBadge,
  DocStateBadge,
  StatusBadge,
} from "@/components/StatusBadges";
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
  FileSearch,
  GitBranchPlus,
  AlertTriangle,
  FolderKanban,
} from "lucide-react";

const EngineerDashboard = () => {
  const { user } = useAuth();

  const { data: assignments = [] } = useQuery({
    queryKey: ["engineering-assignments", user?.id],
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

  const projectIds = assignments
    .map((assignment) => (assignment as any).projects?.id)
    .filter(Boolean);

  const { data: tasks = [] } = useQuery({
    queryKey: ["engineering-tasks", user?.id],
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

  const { data: documents = [] } = useQuery({
    queryKey: ["engineering-documents", user?.id],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .in("project_id", projectIds)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && projectIds.length > 0,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["engineering-milestones", user?.id],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("milestones")
        .select("*, projects(name)")
        .in("project_id", projectIds)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && projectIds.length > 0,
  });

  const projects = assignments
    .map((assignment) => (assignment as any).projects)
    .filter(Boolean);

  const designPhaseProjects = projects.filter((project: any) =>
    ["design_started", "design_approved"].includes(project.stage),
  ).length;

  const docsInReview = documents.filter(
    (document) => document.state === "in_review",
  ).length;

  const technicalBlockers = tasks.filter(
    (task) =>
      task.status === "rejected" ||
      (task.status !== "completed" && Number(task.priority || 0) >= 4),
  ).length;

  const milestoneDueSoon = milestones.filter((milestone) => {
    if (!milestone.due_date || milestone.completed_at) return false;
    const due = new Date(milestone.due_date).getTime();
    return due >= Date.now() && due <= Date.now() + 7 * 24 * 60 * 60 * 1000;
  }).length;

  const reviewQueue = documents
    .filter((document) => ["draft", "in_review"].includes(document.state))
    .slice(0, 8);

  const openEngineeringTasks = tasks
    .filter((task) => task.status !== "completed")
    .slice(0, 8);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HardHat className="h-8 w-8 text-primary" /> Engineering Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Technical design control, review backlog, and engineering risk
          visibility
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Design-Phase Deals"
          value={designPhaseProjects}
          icon={FolderKanban}
          description="Design started / approved"
        />
        <StatsCard
          title="Docs In Review"
          value={docsInReview}
          icon={FileSearch}
          description="Requires technical validation"
        />
        <StatsCard
          title="Milestones Due (7d)"
          value={milestoneDueSoon}
          icon={GitBranchPlus}
          description="Upcoming engineering commitments"
        />
        <StatsCard
          title="Technical Blockers"
          value={technicalBlockers}
          icon={AlertTriangle}
          description="High-priority or rejected work"
        />
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Assigned Deal Design Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Capacity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    No assigned engineering deals
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project: any) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Technical Review Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No draft/in-review documents pending engineering review.
              </p>
            ) : (
              <div className="space-y-3">
                {reviewQueue.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-lg border border-border/60 bg-muted/40 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {document.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Version {document.current_version}
                      </p>
                    </div>
                    <DocStateBadge state={document.state} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Engineering Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            {openEngineeringTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open engineering tasks.
              </p>
            ) : (
              <div className="space-y-3">
                {openEngineeringTasks.map((task) => (
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

export default EngineerDashboard;
