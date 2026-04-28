import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DocStateBadge } from '@/components/StatusBadges';
import { Plus, FileText, Search, Upload, Download, History, Edit, CheckCircle2, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploader } from '@/components/DocumentUploader';
import { DocumentVersionHistory } from '@/components/DocumentVersionHistory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

const AdminDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  const [form, setForm] = useState({ 
    name: '', 
    description: '', 
    project_id: '', 
    state: 'draft' as string,
    document_type: 'drawing',
    category: 'design'
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    document_type: '',
    category: ''
  });

  const [newState, setNewState] = useState('');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, projects(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const createDoc = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('documents').insert({
        name: form.name,
        description: form.description || null,
        project_id: form.project_id,
        state: form.state as any,
        document_type: form.document_type,
        category: form.category,
        uploaded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setOpen(false);
      setForm({ name: '', description: '', project_id: '', state: 'draft', document_type: 'drawing', category: 'design' });
      toast({ title: 'Document created successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateDoc = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('documents')
        .update({
          name: editForm.name,
          description: editForm.description,
          document_type: editForm.document_type,
          category: editForm.category,
        })
        .eq('id', selectedDoc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setEditDialogOpen(false);
      toast({ title: 'Document updated successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const transitionState = useMutation({
    mutationFn: async () => {
      // Direct state update (RPC function optional)
      const { error } = await supabase
        .from('documents')
        .update({ 
          state: newState as any,
          updated_at: new Date().toISOString(),
          ...(newState === 'afc' ? {
            approved_by: user?.id,
            approved_at: new Date().toISOString()
          } : {}),
          ...(newState === 'in_review' ? {
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString()
          } : {})
        })
        .eq('id', selectedDoc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setStateDialogOpen(false);
      toast({ title: 'Document state updated successfully' });
    },
    onError: (e: any) => toast({ title: 'State transition failed', description: e.message, variant: 'destructive' }),
  });

  const openUploadDialog = (doc: any) => {
    setSelectedDoc(doc);
    setUploadDialogOpen(true);
  };

  const openVersionHistory = (doc: any) => {
    setSelectedDoc(doc);
    setVersionHistoryOpen(true);
  };

  const openEditDialog = (doc: any) => {
    setSelectedDoc(doc);
    setEditForm({
      name: doc.name,
      description: doc.description || '',
      document_type: doc.document_type || 'drawing',
      category: doc.category || 'design',
    });
    setEditDialogOpen(true);
  };

  const openStateDialog = (doc: any) => {
    setSelectedDoc(doc);
    setNewState(doc.state);
    setStateDialogOpen(true);
  };

  const downloadDocument = async (doc: any) => {
    try {
      const { data: versions } = await supabase
        .from('document_versions')
        .select('file_path, version_number')
        .eq('document_id', doc.id)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versions && versions.length > 0) {
        const { data, error } = await supabase.storage
          .from('project-documents')
          .download(versions[0].file_path);
        
        if (error) throw error;

        // Log download (optional - graceful degradation)
        try {
          await supabase.rpc('log_document_download' as never, {
            doc_id: doc.id,
            version_num: versions[0].version_number,
          } as never);
        } catch (e) {
          // Download logging not critical - continue
        }
        
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.name}_v${versions[0].version_number}`;
        a.click();
        URL.revokeObjectURL(url);

        toast({ title: 'Download started' });
      } else {
        toast({ title: 'No file available', description: 'Upload a file first', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Download failed', description: error.message, variant: 'destructive' });
    }
  };

  const filtered = documents.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesState = stateFilter === 'all' || d.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const stateCounts = {
    all: documents.length,
    draft: documents.filter(d => d.state === 'draft').length,
    in_review: documents.filter(d => d.state === 'in_review').length,
    afc: documents.filter(d => d.state === 'afc').length,
    as_built: documents.filter(d => d.state === 'as_built').length,
  };

  if (isLoading) return <LoadingSpinner text="Loading documents..." />;

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" /> Document Control
          </h1>
          <p className="text-muted-foreground mt-1">Manage project documents with version control</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createDoc.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Document Name *</Label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  placeholder="e.g., Site Plan Drawing"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the document"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Document Type *</Label>
                  <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drawing">Drawing</SelectItem>
                      <SelectItem value="specification">Specification</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="permit">Permit</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="structural">Structural</SelectItem>
                      <SelectItem value="permitting">Permitting</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="commissioning">Commissioning</SelectItem>
                      <SelectItem value="closeout">Closeout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Initial State *</Label>
                <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="afc">AFC</SelectItem>
                    <SelectItem value="as_built">As-Built</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createDoc.isPending || !form.project_id}>
                {createDoc.isPending ? 'Creating...' : 'Create Document'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States ({stateCounts.all})</SelectItem>
            <SelectItem value="draft">Draft ({stateCounts.draft})</SelectItem>
            <SelectItem value="in_review">In Review ({stateCounts.in_review})</SelectItem>
            <SelectItem value="afc">AFC ({stateCounts.afc})</SelectItem>
            <SelectItem value="as_built">As-Built ({stateCounts.as_built})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState 
                      icon={FileText}
                      title="No documents found"
                      description={search || stateFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first document to get started'}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{(doc as any).projects?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {doc.document_type || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {doc.category || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell><DocStateBadge state={doc.state} /></TableCell>
                    <TableCell className="font-mono text-sm">v{doc.current_version}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openVersionHistory(doc)} 
                          title="Version History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openUploadDialog(doc)} 
                          title="Upload New Version"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => downloadDocument(doc)} 
                          title="Download Latest"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditDialog(doc)} 
                          title="Edit Details"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openStateDialog(doc)} 
                          title="Change State"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <DocumentUploader
              projectId={selectedDoc.project_id}
              documentId={selectedDoc.id}
              documentName={selectedDoc.name}
              documentState={selectedDoc.state}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['documents'] });
                setUploadDialogOpen(false);
                setSelectedDoc(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.name}</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <DocumentVersionHistory
              documentId={selectedDoc.id}
              documentName={selectedDoc.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); updateDoc.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input 
                value={editForm.name} 
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description} 
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={editForm.document_type} onValueChange={v => setEditForm(f => ({ ...f, document_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drawing">Drawing</SelectItem>
                    <SelectItem value="specification">Specification</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="structural">Structural</SelectItem>
                    <SelectItem value="permitting">Permitting</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="commissioning">Commissioning</SelectItem>
                    <SelectItem value="closeout">Closeout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateDoc.isPending}>
              {updateDoc.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* State Transition Dialog */}
      <Dialog open={stateDialogOpen} onOpenChange={setStateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Document State</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Document: {selectedDoc?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Current state: <DocStateBadge state={selectedDoc?.state} />
              </p>
            </div>

            <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-info mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-info">Document State Workflow</p>
                  <ul className="mt-1 text-muted-foreground space-y-1">
                    <li>• <strong>Draft:</strong> Initial creation, admin only</li>
                    <li>• <strong>In Review:</strong> Under review by team</li>
                    <li>• <strong>AFC:</strong> Released to field (engineers can access)</li>
                    <li>• <strong>As-Built:</strong> Final as-constructed drawings</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>New State</Label>
              <Select value={newState} onValueChange={setNewState}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="afc">Approved for Construction (AFC)</SelectItem>
                  <SelectItem value="as_built">As-Built</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => transitionState.mutate()} 
              className="w-full" 
              disabled={transitionState.isPending || newState === selectedDoc?.state}
            >
              {transitionState.isPending ? 'Updating...' : 'Update State'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDocuments;
