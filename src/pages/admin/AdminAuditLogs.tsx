import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Search, Eye, FileText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface AuditEvent {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: {
    old_value?: unknown;
    new_value?: unknown;
  } | null;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

const actionColors: Record<string, string> = {
  INSERT: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  UPDATE: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  DELETE: 'bg-red-500/20 text-red-700 dark:text-red-300',
};

const AdminAuditLogs = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      // Fetch audit events
      const { data: events, error: eventsError } = await supabase
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (eventsError) throw eventsError;

      // Fetch all profiles for these events
      const userIds = [...new Set(events.map(e => e.user_id).filter(Boolean))];
      
      if (userIds.length === 0) {
        return events.map(e => ({ ...e, user_profile: null }));
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Map profiles to events
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));
      
      return events.map(event => ({
        ...event,
        user_profile: event.user_id ? profileMap.get(event.user_id) || null : null,
      })) as unknown as AuditEvent[];
    },
  });

  // Get unique entity types for filter
  const entityTypes = Array.from(new Set(auditLogs.map(log => log.entity_type)));

  // Filter audit logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = search === '' || 
      log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user_profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_profile?.email?.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const viewDetails = (event: AuditEvent) => {
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  };

  const formatEntityType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatFieldName = (field: string) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') {
      // Check if it's a UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return value;
      }
      // Check if it's a timestamp
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        try {
          return format(new Date(value), 'PPpp');
        } catch {
          return value;
        }
      }
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderMetadataComparison = (event: AuditEvent) => {
    if (!event.metadata) return <p className="text-muted-foreground">No metadata available</p>;

    const { old_value, new_value } = event.metadata;

    if (event.action === 'INSERT' && new_value) {
      return (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Created Record:</h4>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <pre className="text-xs font-mono">{JSON.stringify(new_value, null, 2)}</pre>
          </ScrollArea>
        </div>
      );
    }

    if (event.action === 'DELETE' && old_value) {
      return (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Deleted Record:</h4>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <pre className="text-xs font-mono">{JSON.stringify(old_value, null, 2)}</pre>
          </ScrollArea>
        </div>
      );
    }

    if (event.action === 'UPDATE' && old_value && new_value) {
      // Find changed fields
      const changedFields: { field: string; oldVal: unknown; newVal: unknown }[] = [];
      const allKeys = new Set([...Object.keys(old_value), ...Object.keys(new_value)]);
      
      allKeys.forEach(key => {
        const oldVal = old_value[key];
        const newVal = new_value[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields.push({ field: key, oldVal, newVal });
        }
      });

      return (
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Changed Fields ({changedFields.length}):</h4>
          {changedFields.length === 0 ? (
            <p className="text-muted-foreground text-sm">No fields changed</p>
          ) : (
            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-3 pr-4">
                {changedFields.map((field, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <h5 className="font-medium text-sm mb-3">{formatFieldName(field.field)}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Old Value:</p>
                        <div className="bg-red-50 dark:bg-red-950/20 rounded p-2.5 border border-red-200 dark:border-red-900">
                          <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                            {formatValue(field.oldVal)}
                          </pre>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">New Value:</p>
                        <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-2.5 border border-amber-200 dark:border-amber-900">
                          <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                            {formatValue(field.newVal)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      );
    }

    return <p className="text-muted-foreground">No changes detected</p>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Immutable record of all system actions and changes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, entity, action..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type</label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {formatEntityType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Audit Events ({filteredLogs.length})</span>
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Last 500 events
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading audit logs...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No audit logs found</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {log.user_profile?.full_name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.user_profile?.email || log.user_id || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColors[log.action] || ''}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatEntityType(log.entity_type)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entity_id ? log.entity_id.substring(0, 8) + '...' : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Audit Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">User</p>
                    <p className="font-medium">
                      {selectedEvent.user_profile?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEvent.user_profile?.email || selectedEvent.user_id || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Action</p>
                    <Badge className={actionColors[selectedEvent.action] || ''}>
                      {selectedEvent.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Entity Type</p>
                    <p className="font-medium">{formatEntityType(selectedEvent.entity_type)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Entity ID</p>
                    <p className="font-mono text-xs break-all">{selectedEvent.entity_id || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
                    <p className="font-medium text-sm">
                      {format(new Date(selectedEvent.created_at), 'PPpp')}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  {renderMetadataComparison(selectedEvent)}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuditLogs;
