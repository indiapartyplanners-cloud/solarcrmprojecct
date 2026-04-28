import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocStateBadge } from '@/components/StatusBadges';
import { DocumentVersionHistory } from '@/components/DocumentVersionHistory';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { FileCheck2, Search, Download, Eye, FileText, PackageCheck, FlaskConical } from 'lucide-react';

interface CustomerDocument {
  id: string;
  name: string;
  description: string | null;
  state: 'draft' | 'in_review' | 'afc' | 'as_built';
  current_version: number;
  project_id: string;
  created_at: string;
  updated_at: string;
  document_type: string | null;
  category: string | null;
  projects: {
    id: string;
    name: string;
    stage: string;
  } | null;
}

const qaReadyStages = new Set(['qa_passed', 'commissioned', 'closeout_delivered']);

const CustomerDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CustomerDocument | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['customer-document-access', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          projects(id, name, stage)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data as unknown as CustomerDocument[];
    },
    enabled: !!user,
  });

  const normalizedSearch = search.trim().toLowerCase();

  const matchesSearch = (doc: CustomerDocument) => {
    if (!normalizedSearch) return true;

    return (
      doc.name.toLowerCase().includes(normalizedSearch) ||
      doc.projects?.name?.toLowerCase().includes(normalizedSearch) ||
      doc.document_type?.toLowerCase().includes(normalizedSearch) ||
      doc.category?.toLowerCase().includes(normalizedSearch)
    );
  };

  const isPostQaProject = (doc: CustomerDocument) => {
    const stage = doc.projects?.stage;
    return !!stage && qaReadyStages.has(stage);
  };

  const approvedDocuments = documents.filter(
    doc => doc.state === 'afc' && doc.document_type !== 'report' && matchesSearch(doc),
  );

  const asBuiltDrawings = documents.filter(
    doc => doc.state === 'as_built' && doc.document_type === 'drawing' && matchesSearch(doc),
  );

  const testReports = documents.filter(
    doc =>
      doc.document_type === 'report' &&
      (doc.state === 'afc' || doc.state === 'as_built') &&
      isPostQaProject(doc) &&
      matchesSearch(doc),
  );

  const openVersionHistory = (doc: CustomerDocument) => {
    setSelectedDoc(doc);
    setVersionHistoryOpen(true);
  };

  const downloadDocument = async (doc: CustomerDocument) => {
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
      } catch (rpcError) {
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

  const renderDocumentTable = (sectionDocs: CustomerDocument[], emptyDescription: string) => {
    if (sectionDocs.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="No documents available"
          description={emptyDescription}
        />
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sectionDocs.map(doc => (
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
                <Badge variant="outline" className="text-xs">
                  {doc.document_type || 'unknown'}
                </Badge>
              </TableCell>
              <TableCell>
                <DocStateBadge state={doc.state} />
              </TableCell>
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
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadDocument(doc)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) return <LoadingSpinner text="Loading document access..." />;

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileCheck2 className="h-8 w-8 text-primary" /> Document Access
        </h1>
        <p className="text-muted-foreground mt-1">
          Access approved documents, as-built drawings, and post-QA test reports for your projects
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by document, project, type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Approved Documents</p>
                <p className="text-2xl font-bold">{approvedDocuments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">As-Built Drawings</p>
                <p className="text-2xl font-bold">{asBuiltDrawings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Post-QA Test Reports</p>
                <p className="text-2xl font-bold">{testReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Approved Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {renderDocumentTable(
            approvedDocuments,
            'No approved documents are currently available.',
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>As-Built Drawings</CardTitle>
        </CardHeader>
        <CardContent>
          {renderDocumentTable(
            asBuiltDrawings,
            'No as-built drawings are currently available.',
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Test Reports (After QA)</CardTitle>
        </CardHeader>
        <CardContent>
          {renderDocumentTable(
            testReports,
            'No post-QA test reports are currently available.',
          )}
        </CardContent>
      </Card>

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
    </div>
  );
};

export default CustomerDocuments;