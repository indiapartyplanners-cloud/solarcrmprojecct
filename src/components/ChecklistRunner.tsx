import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChecklistItem } from "@/components/ChecklistItem";
import { ChecklistProgress } from "@/components/ChecklistProgress";
import { ListChecks, Play, Save, CheckCircle, Loader2 } from "lucide-react";

interface ChecklistRunnerProps {
  taskId: string;
  projectId: string;
}

interface ChecklistItemData {
  id: string;
  text: string;
  required: boolean;
  checked?: boolean;
  notes?: string;
}

export const ChecklistRunner = ({
  taskId,
  projectId,
}: ChecklistRunnerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [items, setItems] = useState<ChecklistItemData[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch available templates
  const { data: templates = [] } = useQuery({
    queryKey: ["checklist-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing checklist runs for this task
  const { data: existingRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ["checklist-runs", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_runs")
        .select("*, checklist_templates(name)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });

  // Load active run
  const activeRun = existingRuns.find(
    (run: any) => run.status === "in_progress",
  );

  // Load items when active run or template selected
  useEffect(() => {
    if (activeRun) {
      setSelectedTemplateId(activeRun.template_id);
      const completedItems = Array.isArray(activeRun.completed_items)
        ? (activeRun.completed_items as unknown as ChecklistItemData[])
        : [];
      setItems(completedItems);
    } else if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        const templateItems = Array.isArray(template.items)
          ? (template.items as unknown as ChecklistItemData[])
          : [];
        setItems(
          templateItems.map((item: any) => ({
            ...item,
            checked: false,
            notes: "",
          })),
        );
      }
    }
  }, [activeRun, selectedTemplateId, templates]);

  // Create new checklist run
  const createRun = useMutation({
    mutationFn: async () => {
      if (!selectedTemplateId) throw new Error("No template selected");

      const { data, error } = await supabase
        .from("checklist_runs")
        .insert({
          task_id: taskId,
          project_id: projectId,
          template_id: selectedTemplateId,
          completed_items: items as any,
          status: "in_progress",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-runs", taskId] });
      toast({ title: "Checklist started" });
      setHasUnsavedChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save progress
  const saveProgress = useMutation({
    mutationFn: async () => {
      if (!activeRun) {
        return createRun.mutateAsync();
      }

      const { error } = await supabase
        .from("checklist_runs")
        .update({
          completed_items: items as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeRun.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-runs", taskId] });
      toast({ title: "Progress saved" });
      setHasUnsavedChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle item toggle
  const handleToggle = (id: string, checked: boolean) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, checked } : item)),
    );
    setHasUnsavedChanges(true);
  };

  // Handle notes change
  const handleNotesChange = (id: string, notes: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, notes } : item)));
    setHasUnsavedChanges(true);
  };

  // Calculate progress
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.checked).length;
  const requiredItems = items.filter((item) => item.required).length;
  const completedRequiredItems = items.filter(
    (item) => item.required && item.checked,
  ).length;
  const allRequiredComplete = requiredItems === completedRequiredItems;
  const isComplete = activeRun?.status === "completed";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ListChecks className="h-4 w-4 mr-2" />
          {activeRun ? "Continue Checklist" : "Run Checklist"}
          {activeRun && activeRun.status === "in_progress" && (
            <Badge variant="secondary" className="ml-2">
              In Progress
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {activeRun ? "Checklist in Progress" : "Start Checklist"}
          </DialogTitle>
          <DialogDescription>
            {activeRun
              ? "Complete all required items to finish the checklist"
              : "Select a checklist template to begin"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Selection */}
          {!activeRun && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Checklist Template
              </label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {template.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Active Template Info */}
          {activeRun && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {(activeRun as any).checklist_templates?.name}
                  </CardTitle>
                  {isComplete ? (
                    <Badge variant="default" className="bg-amber-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary">In Progress</Badge>
                  )}
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Progress */}
          {items.length > 0 && (
            <ChecklistProgress
              totalItems={totalItems}
              completedItems={completedItems}
              requiredItems={requiredItems}
              completedRequiredItems={completedRequiredItems}
            />
          )}

          <Separator />

          {/* Checklist Items */}
          {items.length > 0 ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onNotesChange={handleNotesChange}
                    disabled={isComplete}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <ListChecks className="h-12 w-12 mb-3 opacity-50" />
              <p>Select a template to start a checklist</p>
            </div>
          )}

          {/* Actions */}
          {items.length > 0 && !isComplete && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {hasUnsavedChanges && (
                  <span className="text-amber-600 dark:text-amber-400">
                    • Unsaved changes
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => saveProgress.mutate()}
                  disabled={!hasUnsavedChanges || saveProgress.isPending}
                >
                  {saveProgress.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Progress
                </Button>
                {!activeRun && (
                  <Button
                    onClick={() => createRun.mutate()}
                    disabled={!selectedTemplateId || createRun.isPending}
                  >
                    {createRun.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Start Checklist
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Completion Status */}
          {!allRequiredComplete && items.length > 0 && !isComplete && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <Play className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="text-amber-900 dark:text-amber-100">
                  Complete all <strong>{requiredItems}</strong> required items
                  to finish this checklist.
                  {completedRequiredItems > 0 &&
                    ` (${completedRequiredItems}/${requiredItems} done)`}
                </p>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="text-amber-900 dark:text-amber-100">
                  Checklist completed on{" "}
                  {new Date(activeRun.completed_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
