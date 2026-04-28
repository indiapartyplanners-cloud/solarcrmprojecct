import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  project_type: string;
  stage: string;
  client_id: string | null;
  site_id: string | null;
  organization_id: string | null;
  capacity_kw: number | null;
  estimated_cost: number | null;
  start_date: string | null;
  target_completion: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch all projects with optional joins
 */
export const useProjects = (options?: {
  includeClients?: boolean;
  includeSites?: boolean;
  orderBy?: string;
  ascending?: boolean;
}) => {
  const { includeClients = true, includeSites = false, orderBy = 'created_at', ascending = false } = options || {};
  
  let selectQuery = 'projects.*';
  if (includeClients) selectQuery += ', clients(name)';
  if (includeSites) selectQuery += ', sites(name, address)';

  return useQuery({
    queryKey: ['projects', { includeClients, includeSites, orderBy, ascending }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(selectQuery)
        .order(orderBy, { ascending });
      
      if (error) throw error;
      return data;
    },
  });
};

/**
 * Hook to fetch a single project with all related data
 */
export const useProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(name, email), sites(name, address, latitude, longitude), organizations(name)')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
};

/**
 * Hook to create a new project
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectData: Partial<Project>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(projectData as Database['public']['Tables']['projects']['Insert'])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project created successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to update a project
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates as Database['public']['Tables']['projects']['Update'])
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      toast({ title: 'Project updated successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to delete a project
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project deleted successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
