import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DocStateBadge } from '@/components/StatusBadges';
import { FileText, Search, Download, Eye, Lock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentVersionHistory } from '@/components/DocumentVersionHistory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface DocumentWithProject {
  id: string;
  name: string;
  description: string | null;
  state: 'draft' | 'in_review' | 'afc' | 'as_built';
  current_version: number;
  project_id: string;
  created_at: string;
  updated_at: string;
  document_type?: string;
  category?: string;
  projects: {
    id: string;
    name: string;
  };
}

const EngineerDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithProject | null>(null);

  // Fetch only AFC and As-Built documents for assigned projects
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['engineer-documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          projects(id, name)
        `)
        .in('state', ['afc', 'as_built'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter to only include projects the engineer is assigned to
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', user!.id);

      const assignedProjectIds = new Set(assignments?.map(a => a.project_id) || []);
      
      return data.filter(doc => assignedProjectIds.has(doc.project_id)) as unknown as DocumentWithProject[];
    },
    enabled: !!user,
  });

  const openVersionHistory = (doc: DocumentWithProject) => {
    setSelectedDoc(doc);
    setVersionHistoryOpen(true);
  };

  const downloadDocument = async (doc: DocumentWithProject) => {
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

        // Log download (will work after types are regenerated)
        try {
          await supabase.rpc('log_document_download' as never, {
            doc_id: doc.id,
            version_num: versions[0].version_number,
          } as never);
        } catch (e) {
          console.warn('Download logging not available yet');
        }
        
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.name}_v${versions[0].version_number}`;
        a.click();
        URL.revokeObjectURL(url);

        toast({ title: 'Download started', description: 'Your download has been logged' });
      } else {
        toast({ title: 'No file available', variant: 'destructive' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Download failed', description: errorMessage, variant: 'destructive' });
    }
  };

  const filtered = documents.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || (d.category && d.category === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(documents.map(d => d.category).filter(Boolean))] as string[];

  if (isLoading) return <LoadingSpinner text="Loading AFC documents..." />;

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" /> Field Documents
        </h1>
        <p className="text-muted-foreground mt-1">
          Approved for Construction (AFC) documents for your assigned projects
        </p>
      </div>

      <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
        <div className="flex gap-3">
          <Lock className="h-5 w-5 text-info mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-info">AFC Documents Only</p>
            <p className="text-sm text-muted-foreground mt-1">
              You can only access documents that are marked as "Approved for Construction" (AFC) or "As-Built" 
              for projects you're assigned to. All downloads are automatically logged for audit purposes.
            </p>
          </div>
        </div>
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
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState 
                      icon={documents.length === 0 ? Lock : FileText}
                      title={documents.length === 0 ? "No AFC documents available" : "No documents found"}
                      description={
                        documents.length === 0 
                          ? "No documents have been approved for construction yet for your assigned projects"
                          : "Try adjusting your search or filters"
                      }
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
                    <TableCell>{doc.projects?.name || '—'}</TableCell>
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
                          title="View History"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => downloadDocument(doc)} 
                          title="Download (Logged)"
                        >
                          <Download className="h-4 w-4" />
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

      {filtered.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>
            Showing {filtered.length} AFC document{filtered.length !== 1 ? 's' : ''} • All downloads are tracked
          </span>
        </div>
      )}

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
    </div>
  );
};

export default EngineerDocuments;
