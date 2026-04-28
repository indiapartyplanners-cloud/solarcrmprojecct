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
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadges";
import {
  Plus,
  ListTodo,
  Search,
  MessageSquare,
  CheckSquare,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskComments } from "@/components/TaskComments";
import { ChecklistRunner } from "@/components/ChecklistRunner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const AdminTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [form, setForm] = useState({
    title: "",
    description: "",
    project_id: "",
    status: "pending" as string,
    priority: "0",
    due_date: "",
    assigned_to: "",
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch assigned user profiles separately
      const assignedUserIds = [
        ...new Set(data.map((t) => t.assigned_to).filter(Boolean)),
      ];

      if (assignedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", assignedUserIds);

        const profilesMap =
          profiles?.reduce((acc: any, p: any) => {
            acc[p.user_id] = p;
            return acc;
          }, {}) || {};

        return data.map((task) => ({
          ...task,
          profile: task.assigned_to ? profilesMap[task.assigned_to] : null,
        }));
      }

      return data.map((task) => ({ ...task, profile: null }));
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch users with execution-related roles for assignment
  const { data: engineers = [] } = useQuery({
    queryKey: ["engineers"],
    queryFn: async () => {
      // Fetch user IDs for engineering/execution roles
      const { data: engineerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["engineering", "execution", "engineer"]);

      if (rolesError) throw rolesError;

      const engineerIds = engineerRoles.map((r) => r.user_id);

      if (engineerIds.length === 0) return [];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", engineerIds)
        .order("full_name");

      if (profilesError) throw profilesError;
      return profiles;
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        title: form.title,
        description: form.description || null,
        project_id: form.project_id,
        status: form.status as any,
        priority: parseInt(form.priority),
        due_date: form.due_date || null,
        assigned_to: form.assigned_to || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false);
      setForm({
        title: "",
        description: "",
        project_id: "",
        status: "pending",
        priority: "0",
        due_date: "",
        assigned_to: "",
      });
      toast({ title: "Task created and assigned" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCommentsDialog = (task: any) => {
    setSelectedTask(task);
    setCommentsDialogOpen(true);
  };

  if (isLoading) return <LoadingSpinner text="Loading tasks..." />;

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ListTodo className="h-8 w-8 text-primary" /> Tasks
          </h1>
          <p className="text-muted-foreground mt-1">
            {tasks.length} total tasks
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTask.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
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
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={form.project_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, project_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign To (Engineering / Execution)</Label>
                <Select
                  value={form.assigned_to}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      assigned_to: v === "unassigned" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {engineers.map((e) => (
                      <SelectItem key={e.user_id} value={e.user_id}>
                        {e.full_name} ({e.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority (0-5)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={form.priority}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priority: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, due_date: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createTask.isPending || !form.project_id}
              >
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      icon={CheckSquare}
                      title="No tasks found"
                      description="Create your first task to start tracking work or adjust your search"
                      actionLabel="Create Task"
                      onAction={() => setOpen(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{(task as any).projects?.name || "—"}</TableCell>
                    <TableCell>
                      {(task as any).profile ? (
                        <div>
                          <p className="text-sm font-medium">
                            {(task as any).profile.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(task as any).profile.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-mono text-sm ${task.priority >= 4 ? "text-destructive" : task.priority >= 2 ? "text-warning" : "text-muted-foreground"}`}
                      >
                        P{task.priority}
                      </span>
                    </TableCell>
                    <TableCell>{task.due_date || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <ChecklistRunner
                          taskId={task.id}
                          projectId={task.project_id}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => openCommentsDialog(task)}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Open Comments
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/admin/projects/${task.project_id}`)
                              }
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open Deal
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={commentsDialogOpen} onOpenChange={setCommentsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task: {selectedTask?.title}</DialogTitle>
          </DialogHeader>
          {selectedTask && <TaskComments taskId={selectedTask.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTasks;
