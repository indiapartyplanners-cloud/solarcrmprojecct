import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, ListChecks, Trash2, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
}

const AdminChecklists = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('checklist_templates').insert({
        name: form.name,
        description: form.description || null,
        items: items,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      setOpen(false);
      resetForm();
      toast({ title: 'Checklist template created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast({ title: 'Template deleted' });
    },
  });

  const resetForm = () => {
    setForm({ name: '', description: '' });
    setItems([]);
    setNewItemText('');
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    setItems([...items, {
      id: `item-${Date.now()}`,
      text: newItemText,
      required: false,
    }]);
    setNewItemText('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const toggleRequired = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, required: !item.required } : item
    ));
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ListChecks className="h-8 w-8 text-primary" /> Checklist Templates
          </h1>
          <p className="text-muted-foreground mt-1">{templates.length} templates</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Checklist Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createTemplate.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Checklist Items</Label>
                <div className="flex gap-2">
                  <Input
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                    placeholder="Add item..."
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addItem())}
                  />
                  <Button type="button" onClick={addItem}>Add</Button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No items added yet</p>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{item.text}</span>
                      <Button
                        type="button"
                        variant={item.required ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleRequired(item.id)}
                      >
                        {item.required ? 'Required' : 'Optional'}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createTemplate.isPending || items.length === 0}>
                {createTemplate.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(template => (
          <Card key={template.id} className="border-border/50">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex-1">
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Checklist Template</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{template.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteTemplate.mutate(template.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Items:</span>
                  <Badge variant="secondary">{Array.isArray(template.items) ? template.items.length : 0}</Badge>
                </div>
                {Array.isArray(template.items) && template.items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {template.items.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="text-xs text-muted-foreground truncate">
                        • {item.text}
                      </div>
                    ))}
                    {template.items.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{template.items.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminChecklists;
