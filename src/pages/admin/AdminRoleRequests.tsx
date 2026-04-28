import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, UserCheck } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const AdminRoleRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["role-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("role_requests")
        .select("*, profiles!role_requests_user_id_fkey(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await (supabase as any).rpc(
        "approve_role_request",
        {
          p_request_id: requestId,
          p_admin_id: user?.id,
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-requests"] });
      toast({ title: "Role request approved successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to approve request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason: string;
    }) => {
      const { data, error } = await (supabase as any).rpc(
        "reject_role_request",
        {
          p_request_id: requestId,
          p_admin_id: user?.id,
          p_reason: reason || null,
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-requests"] });
      toast({ title: "Role request rejected" });
      setRejectionReason("");
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reject request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-300"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-blue-100 text-blue-800 border-blue-300",
      sales: "bg-amber-100 text-amber-800 border-amber-300",
      engineering: "bg-blue-100 text-blue-800 border-blue-300",
      procurement: "bg-amber-100 text-amber-800 border-amber-300",
      execution: "bg-indigo-100 text-indigo-800 border-indigo-300",
      client: "bg-amber-100 text-amber-800 border-amber-300",
      project_manager: "bg-amber-100 text-amber-800 border-amber-300",
      engineer: "bg-blue-100 text-blue-800 border-blue-300",
      qa_manager: "bg-amber-100 text-amber-800 border-amber-300",
      customer: "bg-amber-100 text-amber-800 border-amber-300",
    };
    return (
      <Badge variant="outline" className={colors[role] || ""}>
        {role}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading role requests...</div>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UserCheck className="h-8 w-8 text-primary" />
          Role Requests
        </h1>
        <p className="text-muted-foreground mt-1">
          Approve or reject user role requests
        </p>
      </div>

      {/* Pending Requests */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Pending Requests ({pendingRequests.length})</span>
            {pendingRequests.length > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700">
                {pendingRequests.length} awaiting review
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending role requests</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => {
                  const profile = (request as any).profiles;
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {profile?.full_name || "Unknown User"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {profile?.email || "No email"}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(request.requested_role)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-amber-600 hover:text-amber-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Approve Role Request
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to approve the{" "}
                                  {request.requested_role} role for{" "}
                                  {profile?.full_name || "this user"}? This will
                                  grant them immediate access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    approveRequest.mutate(request.id)
                                  }
                                  className="bg-amber-600 hover:bg-amber-700"
                                >
                                  Approve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog
                            onOpenChange={(open) => {
                              if (open) setSelectedRequest(request.id);
                              else {
                                setSelectedRequest(null);
                                setRejectionReason("");
                              }
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Reject Role Request
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Provide a reason for rejecting this request
                                  (optional):
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Textarea
                                placeholder="Enter rejection reason..."
                                value={rejectionReason}
                                onChange={(e) =>
                                  setRejectionReason(e.target.value)
                                }
                                className="min-h-[100px]"
                              />
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    rejectRequest.mutate({
                                      requestId: request.id,
                                      reason: rejectionReason,
                                    })
                                  }
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Reject
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests History */}
      {processedRequests.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Rejection Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.map((request) => {
                  const profile = (request as any).profiles;
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {profile?.full_name || "Unknown User"}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(request.requested_role)}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.rejection_reason || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminRoleRequests;
