import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface TaskPhotoUploaderProps {
  taskId: string;
  projectId: string;
}

interface TaskPhoto {
  id: string;
  file_path: string;
  caption?: string;
  uploaded_at: string;
  uploaded_by: string;
  profiles?: {
    full_name: string;
  };
}

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

export const TaskPhotoUploader = ({
  taskId,
  projectId,
}: TaskPhotoUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<SelectedPhoto[]>([]);
  const [caption, setCaption] = useState("");

  // Fetch existing photos
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["task-photos", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_photos")
        .select("*, profiles!task_photos_uploaded_by_fkey(full_name)")
        .eq("task_id", taskId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as TaskPhoto[];
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const incomingFiles = Array.from(e.target.files);
      const invalidFile = incomingFiles.find(
        (file) => !file.type.startsWith("image/"),
      );

      if (invalidFile) {
        toast({
          title: "Invalid file",
          description: "Please select image files only",
          variant: "destructive",
        });
        return;
      }

      const mappedFiles = incomingFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setSelectedFiles((prevFiles) => [...prevFiles, ...mappedFiles]);
    }
  };

  const removeSelectedFile = (indexToRemove: number) => {
    setSelectedFiles((prevFiles) => {
      const fileToRemove = prevFiles[indexToRemove];
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prevFiles.filter((_, index) => index !== indexToRemove);
    });
  };

  const clearSelectedFiles = () => {
    setSelectedFiles((prevFiles) => {
      prevFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const uploadPhoto = useMutation({
    mutationFn: async () => {
      if (selectedFiles.length === 0) throw new Error("No files selected");

      const records = [];

      for (let index = 0; index < selectedFiles.length; index += 1) {
        const current = selectedFiles[index];
        const fileExt =
          current.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `task-photos/${projectId}/${taskId}/${Date.now()}-${index + 1}.${fileExt}`;

        setProgress(
          Math.round(((index + 1) / (selectedFiles.length * 2)) * 100),
        );

        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(fileName, current.file);

        if (uploadError) throw uploadError;

        records.push({
          task_id: taskId,
          project_id: projectId,
          file_path: fileName,
          caption: caption || null,
          uploaded_by: user!.id,
        });

        setProgress(
          Math.round(
            ((selectedFiles.length + index + 1) / (selectedFiles.length * 2)) *
              100,
          ),
        );
      }

      const { error: dbError } = await supabase
        .from("task_photos")
        .insert(records);

      if (dbError) throw dbError;

      setProgress(100);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-photos", taskId] });
      toast({
        title:
          selectedFiles.length > 1
            ? "Photos uploaded successfully"
            : "Photo uploaded successfully",
      });
      clearSelectedFiles();
      setCaption("");
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setProgress(0);
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) throw new Error("Photo not found");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("project-documents")
        .remove([photo.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("task_photos")
        .delete()
        .eq("id", photoId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-photos", taskId] });
      toast({ title: "Photo deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    setUploading(true);
    uploadPhoto.mutate();
  };

  const getPhotoUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from("project-documents")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {selectedFiles.length === 0 ? (
                    <>
                      <Camera className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, JPEG
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedFiles.length} file(s) selected
                    </p>
                  )}
                </div>
                <Input
                  id="photo-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedFiles.map((item, index) => (
                    <div
                      key={`${item.file.name}-${index}`}
                      className="relative rounded-lg overflow-hidden border"
                    >
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="h-24 w-full object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeSelectedFile(index)}
                        disabled={uploading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (Optional)</Label>
                  <Textarea
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a description or note about this photo..."
                    rows={2}
                    disabled={uploading}
                  />
                </div>

                {uploading && <Progress value={progress} className="w-full" />}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {selectedFiles.length > 1 ? "Photos" : "Photo"}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearSelectedFiles();
                      setCaption("");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photos Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Uploaded Photos ({photos.length})
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : photos.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                <Camera className="h-12 w-12 mb-3 opacity-50" />
                <p>No photos uploaded yet</p>
                <p className="text-sm mt-1">
                  Upload photos to document your work
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden group">
                <div className="relative aspect-video">
                  <img
                    src={getPhotoUrl(photo.file_path)}
                    alt={photo.caption || "Task photo"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The photo will be
                            permanently deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePhoto.mutate(photo.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardContent className="p-3">
                  {photo.caption && (
                    <p className="text-sm mb-2">{photo.caption}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(photo.uploaded_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    By {photo.profiles?.full_name || "Unknown"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
