import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Clock, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DocumentVersionHistoryProps {
  documentId: string;
  documentName: string;
}

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  file_size: number | null;
  mime_type?: string;
  notes: string | null;
  created_at: string;
  uploaded_by: string | null;
  uploaded_by_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export const DocumentVersionHistory = ({
  documentId,
  documentName,
}: DocumentVersionHistoryProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["document-versions", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_versions")
        .select(
          `
          *,
          uploaded_by_profile:profiles!document_versions_uploaded_by_fkey(full_name, email)
        `,
        )
        .eq("document_id", documentId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      return data as unknown as DocumentVersion[];
    },
    enabled: !!documentId,
  });

  // Query download statistics
  const { data: downloadStats = [] } = useQuery({
    queryKey: ["document-downloads", documentId],
    queryFn: async () => {
      try {
        const { data, error } = (await supabase
          .from("document_downloads" as never)
          .select("*" as never)
          .eq("document_id" as never, documentId)
          .order("downloaded_at" as never, { ascending: false })
          .limit(10)) as never;

        if (error) throw error;
        return (data as any[]) || [];
      } catch (e) {
        // Table might not exist yet, return empty array
        console.warn("Download stats not available yet");
        return [];
      }
    },
    enabled: !!documentId,
  });

  const downloadVersion = async (version: DocumentVersion) => {
    try {
      const { data, error } = await supabase.storage
        .from("project-documents")
        .download(version.file_path);

      if (error) throw error;

      // Log the download (will work after types are regenerated)
      try {
        await supabase.rpc(
          "log_document_download" as never,
          {
            doc_id: documentId,
            version_num: version.version_number,
          } as never,
        );
      } catch (e) {
        // Silently fail if function doesn't exist yet
        console.warn("Download logging not available yet");
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${documentName}_v${version.version_number}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Download started" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Download failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const deleteVersion = useMutation({
    mutationFn: async (version: DocumentVersion) => {
      const { error: storageError } = await supabase.storage
        .from("project-documents")
        .remove([version.file_path]);

      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from("document_versions")
        .delete()
        .eq("id", version.id);

      if (deleteError) throw deleteError;

      const remainingVersions = versions.filter((v) => v.id !== version.id);
      const nextCurrentVersion =
        remainingVersions.length > 0
          ? Math.max(...remainingVersions.map((v) => v.version_number))
          : 0;

      const { error: updateDocError } = await supabase
        .from("documents")
        .update({
          current_version: nextCurrentVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (updateDocError) throw updateDocError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["document-versions", documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["document-downloads", documentId],
      });
      toast({ title: "File deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">
            Loading version history...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No versions uploaded yet
            </p>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div key={version.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          Version {version.version_number}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(version.created_at), "PPp")}
                          </span>
                        </div>

                        {version.uploaded_by_profile && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>
                              {version.uploaded_by_profile?.full_name ||
                                version.uploaded_by_profile?.email ||
                                "Unknown"}
                            </span>
                          </div>
                        )}

                        {version.file_size && (
                          <div className="text-muted-foreground">
                            Size: {(version.file_size / 1024 / 1024).toFixed(2)}{" "}
                            MB
                          </div>
                        )}

                        {version.mime_type && (
                          <div className="text-muted-foreground">
                            Type: {version.mime_type}
                          </div>
                        )}

                        {version.notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <p className="font-medium">Notes:</p>
                            <p className="text-muted-foreground">
                              {version.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadVersion(version)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deleteVersion.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete this uploaded file?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove version{" "}
                              {version.version_number} from storage and history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteVersion.mutate(version)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {index < versions.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {downloadStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Recent Downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {downloadStats.map((download: any, index: number) => (
                <div
                  key={download.id || index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Version {download.version_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(download.downloaded_at), "PPp")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
