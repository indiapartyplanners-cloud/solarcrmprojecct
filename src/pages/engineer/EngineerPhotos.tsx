import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Plus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EngineerPhotos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [projectId, setProjectId] = useState('');

  const { data: photos = [] } = useQuery({
    queryKey: ['my-photos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*, projects(name)')
        .eq('uploaded_by', user!.id)
        .order('created_at', { ascending: false });
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

  const uploadPhoto = useMutation({
    mutationFn: async () => {
      if (!file || !projectId) throw new Error('Missing file or project');
      const ext = file.name.split('.').pop();
      const path = `${projectId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('project-photos').upload(path, file);
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('photos').insert({
        project_id: projectId,
        file_path: path,
        caption: caption || null,
        uploaded_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-photos'] });
      setOpen(false);
      setFile(null);
      setCaption('');
      setProjectId('');
      toast({ title: 'Photo uploaded' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Camera className="h-8 w-8 text-primary" /> Photos
          </h1>
          <p className="text-muted-foreground mt-1">{photos.length} photos uploaded</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Upload Photo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Photo</Label>
                <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>Caption</Label>
                <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Optional caption..." />
              </div>
              <Button onClick={() => uploadPhoto.mutate()} className="w-full" disabled={uploadPhoto.isPending || !file || !projectId}>
                {uploadPhoto.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {photos.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No photos uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map(photo => {
            const { data } = supabase.storage.from('project-photos').getPublicUrl(photo.file_path);
            return (
              <Card key={photo.id} className="border-border/50 overflow-hidden">
                <div className="aspect-video bg-muted">
                  <img src={data.publicUrl} alt={photo.caption || 'Project photo'} className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{(photo as any).projects?.name}</p>
                  {photo.caption && <p className="text-xs text-muted-foreground">{photo.caption}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(photo.created_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EngineerPhotos;
