import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Users, Search, Shield, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppRole =
  | "admin"
  | "sales"
  | "engineering"
  | "procurement"
  | "execution"
  | "client";

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  sales: "Sales",
  engineering: "Engineering",
  procurement: "Procurement",
  execution: "Execution",
  client: "Client",
};

const roleColors: Record<AppRole, string> = {
  admin: "bg-red-500/20 text-red-700 dark:text-red-300",
  sales: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  engineering: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  procurement: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  execution: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
  client: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
};

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const userRolesMap = roles.reduce(
        (acc: Record<string, string[]>, r: any) => {
          if (!acc[r.user_id]) acc[r.user_id] = [];
          acc[r.user_id].push(r.role);
          return acc;
        },
        {},
      );

      return profiles.map((p) => ({
        ...p,
        roles: userRolesMap[p.user_id] || [],
      }));
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setForm({ email: "", password: "", full_name: "" });
      toast({
        title: "User created",
        description: "User has been invited via email",
      });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateUserRoles = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;

      // Delete existing roles
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.user_id);

      // Insert new roles
      if (selectedRole) {
        const { error } = await supabase.from("user_roles").insert({
          user_id: selectedUser.user_id,
          role: selectedRole,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole(null);
      toast({ title: "Roles updated" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: async (user: any) => {
      if (!user?.user_id) return;

      await supabase.from("user_roles").delete().eq("user_id", user.user_id);
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", user.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User deleted" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openRoleDialog = (user: any) => {
    setSelectedUser(user);
    setSelectedRole(user.roles?.[0] || null);
    setRoleDialogOpen(true);
  };

  const filtered = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {users.length} total users
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUser.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Initial Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                User will receive an email confirmation. Assign roles after
                creation.
              </p>
              <Button
                type="submit"
                className="w-full"
                disabled={createUser.isPending}
              >
                {createUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "—"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No roles assigned
                          </span>
                        ) : (
                          <Badge
                            key={user.roles[0]}
                            variant="secondary"
                            className={roleColors[user.roles[0] as AppRole]}
                          >
                            {roleLabels[user.roles[0] as AppRole]}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRoleDialog(user)}
                        >
                          <Shield className="h-3 w-3 mr-1" /> Manage Roles
                        </Button>
                        {user.roles?.[0] !== "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const confirmed = window.confirm(
                                "Delete this user? This cannot be undone.",
                              );
                              if (confirmed) deleteUser.mutate(user);
                            }}
                            disabled={deleteUser.isPending}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Manage Roles: {selectedUser?.full_name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a role for this user:
            </p>
            <RadioGroup
              value={selectedRole || ""}
              onValueChange={(value) => setSelectedRole(value as AppRole)}
              className="space-y-2"
            >
              {Object.entries(roleLabels).map(([role, label]) => (
                <div key={role} className="flex items-center space-x-2">
                  <RadioGroupItem id={role} value={role} />
                  <Label
                    htmlFor={role}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <Badge
                      variant="secondary"
                      className={roleColors[role as AppRole]}
                    >
                      {label}
                    </Badge>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              onClick={() => updateUserRoles.mutate()}
              className="w-full"
              disabled={updateUserRoles.isPending}
            >
              {updateUserRoles.isPending ? "Saving..." : "Save Roles"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
