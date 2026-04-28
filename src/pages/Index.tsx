import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveRoleHomeRoute } from "@/lib/auth-routing";
import Landing from "./Landing";

const Index = () => {
  const { user, roles, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!user) return <Landing />;

  const homeRoute = resolveRoleHomeRoute(roles);
  if (homeRoute !== "/") {
    return <Navigate to={homeRoute} replace />;
  }

  // Fallback — authenticated but unrecognised role combination
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Role Assignment Required</h1>
          <p className="text-muted-foreground">
            Your account is active, but no valid role is assigned. If you are a
            client user, sign out and sign in again; otherwise contact an admin.
          </p>
        </div>
        <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
          Signed in as{" "}
          <span className="font-medium text-foreground">{user.email}</span>
        </div>
        <Button variant="outline" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Index;
