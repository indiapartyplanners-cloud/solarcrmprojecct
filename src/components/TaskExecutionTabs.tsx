import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TaskPhotoUploader } from '@/components/TaskPhotoUploader';
import { TaskComments } from '@/components/TaskComments';
import { ChecklistRunner } from '@/components/ChecklistRunner';
import { 
  ClipboardCheck, 
  Camera, 
  MessageSquare, 
  CheckCircle, 
  PlayCircle,
  Loader2,
  AlertCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/StatusBadges';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskExecutionTabsProps {
  taskId: string;
  projectId: string;
  taskTitle: string;
  taskStatus: string;
}

export const TaskExecutionTabs = ({ taskId, projectId, taskTitle, taskStatus }: TaskExecutionTabsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('checklist');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Fetch checklist runs to check completion status
  const { data: checklistRuns = [] } = useQuery({
    queryKey: ['checklist-runs', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_runs')
        .select('*')
        .eq('task_id', taskId);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch photos count
  const { data: photos = [] } = useQuery({
    queryKey: ['task-photos', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_photos')
        .select('id')
        .eq('task_id', taskId);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch comments count
  const { data: comments = [] } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('id')
        .eq('task_id', taskId);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Start task mutation
  const startTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({ title: 'Task started' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Complete task mutation
  const completeTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({ 
        title: 'Task completed!', 
        description: 'Great work! The task has been marked as complete.',
      });
      setShowCompleteDialog(false);
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const hasActiveChecklist = checklistRuns.some((run) => (run as { status: string }).status === 'in_progress');
  const hasCompletedChecklist = checklistRuns.some((run) => (run as { status: string }).status === 'completed');
  const canComplete = taskStatus !== 'completed' && (hasCompletedChecklist || checklistRuns.length === 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="transition-colors duration-200 hover:bg-primary/5">
          <ClipboardCheck className="h-4 w-4 mr-2" />
          Execute Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col rounded-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-1">{taskTitle}</DialogTitle>
              <DialogDescription>Complete the checklist, upload photos, and add comments</DialogDescription>
            </div>
            <StatusBadge status={taskStatus} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="checklist" className="relative">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Checklist
                {hasActiveChecklist && (
                  <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>
                )}
                {hasCompletedChecklist && (
                  <CheckCircle className="h-3 w-3 ml-2 text-amber-600" />
                )}
              </TabsTrigger>
              <TabsTrigger value="photos">
                <Camera className="h-4 w-4 mr-2" />
                Photos
                {photos.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{photos.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{comments.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="checklist" className="mt-0 h-full">
                <div className="space-y-4">
                  {taskStatus === 'pending' && (
                    <Card className="bg-warning/10 border-warning/30 shadow-sm">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-foreground mb-2">
                              Task Not Started
                            </p>
                            <p className="text-sm text-muted-foreground mb-3">
                              Start this task to begin working on the checklist and uploading photos.
                            </p>
                            <Button
                              onClick={() => startTask.mutate()}
                              disabled={startTask.isPending}
                              size="sm"
                              className="transition-colors duration-200"
                            >
                              {startTask.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  Start Task
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {taskStatus === 'completed' && (
                    <Card className="bg-success/10 border-success/30 shadow-sm">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3 text-foreground">
                          <CheckCircle className="h-5 w-5" />
                          <p className="font-medium">Task Completed</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <ChecklistRunner taskId={taskId} projectId={projectId} />
                </div>
              </TabsContent>

              <TabsContent value="photos" className="mt-0">
                {taskStatus === 'pending' ? (
                  <Card className="bg-muted/40 shadow-sm">
                    <CardContent className="py-8 text-center">
                      <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">
                        Start the task to upload photos
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <TaskPhotoUploader taskId={taskId} projectId={projectId} />
                )}
              </TabsContent>

              <TabsContent value="comments" className="mt-0">
                <TaskComments taskId={taskId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Action Footer */}
        {taskStatus !== 'completed' && (
          <div className="border-t pt-4 mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {!hasCompletedChecklist && checklistRuns.length > 0 && (
                <span className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-4 w-4" />
                  Complete the checklist to finish the task
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {taskStatus === 'pending' ? (
                <Button
                  onClick={() => startTask.mutate()}
                  disabled={startTask.isPending}
                >
                  {startTask.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Start Task
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setShowCompleteDialog(true)}
                  disabled={!canComplete}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Task
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Complete Task Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this task as completed? This will update the task status and notify relevant stakeholders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => completeTask.mutate()}
              disabled={completeTask.isPending}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              {completeTask.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                'Complete Task'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
