import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export const useRealtimeSync = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        // Only set up subscriptions if the user is authenticated
        if (!user) return;

        // We can listen to all tables on the 'public' schema
        const channel = supabase.channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                (payload) => {
                    // Log for debugging
                    console.log(`Realtime change received: [${payload.eventType}] on table: ${payload.table}`);

                    // Determine which query keys to invalidate depending on the table affected
                    // Using exact query keys as defined across our pages
                    switch (payload.table) {
                        case 'projects':
                            queryClient.invalidateQueries({ queryKey: ['projects'] });
                            queryClient.invalidateQueries({ queryKey: ['customer-projects'] });
                            queryClient.invalidateQueries({ queryKey: ['project'] }); // specific project detail queries
                            break;
                        case 'project_assignments':
                            queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
                            queryClient.invalidateQueries({ queryKey: ['project-team'] });
                            break;
                        case 'tasks':
                            queryClient.invalidateQueries({ queryKey: ['tasks'] });
                            queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
                            queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
                            break;
                        case 'documents':
                            queryClient.invalidateQueries({ queryKey: ['documents'] });
                            queryClient.invalidateQueries({ queryKey: ['customer-documents'] });
                            queryClient.invalidateQueries({ queryKey: ['project-documents'] });
                            break;
                        case 'milestones':
                            queryClient.invalidateQueries({ queryKey: ['milestones'] });
                            queryClient.invalidateQueries({ queryKey: ['customer-milestones'] });
                            queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
                            break;
                        case 'photos':
                            queryClient.invalidateQueries({ queryKey: ['photos'] });
                            queryClient.invalidateQueries({ queryKey: ['project-photos'] });
                            break;
                        case 'daily_logs':
                            queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
                            queryClient.invalidateQueries({ queryKey: ['project-logs'] });
                            break;
                        case 'checklist_runs':
                            queryClient.invalidateQueries({ queryKey: ['checklist-runs'] });
                            queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
                            break;
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to database changes for real-time updates');
                } else if (err) {
                    console.error('Failed to subscribe to real-time changes:', err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);
};
