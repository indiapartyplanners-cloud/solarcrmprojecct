-- Enable Realtime Replication for core transaction tables
-- By adding these tables to the 'supabase_realtime' publication, 
-- we allow frontend clients to subscribe to changes via WebSockets.

begin;
  -- If publication doesn't exist, this will gracefully continue.
  -- Supabase generally sets up 'supabase_realtime' out of the box.

  -- Add tables that we want to sync across dashboards instantly
  alter publication supabase_realtime add table projects;
  alter publication supabase_realtime add table tasks;
  alter publication supabase_realtime add table project_assignments;
  alter publication supabase_realtime add table documents;
  alter publication supabase_realtime add table milestones;
  alter publication supabase_realtime add table checklist_runs;
commit;
