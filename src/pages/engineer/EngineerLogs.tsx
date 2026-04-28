import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Plus, Cloud, AlertTriangle, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EngineerLogs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    project_id: '', work_hours: '', weather: '', issues: '', materials: '', notes: '',
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['my-logs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*, projects(name)')
        .eq('logged_by', user!.id)
        .order('log_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['my-project-ids', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_assignments')
        .select('projects(id, name)')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data.map((a: any) => a.projects).filter(Boolean);
    },
    enabled: !!user,
  });

  const createLog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('daily_logs').insert({
        project_id: form.project_id,
        logged_by: user!.id,
        work_hours: form.work_hours ? parseFloat(form.work_hours) : null,
        weather: form.weather || null,
        issues: form.issues || null,
        materials: form.materials || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-logs'] });
      setOpen(false);
      setForm({ project_id: '', work_hours: '', weather: '', issues: '', materials: '', notes: '' });
      toast({ title: 'Daily log added' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" /> Daily Logs
          </h1>
          <p className="text-muted-foreground mt-1">Track your daily field activities</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Log</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Daily Log</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createLog.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work Hours</Label>
                  <Input type="number" step="0.5" value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Weather</Label>
                  <Input value={form.weather} onChange={e => setForm(f => ({ ...f, weather: e.target.value }))} placeholder="Sunny, 85°F" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Issues</Label>
                <Textarea value={form.issues} onChange={e => setForm(f => ({ ...f, issues: e.target.value }))} placeholder="Any issues encountered..." />
              </div>
              <div className="space-y-2">
                <Label>Materials Used</Label>
                <Textarea value={form.materials} onChange={e => setForm(f => ({ ...f, materials: e.target.value }))} placeholder="Materials consumed..." />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button type="submit" className="w-full" disabled={createLog.isPending || !form.project_id}>
                {createLog.isPending ? 'Saving...' : 'Save Log'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-8 text-center text-muted-foreground">No daily logs yet</CardContent>
          </Card>
        ) : (
          logs.map(log => (
            <Card key={log.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{(log as any).projects?.name}</CardTitle>
                  <span className="text-sm text-muted-foreground font-mono">{log.log_date}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{log.work_hours ? `${log.work_hours}h` : '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <span>{log.weather || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{log.issues || 'None'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{log.materials || '—'}</span>
                  </div>
                </div>
                {log.notes && <p className="mt-3 text-sm text-muted-foreground">{log.notes}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EngineerLogs;
