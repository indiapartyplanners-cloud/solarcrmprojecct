import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  type Lead,
  type LeadStatus,
  subscribeToLeads,
  updateLeadStatus,
} from "@/lib/leads";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS: LeadStatus[] = ["new", "in_review", "closed"];

const AdminCRM = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loadError, setLoadError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
      setAuthLoading(false);
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!adminUser) {
      setLeads([]);
      setLeadsLoading(false);
      return undefined;
    }

    setLeadsLoading(true);
    setLoadError("");

    const unsubscribe = subscribeToLeads(
      (incomingLeads) => {
        setLeads(incomingLeads);
        setLeadsLoading(false);
      },
      (error) => {
        setLeadsLoading(false);
        setLoadError(error.message);
      },
    );

    return unsubscribe;
  }, [adminUser]);

  const counts = useMemo(
    () => ({
      total: leads.length,
      quote: leads.filter((lead) => lead.type === "quote").length,
      contact: leads.filter((lead) => lead.type === "contact").length,
    }),
    [leads],
  );

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast({
        title: "Missing credentials",
        description: "Enter admin email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast({ title: "Login successful", description: "Welcome to Admin CRM." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in.";
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleStatusChange = async (lead: Lead, status: LeadStatus) => {
    try {
      await updateLeadStatus(lead.type, lead.id, status);
      toast({ title: "Lead updated", description: "Status has been updated." });
    } catch (_error) {
      toast({
        title: "Update failed",
        description: "Please retry in a few seconds.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast({ title: "Signed out", description: "Admin session ended." });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-md rounded-xl border bg-card p-6 text-center">
          Checking admin session...
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6">
          <h1 className="text-2xl font-bold">Admin CRM Login</h1>
          <p className="text-sm text-muted-foreground">
            Sign in using your Firebase admin email and password.
          </p>
          <input
            type="email"
            className="w-full rounded-md border bg-background px-3 py-2"
            placeholder="Admin email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded-md border bg-background px-3 py-2"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />
          <Button onClick={() => void handleLogin()} disabled={isSigningIn}>
            {isSigningIn ? "Signing in..." : "Sign In"}
          </Button>
          <Link to="/" className="block text-sm text-solar-dim">
            Back to website
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin CRM</h1>
            <p className="text-muted-foreground">
              Manage quote requests and contact inquiries from the website.
            </p>
            <p className="text-xs text-muted-foreground">
              Signed in as: {adminUser.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void handleLogout()}>
              Sign Out
            </Button>
            <Link to="/">
              <Button variant="outline">Back to Website</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Leads</p>
            <p className="text-3xl font-bold">{counts.total}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Quote Requests</p>
            <p className="text-3xl font-bold">{counts.quote}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Contact Inquiries</p>
            <p className="text-3xl font-bold">{counts.contact}</p>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load leads: {loadError}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {leadsLoading ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                    No leads yet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b align-top">
                    <td className="px-3 py-2 capitalize">{lead.type}</td>
                    <td className="px-3 py-2">{lead.fullName}</td>
                    <td className="px-3 py-2">
                      <p>{lead.email}</p>
                      <p>{lead.phone}</p>
                    </td>
                    <td className="px-3 py-2">{lead.serviceInterest || "-"}</td>
                    <td className="max-w-xs px-3 py-2">{lead.message || "-"}</td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-md border bg-background px-2 py-1"
                        value={lead.status || "new"}
                        onChange={(e) =>
                          void handleStatusChange(
                            lead,
                            e.target.value as LeadStatus,
                          )
                        }
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCRM;
