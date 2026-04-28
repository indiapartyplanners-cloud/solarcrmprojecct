import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, DollarSign, Users, FolderKanban } from 'lucide-react';
import StatsCard from '@/components/StatsCard';

const AdminReports = () => {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => !['lead_created', 'closeout_delivered'].includes(p.stage)).length;
  const completedProjects = projects.filter(p => p.stage === 'closeout_delivered').length;
  const totalCapacity = projects.reduce((sum, p) => sum + (p.capacity_kw || 0), 0);
  const totalValue = projects.reduce((sum, p) => sum + (parseFloat(p.estimated_cost as any) || 0), 0);
  
  const taskCompletionRate = tasks.length > 0 
    ? ((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100).toFixed(1)
    : '0';

  // Stage distribution
  const stageDistribution = projects.reduce((acc: Record<string, number>, p) => {
    acc[p.stage] = (acc[p.stage] || 0) + 1;
    return acc;
  }, {});

  // Monthly project starts
  const currentYear = new Date().getFullYear();
  const projectsByMonth = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const count = projects.filter(p => {
      if (!p.start_date) return false;
      const date = new Date(p.start_date);
      return date.getFullYear() === currentYear && date.getMonth() === i;
    }).length;
    return { month: new Date(2000, i).toLocaleString('default', { month: 'short' }), count };
  });

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" /> Reports & Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Business intelligence and performance metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Projects" value={totalProjects} icon={FolderKanban} description="All time" />
        <StatsCard title="Active Projects" value={activeProjects} icon={TrendingUp} description="In progress" />
        <StatsCard title="Total Capacity" value={`${totalCapacity.toFixed(1)} kW`} icon={Clock} description="Combined system capacity" />
        <StatsCard title="Total Value" value={`$${(totalValue / 1000000).toFixed(2)}M`} icon={DollarSign} description="Estimated project value" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Project Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold mt-1">{totalProjects > 0 ? ((completedProjects / totalProjects) * 100).toFixed(1) : '0'}%</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Task Completion</p>
                <p className="text-2xl font-bold mt-1">{taskCompletionRate}%</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Avg Capacity</p>
                <p className="text-2xl font-bold mt-1">{totalProjects > 0 ? (totalCapacity / totalProjects).toFixed(1) : '0'} kW</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold mt-1">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Projects by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stageDistribution).sort((a, b) => b[1] - a[1]).map(([stage, count]) => {
                const percentage = totalProjects > 0 ? ((count / totalProjects) * 100).toFixed(0) : '0';
                return (
                  <div key={stage} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{stage.replace('_', ' ')}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-sm font-mono w-12 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Project Starts ({currentYear})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-48">
            {projectsByMonth.map(({ month, count }) => {
              const maxCount = Math.max(...projectsByMonth.map(m => m.count), 1);
              const height = (count / maxCount) * 100;
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full bg-muted rounded-t" style={{ height: `${height}%` }}>
                    <div className="absolute inset-0 bg-primary rounded-t" />
                    {count > 0 && (
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold">{count}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{month}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Project Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {['rooftop', 'ground_mount', 'carport'].map(type => {
              const count = projects.filter(p => p.project_type === type).length;
              const percentage = totalProjects > 0 ? ((count / totalProjects) * 100).toFixed(1) : '0';
              return (
                <div key={type} className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground capitalize">{type.replace('_', ' ')}</p>
                  <p className="text-3xl font-bold mt-2">{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{percentage}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
