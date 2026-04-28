import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StageBadge, stageLabels } from "@/components/StatusBadges";
import {
  Plus,
  FolderKanban,
  Search,
  FolderOpen,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Rows3,
  LayoutGrid,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";

const projectTypes = [
  { value: "rooftop", label: "Rooftop" },
  { value: "ground_mount", label: "Ground Mount" },
  { value: "carport", label: "Carport" },
];

const stages = Object.entries(stageLabels).map(([value, label]) => ({
  value,
  label,
}));

const dealCardStageLabels: Record<string, string> = {
  lead_created: "Site Survey",
  design_started: "Design Started",
  proposal_approved: "Proposal Submitted",
  contract_signed: "Contract Signed",
  design_approved: "Procurement",
  build_started: "Installation",
  qa_passed: "HR",
  commissioned: "PV Monitor",
  closeout_delivered: "Closeout Delivered",
};

const dealWorkflowStages = [
  { value: "lead_created", label: "Site Survey" },
  { value: "design_started", label: "Design Started" },
  { value: "proposal_approved", label: "Proposal Submitted" },
  { value: "contract_signed", label: "Contract Signed" },
  { value: "design_approved", label: "Procurement" },
  { value: "build_started", label: "Installation" },
  { value: "closeout_delivered", label: "Closeout Delivered" },
] as const;

const AdminProjects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showNewOrganization, setShowNewOrganization] = useState(false);
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [newOrganizationAddress, setNewOrganizationAddress] = useState("");
  const [newOrganizationPhone, setNewOrganizationPhone] = useState("");
  const [newOrganizationEmail, setNewOrganizationEmail] = useState("");
  const [showNewSite, setShowNewSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [newSiteClientId, setNewSiteClientId] = useState("");
  const [newSiteLatitude, setNewSiteLatitude] = useState("");
  const [newSiteLongitude, setNewSiteLongitude] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    project_type: "rooftop" as string,
    stage: "lead_created" as string,
    capacity_kw: "",
    estimated_cost: "",
    start_date: "",
    target_completion: "",
    organization_id: "",
    site_id: "",
    client_id: "",
    engineer_id: "",
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      // Fetch all users with client-access role
      const { data: userRoles, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["client", "customer"]);
      if (roleError) throw roleError;
      if (!userRoles || userRoles.length === 0) return [];

      const userIds = userRoles.map((ur) => ur.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds)
        .order("full_name");
      if (profileError) throw profileError;

      return (profiles || []).map((p) => ({
        user_id: p.user_id,
        name: p.full_name || p.email || "Unknown Customer",
        email: p.email,
      }));
    },
  });

  const { data: engineers = [] } = useQuery({
    queryKey: ["engineers-list"],
    queryFn: async () => {
      const { data: userRoles, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["engineering", "execution", "engineer"]);
      if (roleError) throw roleError;
      if (!userRoles || userRoles.length === 0) return [];

      const userIds = userRoles.map((ur) => ur.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds)
        .order("full_name");
      if (profileError) throw profileError;
      return profiles;
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createOrganization = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          name: newOrganizationName.trim(),
          address: newOrganizationAddress.trim() || null,
          phone: newOrganizationPhone.trim() || null,
          email: newOrganizationEmail.trim() || null,
        })
        .select("id, name")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (organization) => {
      queryClient.invalidateQueries({ queryKey: ["organizations-list"] });
      setForm((f) => ({ ...f, organization_id: organization.id }));
      setNewOrganizationName("");
      setNewOrganizationAddress("");
      setNewOrganizationPhone("");
      setNewOrganizationEmail("");
      setShowNewOrganization(false);
      toast({ title: "Organization created" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createSite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .insert({
          name: newSiteName.trim(),
          address: newSiteAddress.trim() || null,
          client_id: newSiteClientId,
          latitude: newSiteLatitude ? parseFloat(newSiteLatitude) : null,
          longitude: newSiteLongitude ? parseFloat(newSiteLongitude) : null,
        })
        .select("id, name")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (site) => {
      queryClient.invalidateQueries({ queryKey: ["sites-list"] });
      setForm((f) => ({ ...f, site_id: site.id }));
      setNewSiteName("");
      setNewSiteAddress("");
      setNewSiteClientId("");
      setNewSiteLatitude("");
      setNewSiteLongitude("");
      setShowNewSite(false);
      toast({ title: "Site created" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createProject = useMutation({
    mutationFn: async () => {
      try {
        // Resolve clients.id securely on the backend, bypassing any JS cache bugs
        let resolvedClientId: string | null = null;
        if (form.client_id && form.client_id !== "none") {
          // Use .limit(1) to prevent "multiple rows returned" errors if duplicate clients exist
          const { data: existingClient, error: existError } = await supabase
            .from("clients")
            .select("id")
            .eq("user_id", form.client_id)
            .limit(1)
            .maybeSingle();

          if (existError) {
            console.error("Error fetching client by user_id:", existError);
            throw new Error(`DB Error on client lookup: ${existError.message}`);
          }

          if (existingClient?.id) {
            resolvedClientId = existingClient.id;
          } else {
            // Auto-create missing client record for this customer
            const selectedCustomer = customers.find(
              (c) => c.user_id === form.client_id,
            );
            const { data: newClient, error: clientError } = await supabase
              .from("clients")
              .insert({
                name: selectedCustomer?.name || "Customer",
                email: selectedCustomer?.email || null,
                user_id: form.client_id,
              })
              .select("id")
              .single();

            if (clientError) {
              console.error("Error inserting new client:", clientError);
              throw new Error(
                `DB Error creating client profile: ${clientError.message}`,
              );
            }
            resolvedClientId = newClient.id;
          }
        }

        // VERIFICATION PRE-FLIGHT
        if (resolvedClientId) {
          const { data: sanityCheck, error: sanityError } = await supabase
            .from("clients")
            .select("id, user_id")
            .eq("id", resolvedClientId)
            .maybeSingle();

          if (!sanityCheck) {
            console.error(
              "PRE-FLIGHT FAILED: The resolved client ID does not exist in the clients table!",
              {
                resolvedClientId,
                sanityError,
              },
            );
            throw new Error(
              `CRITICAL BUG: Client ID ${resolvedClientId} vanished before project insert! Supabase glitch?`,
            );
          }
          console.log("PRE-FLIGHT PASSED: Client exists.", sanityCheck);
        }

        const projectPayload = {
          name: form.name,
          description: form.description || null,
          project_type: form.project_type as any,
          stage: form.stage as any,
          capacity_kw: form.capacity_kw ? parseFloat(form.capacity_kw) : null,
          estimated_cost: form.estimated_cost
            ? parseFloat(form.estimated_cost)
            : null,
          start_date: form.start_date || null,
          target_completion: form.target_completion || null,
          organization_id: form.organization_id || null,
          site_id: form.site_id || null,
          client_id: resolvedClientId || null, // ensure empty string becomes null
          created_by: user?.id,
        };

        console.log("Inserting project payload:", projectPayload);

        const { data: project, error: projectError } = await supabase
          .from("projects")
          .insert(projectPayload)
          .select()
          .single();

        if (projectError) {
          console.error("Error inserting project:", projectError);
          // Append the resolved client_id to the error message so the UI toast shows us EXACTLY what was sent!
          throw new Error(
            `Project Insert Failed: ${projectError.message}. [Debug payload_client_id: ${resolvedClientId || "null"}]`,
          );
        }

        // Assign engineer if selected
        if (form.engineer_id && form.engineer_id !== "none" && project) {
          const { error: assignError } = await supabase
            .from("project_assignments")
            .insert({
              project_id: project.id,
              user_id: form.engineer_id,
              role: "engineering",
            });
          if (assignError) {
            console.error("Error assigning engineer:", assignError);
            throw new Error(
              `Project created but engineer attach failed: ${assignError.message}`,
            );
          }
        }

        return project;
      } catch (err: any) {
        console.error("Create project top-level catch:", err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setForm({
        name: "",
        description: "",
        project_type: "rooftop",
        stage: "lead_created",
        capacity_kw: "",
        estimated_cost: "",
        start_date: "",
        target_completion: "",
        organization_id: "",
        site_id: "",
        client_id: "",
        engineer_id: "",
      });
      setShowNewOrganization(false);
      setShowNewSite(false);
      setNewOrganizationName("");
      setNewOrganizationAddress("");
      setNewOrganizationPhone("");
      setNewOrganizationEmail("");
      setNewSiteName("");
      setNewSiteAddress("");
      setNewSiteClientId("");
      setNewSiteLatitude("");
      setNewSiteLongitude("");
      toast({ title: "Project created" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStage = filterStage === "all" || p.stage === filterStage;
    return matchSearch && matchStage;
  });

  const formatDate = (value?: string | null) => {
    if (!value) return "No target date";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
  };

  const getTypeLabel = (type?: string | null) =>
    type ? type.replace("_", " ") : "Unspecified";

  const hash = (value: string) =>
    value.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const getInstallationScore = (stage: string) => {
    const progress = getProgress(stage);
    // Keep a minimum visible score while still reflecting real stage progress.
    return Math.max(5, progress);
  };

  const getTrend = (project: any) => {
    const delta = (hash(project.name) % 21) - 10;
    const pct = 28 + Math.abs(delta) * 3;
    return { up: delta >= 0, pct };
  };

  const getPeopleCount = (project: any) => 2 + (hash(project.id) % 6);

  const getProgress = (stage: string) => {
    const idx = stages.findIndex((s) => s.value === stage);
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / stages.length) * 100);
  };

  const getScoreState = (score: number) => {
    if (score >= 75)
      return {
        label: "Good",
        color: "#31B36B",
        textClass: "text-[#31B36B]",
      };
    if (score >= 55)
      return {
        label: "Medium",
        color: "#E5A521",
        textClass: "text-[#E5A521]",
      };
    return { label: "Low", color: "#E34B6B", textClass: "text-[#E34B6B]" };
  };

  const getSparklinePoints = (project: any, up: boolean) => {
    const seed = hash(`${project.id}-${project.stage}`);
    const points = Array.from({ length: 7 }, (_, i) => {
      const x = i * 16;
      const wave = Math.sin((seed + i) * 0.9) * 3.5;
      const slope = up ? -i * 0.7 : i * 0.7;
      const y = Math.min(22, Math.max(4, 12 + wave + slope));
      return `${x},${y.toFixed(1)}`;
    });
    return points.join(" ");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() || "")
      .join("") || "D";

  const stageCount = (stage: string) =>
    projects.filter((p) => p.stage === stage).length;

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        Loading projects...
      </div>
    );

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FolderKanban className="h-8 w-8 text-primary" /> Deals
          </h1>
          <p className="text-muted-foreground mt-1">
            {projects.length} total deals
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProject.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.project_type}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, project_type: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select
                    value={form.stage}
                    onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacity (kW)</Label>
                  <Input
                    type="number"
                    value={form.capacity_kw}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, capacity_kw: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Cost ($)</Label>
                  <Input
                    type="number"
                    value={form.estimated_cost}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, estimated_cost: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Completion</Label>
                  <Input
                    type="date"
                    value={form.target_completion}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        target_completion: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client (Customer User)</Label>
                  <Select
                    value={form.client_id || "none"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        client_id: v === "none" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.user_id} value={c.user_id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign Engineer</Label>
                  <Select
                    value={form.engineer_id || "none"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        engineer_id: v === "none" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select engineer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {engineers.map((e) => (
                        <SelectItem key={e.user_id} value={e.user_id}>
                          {e.full_name || e.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Organization</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowNewOrganization((prev) => !prev)}
                    >
                      {showNewOrganization ? "Cancel" : "+ New"}
                    </Button>
                  </div>
                  <Select
                    value={form.organization_id || "none"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        organization_id: v === "none" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showNewOrganization ? (
                    <div className="space-y-2 rounded-md border border-border/70 p-2">
                      <Input
                        value={newOrganizationName}
                        onChange={(e) => setNewOrganizationName(e.target.value)}
                        placeholder="Organization name"
                      />
                      <Input
                        value={newOrganizationAddress}
                        onChange={(e) =>
                          setNewOrganizationAddress(e.target.value)
                        }
                        placeholder="Address"
                      />
                      <Input
                        value={newOrganizationPhone}
                        onChange={(e) => setNewOrganizationPhone(e.target.value)}
                        placeholder="Phone"
                      />
                      <Input
                        type="email"
                        value={newOrganizationEmail}
                        onChange={(e) => setNewOrganizationEmail(e.target.value)}
                        placeholder="Email"
                      />
                      <Button
                        type="button"
                        className="h-8 w-full"
                        disabled={
                          createOrganization.isPending ||
                          !newOrganizationName.trim()
                        }
                        onClick={() => createOrganization.mutate()}
                      >
                        {createOrganization.isPending
                          ? "Saving..."
                          : "Create Organization"}
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Site</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowNewSite((prev) => !prev)}
                    >
                      {showNewSite ? "Cancel" : "+ New"}
                    </Button>
                  </div>
                  <Select
                    value={form.site_id || "none"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, site_id: v === "none" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showNewSite ? (
                    <div className="space-y-2 rounded-md border border-border/70 p-2">
                      <Input
                        value={newSiteName}
                        onChange={(e) => setNewSiteName(e.target.value)}
                        placeholder="Site name"
                      />
                      <Input
                        value={newSiteAddress}
                        onChange={(e) => setNewSiteAddress(e.target.value)}
                        placeholder="Site address"
                      />
                      <Select
                        value={newSiteClientId || "none"}
                        onValueChange={(v) =>
                          setNewSiteClientId(v === "none" ? "" : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select client</SelectItem>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          step="any"
                          value={newSiteLatitude}
                          onChange={(e) => setNewSiteLatitude(e.target.value)}
                          placeholder="Latitude (optional)"
                        />
                        <Input
                          type="number"
                          step="any"
                          value={newSiteLongitude}
                          onChange={(e) => setNewSiteLongitude(e.target.value)}
                          placeholder="Longitude (optional)"
                        />
                      </div>
                      <Button
                        type="button"
                        className="h-8 w-full"
                        disabled={
                          createSite.isPending ||
                          !newSiteName.trim() ||
                          !newSiteAddress.trim() ||
                          !newSiteClientId
                        }
                        onClick={() => createSite.mutate()}
                      >
                        {createSite.isPending ? "Saving..." : "Create Site"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createProject.isPending}
              >
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === "list"
                  ? "bg-[#5B5FE8] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Rows3 className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                viewMode === "grid"
                  ? "bg-[#5B5FE8] text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
          </div>

          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {dealWorkflowStages.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterStage("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            filterStage === "all"
              ? "border-[#5B5FE8]/40 bg-[#5B5FE8]/10 text-[#5B5FE8]"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({projects.length})
        </button>
        {dealWorkflowStages.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setFilterStage(s.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filterStage === s.value
                ? "border-[#5B5FE8]/40 bg-[#5B5FE8]/10 text-[#5B5FE8]"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label} ({stageCount(s.value)})
          </button>
        ))}
      </div>

      <Card className="overflow-hidden border-[#E5EAF5] bg-[#F4F7FD]">
        <CardHeader className="border-b border-[#E5EAF5] bg-transparent">
          <CardTitle className="text-lg">Deal Pipeline</CardTitle>
          <p className="text-sm text-[#697086]">
            {filtered.length} of {projects.length} deals visible
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No deals found"
              description="Create your first deal to get started or adjust your search filters"
              actionLabel="Create Deal"
              onAction={() => setOpen(true)}
            />
          ) : (
            <div
              className={
                viewMode === "list"
                  ? "space-y-3"
                  : "grid gap-3 sm:grid-cols-2 2xl:grid-cols-3"
              }
            >
              {filtered.map((project) =>
                (() => {
                  const score = getInstallationScore(project.stage);
                  const scoreState = getScoreState(score);
                  const trend = getTrend(project);
                  const people = getPeopleCount(project);
                  const progress = getProgress(project.stage);
                  const stageIndicatorColor =
                    score >= 75
                      ? "#31B36B"
                      : score >= 55
                        ? "#E5A521"
                        : "#E34B6B";
                  const filledSegments = Math.max(
                    1,
                    Math.round((progress / 100) * 7),
                  );

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => navigate(`/admin/projects/${project.id}`)}
                      className="group w-full rounded-2xl border border-[#E6EBF5] bg-white px-4 py-3 text-left shadow-[0_1px_0_#edf1f7] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C8D2EB] hover:shadow-[0_8px_22px_rgba(42,63,120,0.12)]"
                    >
                      <div
                        className={
                          viewMode === "list"
                            ? "flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-5"
                            : "grid gap-4 sm:grid-cols-2"
                        }
                      >
                        <div
                          className={`flex min-w-0 items-start gap-3 ${
                            viewMode === "list" ? "xl:w-[32%]" : ""
                          }`}
                        >
                          <div
                            className="mt-0.5 rounded-md p-1.5"
                            style={{
                              border: `1px solid ${stageIndicatorColor}33`,
                              backgroundColor: `${stageIndicatorColor}14`,
                            }}
                          >
                            <FolderKanban
                              className="h-4 w-4"
                              style={{ color: stageIndicatorColor }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-[#1E2540]">
                              {project.name}
                            </p>
                            <p className="mt-1 inline-flex rounded-md bg-[#EEF2FA] px-2 py-0.5 text-xs text-[#5C6785] capitalize">
                              {getTypeLabel(project.project_type)}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`items-center ${
                            viewMode === "list"
                              ? "hidden xl:flex xl:w-[14%]"
                              : "flex"
                          }`}
                        >
                          <div className="flex -space-x-2">
                            {Array.from({ length: Math.min(3, people) }).map(
                              (_, idx) => (
                                <div
                                  key={`${project.id}-avatar-${idx}`}
                                  className="h-7 w-7 rounded-full border-2 border-white bg-[#DEE5F7] text-[10px] font-semibold text-[#485578] grid place-items-center"
                                >
                                  {getInitials(project.name)}
                                </div>
                              ),
                            )}
                          </div>
                          <span className="ml-2 text-xs text-[#7A859F]">
                            {people} People
                          </span>
                        </div>

                        <div
                          className={
                            viewMode === "list"
                              ? "hidden xl:block xl:w-[14%]"
                              : "block"
                          }
                        >
                          <svg viewBox="0 0 96 26" className="h-7 w-24">
                            <polyline
                              fill="none"
                              stroke={trend.up ? "#5B5FE8" : "#E34B6B"}
                              strokeWidth="2"
                              points={getSparklinePoints(project, trend.up)}
                            />
                          </svg>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#7A859F]">
                            Trends
                            {trend.up ? (
                              <TrendingUp className="h-3 w-3 text-[#31B36B]" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-[#E34B6B]" />
                            )}
                            <span
                              className={
                                trend.up ? "text-[#31B36B]" : "text-[#E34B6B]"
                              }
                            >
                              {trend.pct}%
                            </span>
                          </p>
                        </div>

                        <div
                          className={`flex items-center gap-2 ${
                            viewMode === "list" ? "xl:w-[14%]" : ""
                          }`}
                        >
                          <div
                            className="relative h-10 w-10 rounded-full"
                            style={{
                              background: `conic-gradient(${scoreState.color} ${score * 3.6}deg, #E9EDF7 ${score * 3.6}deg)`,
                            }}
                          >
                            <div className="absolute inset-[3px] grid place-items-center rounded-full bg-white text-xs font-semibold text-[#1F2744]">
                              {score}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] text-[#7A859F]">
                              Installation Score
                            </p>
                            <p
                              className={`text-xs font-medium ${scoreState.textClass}`}
                            >
                              {scoreState.label}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`${viewMode === "list" ? "xl:w-[22%]" : ""} ${viewMode === "grid" ? "sm:col-span-2" : ""}`}
                        >
                          <p className="text-[11px] text-[#7A859F]">Stage</p>
                          <p className="truncate text-sm font-semibold text-[#1E2540]">
                            {dealCardStageLabels[project.stage] ||
                              stageLabels[project.stage] ||
                              project.stage}
                          </p>
                          <div className="mt-2 flex gap-1">
                            {Array.from({ length: 7 }).map((_, idx) => (
                              <span
                                key={`${project.id}-segment-${idx}`}
                                className="h-1.5 w-4 rounded-full"
                                style={{
                                  backgroundColor:
                                    idx < filledSegments
                                      ? stageIndicatorColor
                                      : "#DEE4F1",
                                }}
                              />
                            ))}
                          </div>
                          <p className="mt-1 text-[11px] text-[#7A859F]">
                            Target {formatDate(project.target_completion)}
                          </p>
                        </div>

                        <div
                          className={`ml-auto ${
                            viewMode === "list" ? "hidden xl:block" : "block"
                          }`}
                        >
                          <div className="rounded-full p-1.5 text-[#8A94AB] transition-colors group-hover:bg-[#F2F5FB] group-hover:text-[#5B5FE8]">
                            <MoreHorizontal className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })(),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProjects;
