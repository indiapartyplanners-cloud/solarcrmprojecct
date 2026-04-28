import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StageBadge, DocStateBadge } from "@/components/StatusBadges";
import {
  Eye,
  FolderKanban,
  FileText,
  CheckCircle,
  Package,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { generateCloseoutPackagePDF } from "@/utils/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { ProjectLifecycleStepper } from "@/components/ProjectLifecycleStepper";

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

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["customer-projects", user?.id],
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
    queryKey: ["customer-documents", user?.id],
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
    queryKey: ["customer-milestones", user?.id],
    queryFn: async () => {
      const projectIds = projects.map((p) => p.id);
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("milestones")
        .select("*, projects(name)")
        .in("project_id", projectIds)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: projects.length > 0,
  });

  const generateCloseoutPackage = async (project: (typeof projects)[0]) => {
    setGenerating(true);
    try {
      // Fetch additional data
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

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, "_")}_Closeout_Package.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Closeout package generated successfully" });
    } catch (error) {
      toast({ title: "Failed to generate package", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Eye className="h-8 w-8 text-primary" /> Client Portal
        </h1>
        <p className="text-muted-foreground mt-1">
          View your solar deal progress
        </p>
      </div>

      {projects.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No Deals Yet</h3>
            <p className="text-muted-foreground">
              Your deals will appear here once assigned.
            </p>
          </CardContent>
        </Card>
      ) : (
        projects.map((project) => {
          const stageIdx = stageOrder.indexOf(project.stage);
          const progress = ((stageIdx + 1) / stageOrder.length) * 100;
          const projectDocs = documents.filter(
            (d) => d.project_id === project.id,
          );
          const projectMilestones = milestones.filter(
            (m) => m.project_id === project.id,
          );

          return (
            <Card key={project.id} className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <StageBadge stage={project.stage} />
                    {project.stage === "closeout_delivered" && (
                      <Button
                        size="sm"
                        onClick={() => generateCloseoutPackage(project)}
                        disabled={generating}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {generating
                          ? "Generating..."
                          : "Download Closeout Package"}
                      </Button>
                    )}
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Deal Progress</span>
                    <span className="font-mono">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <ProjectLifecycleStepper currentStage={project.stage} />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">
                      {project.project_type?.replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="font-medium">
                      {project.capacity_kw ? `${project.capacity_kw} kW` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Start</p>
                    <p className="font-medium">{project.start_date || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-medium">
                      {project.target_completion || "—"}
                    </p>
                  </div>
                </div>

                {projectMilestones.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Milestones
                    </h4>
                    <div className="space-y-2">
                      {projectMilestones.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          <div
                            className={`w-3 h-3 rounded-full ${m.completed_at ? "bg-success" : "bg-muted-foreground/30"}`}
                          />
                          <span
                            className={`text-sm ${m.completed_at ? "line-through text-muted-foreground" : ""}`}
                          >
                            {m.name}
                          </span>
                          {m.due_date && (
                            <span className="text-xs text-muted-foreground ml-auto font-mono">
                              {m.due_date}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projectDocs.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Documents
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Version</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectDocs.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              {doc.name}
                            </TableCell>
                            <TableCell>
                              <DocStateBadge state={doc.state} />
                            </TableCell>
                            <TableCell className="font-mono">
                              v{doc.current_version}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

export default CustomerDashboard;
