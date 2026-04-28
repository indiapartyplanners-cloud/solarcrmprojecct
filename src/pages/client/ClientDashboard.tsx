import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageBadge, DocStateBadge } from "@/components/StatusBadges";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ProjectLifecycleStepper } from "@/components/ProjectLifecycleStepper";
import { generateCloseoutPackagePDF } from "@/utils/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  FolderKanban,
  FileText,
  CheckCircle2,
  Package,
  AlertTriangle,
  Clock3,
} from "lucide-react";

const stageOrder = [
  "lead_created",
  "proposal_approved",
  "contract_signed",
  "design_started",
  "design_approved",
  "build_started",
  "qa_passed",
  "commissioned",
  "closeout_delivered",
];

const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generatingProjectId, setGeneratingProjectId] = useState<string | null>(
    null,
  );

  const { data: projects = [] } = useQuery({
    queryKey: ["client-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["client-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, projects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["client-milestones", user?.id],
    queryFn: async () => {
      const projectIds = projects.map((project) => project.id);
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .in("project_id", projectIds)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: projects.length > 0,
  });

  const deliveredCount = projects.filter(
    (project) => project.stage === "closeout_delivered",
  ).length;
  const activeCount = projects.filter(
    (project) => project.stage !== "closeout_delivered",
  ).length;
  const afcDocs = documents.filter(
    (document) => document.state === "afc",
  ).length;
  const asBuiltDocs = documents.filter(
    (document) => document.state === "as_built",
  ).length;

  const docsInReview = documents.filter(
    (document) => document.state === "in_review",
  ).length;

  const completedMilestones = milestones.filter(
    (milestone) => !!milestone.completed_at,
  ).length;
  const milestoneCompletionPct = milestones.length
    ? Math.round((completedMilestones / milestones.length) * 100)
    : 0;

  const scheduleRiskProjects = projects.filter((project) => {
    if (!project.target_completion) return false;
    const target = new Date(project.target_completion).getTime();
    return (
      Number.isFinite(target) &&
      target < Date.now() &&
      project.stage !== "closeout_delivered"
    );
  }).length;

  const getProjectLastUpdate = (projectId: string) => {
    const docUpdates = documents
      .filter((document) => document.project_id === projectId)
      .map((document) =>
        new Date(document.updated_at || document.created_at).getTime(),
      )
      .filter((time) => Number.isFinite(time));

    const milestoneUpdates = milestones
      .filter((milestone) => milestone.project_id === projectId)
      .map((milestone: any) =>
        new Date(milestone.updated_at || milestone.created_at).getTime(),
      )
      .filter((time) => Number.isFinite(time));

    const allUpdates = [...docUpdates, ...milestoneUpdates];
    if (allUpdates.length === 0) return null;
    return Math.max(...allUpdates);
  };

  const getSlaStatus = (projectId: string) => {
    const lastUpdate = getProjectLastUpdate(projectId);
    if (!lastUpdate)
      return { label: "No updates", tone: "text-muted-foreground" };
    const days = Math.floor((Date.now() - lastUpdate) / (24 * 60 * 60 * 1000));
    if (days <= 3)
      return { label: `Updated ${days}d ago`, tone: "text-success" };
    if (days <= 7)
      return { label: `Updated ${days}d ago`, tone: "text-warning" };
    return { label: `Updated ${days}d ago`, tone: "text-destructive" };
  };

  const generateCloseoutPackage = async (project: any) => {
    setGeneratingProjectId(project.id);

    try {
      const [clientRes, siteRes, docsRes, milestonesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", project.client_id)
          .single(),
        supabase.from("sites").select("*").eq("id", project.site_id).single(),
        supabase.from("documents").select("*").eq("project_id", project.id),
        supabase.from("milestones").select("*").eq("project_id", project.id),
      ]);

      const [photosRes, taskPhotosRes] = await Promise.all([
        supabase
          .from("photos")
          .select("caption, created_at, file_path")
          .eq("project_id", project.id),
        supabase
          .from("task_photos")
          .select("caption, uploaded_at, file_path")
          .eq("project_id", project.id),
      ]);

      if (photosRes.error) throw photosRes.error;
      if (taskPhotosRes.error) throw taskPhotosRes.error;

      const photoEvidence = [
        ...(photosRes.data || []).map((photo) => ({
          caption: photo.caption,
          created_at: photo.created_at,
          file_path: photo.file_path,
        })),
        ...(taskPhotosRes.data || []).map((photo) => ({
          caption: photo.caption,
          created_at: photo.uploaded_at,
          file_path: photo.file_path,
        })),
      ];

      const pdfBlob = await generateCloseoutPackagePDF({
        project,
        client: clientRes.data || undefined,
        site: siteRes.data || undefined,
        documents: docsRes.data || [],
        milestones: milestonesRes.data || [],
        photoEvidence,
      });

      const url = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.name.replace(/\s+/g, "_")}_Closeout_Package.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast({ title: "Closeout package downloaded" });
    } catch (error) {
      toast({ title: "Failed to generate package", variant: "destructive" });
    } finally {
      setGeneratingProjectId(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Eye className="h-8 w-8 text-primary" /> Client Experience Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Transparent delivery tracking, documents, and closeout readiness
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Active Deals"
          value={activeCount}
          icon={FolderKanban}
          description="In delivery lifecycle"
        />
        <StatsCard
          title="Delivered Deals"
          value={deliveredCount}
          icon={CheckCircle2}
          description="Closeout delivered"
        />
        <StatsCard
          title="AFC Documents"
          value={afcDocs}
          icon={FileText}
          description="Approved for construction"
        />
        <StatsCard
          title="SLA Review Queue"
          value={docsInReview}
          icon={Clock3}
          description="Documents under review"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Milestone SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Completed Milestones
              </span>
              <span className="font-semibold">{completedMilestones}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                Completion Ratio
              </span>
              <span className="font-semibold">{milestoneCompletionPct}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Schedule Risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                At-Risk Deals
              </span>
              <span className="font-semibold text-destructive">
                {scheduleRiskProjects}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                As-Built Documents
              </span>
              <span className="font-semibold">{asBuiltDocs}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              Deals past target completion and not yet delivered
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Client Update Freshness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.slice(0, 5).map((project) => {
              const status = getSlaStatus(project.id);
              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3"
                >
                  <span className="text-sm font-medium truncate pr-2">
                    {project.name}
                  </span>
                  <span className={`text-xs ${status.tone}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {projects.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Assigned Deals</h3>
            <p className="text-sm text-muted-foreground">
              Your deal portfolio will appear here when assigned by your
              delivery team.
            </p>
          </CardContent>
        </Card>
      ) : (
        projects.map((project) => {
          const stageIndex = stageOrder.indexOf(project.stage);
          const progress =
            ((Math.max(stageIndex, 0) + 1) / stageOrder.length) * 100;
          const projectDocs = documents.filter(
            (document) => document.project_id === project.id,
          );
          const projectMilestones = milestones.filter(
            (milestone) => milestone.project_id === project.id,
          );

          return (
            <Card key={project.id} className="border-border/60">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StageBadge stage={project.stage} />
                    {project.stage === "closeout_delivered" && (
                      <Button
                        size="sm"
                        onClick={() => generateCloseoutPackage(project)}
                        disabled={generatingProjectId === project.id}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {generatingProjectId === project.id
                          ? "Generating..."
                          : "Download Closeout"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      Delivery Progress
                    </span>
                    <span className="font-mono">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <ProjectLifecycleStepper currentStage={project.stage} />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">System Type</p>
                    <p className="font-medium capitalize">
                      {project.project_type?.replace("_", " ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="font-medium">
                      {project.capacity_kw ? `${project.capacity_kw} kW` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Start Date</p>
                    <p className="font-medium">{project.start_date || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target Completion</p>
                    <p className="font-medium">
                      {project.target_completion || "—"}
                    </p>
                  </div>
                </div>

                {projectMilestones.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3">
                      Milestone Progress
                    </h4>
                    <div className="space-y-2">
                      {projectMilestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className="rounded-lg bg-muted/40 border border-border/60 p-3 flex items-center gap-3"
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${milestone.completed_at ? "bg-success" : "bg-muted-foreground/40"}`}
                          />
                          <span
                            className={`text-sm ${milestone.completed_at ? "line-through text-muted-foreground" : ""}`}
                          >
                            {milestone.name}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {milestone.due_date || "No due date"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projectDocs.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3">
                      Document Status
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {projectDocs.map((document) => (
                        <div
                          key={document.id}
                          className="rounded-lg border border-border/60 bg-muted/40 p-3"
                        >
                          <p className="text-sm font-medium truncate">
                            {document.name}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <DocStateBadge state={document.state} />
                            <span className="text-xs text-muted-foreground">
                              v{document.current_version}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default ClientDashboard;
