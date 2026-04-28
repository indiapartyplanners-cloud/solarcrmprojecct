import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  deriveRolesFromMetadata,
  normalizeRoles,
  resolveRoleHomeRoute,
  type AppRole,
} from "@/lib/auth-routing";

type AuthMode = "login" | "signup";

interface AuthScreenProps {
  mode: AuthMode;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const lifecycleHighlights = [
  "Pipeline-to-closeout visibility for every solar project",
  "Faster team coordination across sales, design, and field delivery",
  "Client-ready updates, documents, and execution tracking in one place",
];

const roleOptions: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales" },
  { value: "engineering", label: "Engineering" },
  { value: "procurement", label: "Procurement" },
  { value: "execution", label: "Execution" },
  { value: "client", label: "Client" },
];

export const AuthScreen = ({ mode }: AuthScreenProps) => {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("sales");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const ctaText = useMemo(() => {
    return isSignup ? "Create Account" : "Sign In";
  }, [isSignup]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (isSignup && !fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailRegex.test(email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (isSignup && password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (isSignup) {
      if (!selectedRole) {
        nextErrors.role = "Please select a role.";
      }

      if (!confirmPassword) {
        nextErrors.confirmPassword = "Please confirm your password.";
      } else if (confirmPassword !== password) {
        nextErrors.confirmPassword = "Passwords do not match.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resolveRolesForRouting = async (
    userId: string,
    metadata: Record<string, unknown> | undefined,
  ) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) return deriveRolesFromMetadata(metadata);

    const dbRoles = normalizeRoles((data || []).map((item) => item.role));
    if (dbRoles.length > 0) return dbRoles;

    return deriveRolesFromMetadata(metadata);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrors({ form: error.message });
      setLoading(false);
      return;
    }

    const authUser = data.user;
    const roles = await resolveRolesForRouting(authUser.id, {
      ...(authUser.user_metadata ?? {}),
      ...(authUser.app_metadata ?? {}),
    });

    navigate(resolveRoleHomeRoute(roles as AppRole[]), { replace: true });
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: selectedRole,
          },
        },
      });

      if (error) {
        setErrors({ form: error.message });
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrors({ form: "Could not create account. Please try again." });
        setLoading(false);
        return;
      }

      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          toast({
            title: "Signup complete",
            description: "Please sign in to continue.",
          });
          navigate("/login", { replace: true });
          setLoading(false);
          return;
        }
      }

      const { error: roleError, status } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role: selectedRole });

      if (roleError && roleError.code !== "23505" && status !== 409) {
        setErrors({ form: roleError.message });
        setLoading(false);
        return;
      }

      toast({ title: "Account created successfully" });
      navigate(resolveRoleHomeRoute([selectedRole]), { replace: true });
    } catch (_error) {
      setErrors({ form: "An unexpected error occurred. Please try again." });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#eef0f5]">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#324b62] p-10 text-[#10253a]">
        <img
          src="/image.png"
          alt="Rooftop solar installation"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(12,30,50,0.5),rgba(14,34,56,0.38)_48%,rgba(176,124,26,0.26))]" />
        <div className="absolute -top-32 -right-20 h-72 w-72 rounded-full bg-[#f4c742]/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#7ccf8f]/28 blur-3xl" />
        <div className="absolute -right-28 top-0 h-full w-[260px] bg-[#f0b428]/22 -skew-x-[28deg]" />
        <div className="absolute -right-10 top-0 h-full w-[160px] bg-[#d99a1a]/18 -skew-x-[28deg]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_36%),radial-gradient(circle_at_80%_80%,rgba(148,226,172,0.2),transparent_34%)]" />

        <div className="relative z-10 w-fit">
          <img
            src="/logo.png"
            alt="Element"
            className="h-44 w-auto object-contain"
          />
          <p className="mt-2 w-fit rounded-md border border-[#d3dcea] bg-white px-2 py-1 text-[11px] font-medium text-[#0f2940]">
            Solar Project Intelligence Platform - Designed by Solar Power Depot
          </p>
        </div>
        <div className="mt-10"></div>

        <div className="relative z-10 max-w-lg space-y-6 rounded-2xl border border-[#cfd8e6] bg-white p-6 shadow-2xl shadow-black/10">
          <h2 className="text-4xl font-bold leading-tight">
            Scale your solar business from lead to energized system.
          </h2>
          <p className="text-[#20364d]/95 text-base leading-relaxed">
            A professional workspace for managing opportunities, projects, field
            execution, and customer delivery.
          </p>

          <div className="space-y-3">
            {lifecycleHighlights.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-[#d3dcea] bg-white px-4 py-3"
              >
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-[#132b42]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 w-fit rounded-lg border border-[#d3dcea] bg-white px-3 py-2 text-xs text-[#0f2940]">
          Built for high-performance solar EPC and project operations teams.
        </div>
      </aside>

      <main className="relative flex items-center justify-center overflow-hidden bg-[#eef0f5] p-6 sm:p-10 lg:p-12">
        <img
          src="/image.png"
          alt="Solar panel field background"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.22]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(255,209,92,0.16),transparent_30%),radial-gradient(circle_at_85%_90%,rgba(86,153,213,0.12),transparent_34%)]" />
        <div className="relative w-full max-w-lg space-y-4 animate-slide-in">
          <div className="lg:hidden flex flex-col items-center justify-center gap-2 text-center">
            <img
              src="/logo.png"
              alt="Element"
              className="h-24 w-auto object-contain"
            />
            <div>
              <p className="text-[11px] text-muted-foreground/90 mt-1">
                Solar Project Intelligence Platform - Designed by Solar Power
                Depot
              </p>
              <p className="font-semibold">Solar Business Platform</p>
            </div>
          </div>

          <Card className="w-full shadow-2xl border border-[#d2d6df] backdrop-blur-sm bg-[#eef1f6]/95 transition-all duration-300 rounded-3xl">
            <CardHeader className="space-y-2 pb-4">
              <div className="flex items-center gap-2 text-[#8A6A00]">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Secure Workspace Access
                </span>
              </div>
              <CardTitle className="text-3xl tracking-tight text-[#131b2e]">
                {isSignup ? "Create your account" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-[#5f6779]">
                {isSignup
                  ? "Create your account and start managing solar workflows with your team."
                  : "Sign in to continue managing projects, tasks, and client delivery."}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={isSignup ? handleSignup : handleLogin}
                className="space-y-4"
              >
                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Solar"
                      className="h-11 transition-all duration-200 bg-[#d9e0ec]/65 border-[#c5cfdd] focus-visible:ring-[#D4A017]/50"
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">
                        {errors.fullName}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-11 transition-all duration-200 bg-[#d9e0ec]/65 border-[#c5cfdd] focus-visible:ring-[#D4A017]/50"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 pr-10 transition-all duration-200 bg-[#d9e0ec]/65 border-[#c5cfdd] focus-visible:ring-[#D4A017]/50"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>

                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(value) => {
                        setSelectedRole(value as AppRole);
                        if (errors.role) {
                          setErrors((prev) => {
                            const { role, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                    >
                      <SelectTrigger
                        id="role"
                        className="h-11 transition-all duration-200 bg-[#d9e0ec]/65 border-[#c5cfdd] focus-visible:ring-[#D4A017]/50"
                      >
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.role && (
                      <p className="text-sm text-destructive">{errors.role}</p>
                    )}
                  </div>
                )}

                {isSignup && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-11 pr-10 transition-all duration-200 bg-[#d9e0ec]/65 border-[#c5cfdd] focus-visible:ring-[#D4A017]/50"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-8 w-8"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}

                {errors.form && (
                  <p className="text-sm text-destructive">{errors.form}</p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-medium bg-[#D4A017] text-white hover:bg-[#C79412]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isSignup ? "Creating account..." : "Signing in..."}
                    </>
                  ) : (
                    <>
                      {ctaText}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="h-px w-full bg-border/70" />

                <p className="text-sm text-[#6a7282] text-center">
                  {isSignup
                    ? "Already have an account?"
                    : "Don't have an account?"}{" "}
                  <Link
                    to={isSignup ? "/login" : "/signup"}
                    className="text-[#8A6A00] font-semibold hover:text-[#725700] transition-colors"
                  >
                    {isSignup ? "Sign in" : "Create one"}
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-[#6f7685]">
            Trusted workspace for modern solar operations teams.
          </p>
        </div>
      </main>
    </div>
  );
};
