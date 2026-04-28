import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadges';
import { TaskExecutionTabs } from '@/components/TaskExecutionTabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Calendar, Flag, FolderKanban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EngineerTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name)')
        .eq('assigned_to', user!.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('tasks').update({
        status: status as any,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({ title: 'Task updated' });
    },
  });

  const openTasksCount = tasks.filter((task) => task.status !== 'completed').length;
  const inProgressCount = tasks.filter((task) => task.status === 'in_progress').length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" /> My Tasks
        </h1>
        <p className="text-muted-foreground mt-1">Execution workflow with checklist, comments, and photos</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Open</p>
            <p className="text-2xl font-bold">{openTasksCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-primary">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-success">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">No tasks assigned</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg leading-tight">{task.title}</CardTitle>
                    {task.description && (
                      <p className="text-sm text-muted-foreground max-w-3xl">{task.description}</p>
                    )}
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span>{(task as any).projects?.name || 'No project linked'}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Priority P{task.priority}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{task.due_date || 'No due date'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <TaskExecutionTabs
                    taskId={task.id}
                    projectId={task.project_id}
                    taskTitle={task.title}
                    taskStatus={task.status}
                  />

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Update status</span>
                    <Select value={task.status} onValueChange={(value) => updateTask.mutate({ id: task.id, status: value })}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EngineerTasks;
