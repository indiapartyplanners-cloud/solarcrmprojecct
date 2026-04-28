import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DocumentVersionHistory } from '@/components/DocumentVersionHistory';
import { useToast } from '@/hooks/use-toast';
import { generateCloseoutPackagePDF } from '@/utils/pdfGenerator';
import { Package, Download, Eye, ShieldCheck, Search } from 'lucide-react';

interface CustomerProject {
  id: string;
  name: string;
  stage: string;
  project_type: string | null;
  capacity_kw: number | null;
  start_date: string | null;
  target_completion: string | null;
  estimated_cost: number | null;
  client_id: string | null;
  site_id: string | null;
}

interface CustomerDocument {
  id: string;
  name: string;
  description: string | null;
  state: 'draft' | 'in_review' | 'afc' | 'as_built';
  current_version: number;
  project_id: string;
  updated_at: string;
  document_type: string | null;
  category: string | null;
  projects: {
    id: string;
    name: string;
  } | null;
}

const CustomerCloseout = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [assetSummaryOpen, setAssetSummaryOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<CustomerProject | null>(null);
  const [selectedWarrantyDoc, setSelectedWarrantyDoc] = useState<CustomerDocument | null>(null);
  const [generatingProjectId, setGeneratingProjectId] = useState<string | null>(null);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['customer-closeout-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, stage, project_type, capacity_kw, start_date, target_completion, estimated_cost, client_id, site_id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as unknown as CustomerProject[];
    },
    enabled: !!user,
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['customer-closeout-documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*, projects(id, name)')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data as unknown as CustomerDocument[];
    },
    enabled: !!user,
  });

  const closeoutProjects = projects.filter(project => project.stage === 'closeout_delivered');

  const normalizedSearch = search.trim().toLowerCase();

  const warrantyDocuments = documents.filter(doc => {
    const hasWarrantyMarker =
      doc.name.toLowerCase().includes('warranty') ||
      (doc.description?.toLowerCase().includes('warranty') ?? false) ||
      (doc.category?.toLowerCase().includes('warranty') ?? false);

    const matchesSearch =
      !normalizedSearch ||
      doc.name.toLowerCase().includes(normalizedSearch) ||
      (doc.projects?.name?.toLowerCase().includes(normalizedSearch) ?? false);

    return (
      (doc.state === 'afc' || doc.state === 'as_built') &&
      (doc.category === 'closeout' || hasWarrantyMarker) &&
      matchesSearch
    );
  });

  const openAssetSummary = (project: CustomerProject) => {
    setSelectedProject(project);
    setAssetSummaryOpen(true);
  };

  const openWarrantyHistory = (doc: CustomerDocument) => {
    setSelectedWarrantyDoc(doc);
    setVersionHistoryOpen(true);
  };

  const downloadWarrantyDocument = async (doc: CustomerDocument) => {
    try {
      const { data: versions, error: versionError } = await supabase
        .from('document_versions')
        .select('file_path, version_number')
        .eq('document_id', doc.id)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versionError) throw versionError;

      if (!versions || versions.length === 0) {
        toast({ title: 'No file available', variant: 'destructive' });
        return;
      }

      const latest = versions[0];
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(latest.file_path);

      if (error) throw error;

      try {
        await supabase.rpc('log_document_download' as never, {
          doc_id: doc.id,
          version_num: latest.version_number,
        } as never);
      } catch {
        console.warn('Download logging not available yet');
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name}_v${latest.version_number}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Download started' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Download failed', description: errorMessage, variant: 'destructive' });
    }
  };

  const downloadFinalCompiledPdf = async (project: CustomerProject) => {
    setGeneratingProjectId(project.id);

    try {
      const [clientRes, siteRes, docsRes, milestonesRes] = await Promise.all([
        project.client_id
          ? supabase.from('profiles').select('*').eq('user_id', project.client_id).single()
          : Promise.resolve({ data: null, error: null }),
        project.site_id
          ? supabase.from('sites').select('*').eq('id', project.site_id).single()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('documents').select('*').eq('project_id', project.id),
        supabase.from('milestones').select('*').eq('project_id', project.id),
      ]);

      const [photosRes, taskPhotosRes] = await Promise.all([
        supabase.from('photos').select('caption, created_at, file_path').eq('project_id', project.id),
        supabase.from('task_photos').select('caption, uploaded_at, file_path').eq('project_id', project.id),
      ]);

      if (docsRes.error) throw docsRes.error;
      if (milestonesRes.error) throw milestonesRes.error;
      if (photosRes.error) throw photosRes.error;
      if (taskPhotosRes.error) throw taskPhotosRes.error;

      const photoEvidence = [
        ...(photosRes.data || []).map(photo => ({
          caption: photo.caption,
          created_at: photo.created_at,
          file_path: photo.file_path,
        })),
        ...(taskPhotosRes.data || []).map(photo => ({
          caption: photo.caption,
          created_at: photo.uploaded_at,
          file_path: photo.file_path,
        })),
      ];

      const pdfBlob = await generateCloseoutPackagePDF({
        project,
        client: clientRes.data || undefined,
        site: siteRes.data || undefined,
        documents: docsRes.data || [],
        milestones: milestonesRes.data || [],
        photoEvidence,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_Final_Closeout_Package.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Final closeout package generated' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Failed to generate final package', description: errorMessage, variant: 'destructive' });
    } finally {
      setGeneratingProjectId(null);
    }
  };

  if (projectsLoading || docsLoading) {
    return <LoadingSpinner text="Loading closeout access..." />;
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" /> Closeout Package Access
        </h1>
        <p className="text-muted-foreground mt-1">
          Download final compiled PDF, access warranty documents, and view asset summary
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Final Compiled PDF & Asset Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {closeoutProjects.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No final packages available"
              description="Final closeout packages appear after projects reach closeout delivered stage."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closeoutProjects.map(project => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {project.stage.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{project.capacity_kw ? `${project.capacity_kw} kW` : '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAssetSummary(project)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Asset Summary
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => downloadFinalCompiledPdf(project)}
                          disabled={generatingProjectId === project.id}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {generatingProjectId === project.id ? 'Generating...' : 'Download Final PDF'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Warranty Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search warranty docs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {warrantyDocuments.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No warranty documents"
              description="Warranty documents will appear here when uploaded and approved."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warrantyDocuments.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{doc.name}</p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{doc.projects?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {doc.state.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">v{doc.current_version}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openWarrantyHistory(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadWarrantyDocument(doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={assetSummaryOpen} onOpenChange={setAssetSummaryOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name} • Asset Summary</DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Project Type</p>
                <p className="font-medium capitalize">{selectedProject.project_type?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Capacity</p>
                <p className="font-medium">{selectedProject.capacity_kw ? `${selectedProject.capacity_kw} kW` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stage</p>
                <p className="font-medium capitalize">{selectedProject.stage.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estimated Value</p>
                <p className="font-medium">{selectedProject.estimated_cost ? `$${selectedProject.estimated_cost.toLocaleString()}` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">{selectedProject.start_date || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target Completion</p>
                <p className="font-medium">{selectedProject.target_completion || '—'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedWarrantyDoc?.name}</DialogTitle>
          </DialogHeader>
          {selectedWarrantyDoc && (
            <DocumentVersionHistory
              documentId={selectedWarrantyDoc.id}
              documentName={selectedWarrantyDoc.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerCloseout;
