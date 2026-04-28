import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export interface Task {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  priority: number;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch all tasks with optional filtering
 */
export const useTasks = (options?: {
  projectId?: string;
  assignedTo?: string;
  status?: string;
  includeProjects?: boolean;
}) => {
  const { projectId, assignedTo, status, includeProjects = true } = options || {};

  return useQuery({
    queryKey: ['tasks', { projectId, assignedTo, status }],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(includeProjects ? '*, projects(name)' : '*')
        .order('due_date', { ascending: true });

      if (projectId) query = query.eq('project_id', projectId);
      if (assignedTo) query = query.eq('assigned_to', assignedTo);
      if (status) query = query.eq('status', status as Database['public']['Enums']['task_status']);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

/**
 * Hook to fetch a single task
 */
export const useTask = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) throw new Error('Task ID is required');
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name), milestones(name)')
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
};

/**
 * Hook to create a new task
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (taskData: Partial<Task>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData as Database['public']['Tables']['tasks']['Insert'])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task created successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to update a task
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as Database['public']['Tables']['tasks']['Update'])
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      toast({ title: 'Task updated successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to update task status
 */
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Task['status'] }) => {
      const updates: Partial<Task> = {
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .update(updates as Database['public']['Tables']['tasks']['Update'])
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task status updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update task status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to delete a task
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'Task deleted successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
