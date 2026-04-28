import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  FileText,
  ClipboardCheck,
  Camera,
  BookOpen,
  Eye,
  Package,
  LogOut,
  User,
  Users,
  ListChecks,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth-routing";

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Deals", url: "/admin/projects", icon: FolderKanban },
  { title: "Work Orders", url: "/admin/tasks", icon: ListTodo },
  { title: "Form Checklist", url: "/admin/checklists", icon: ListChecks },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: ClipboardList },
  { title: "Users", url: "/admin/users", icon: Users },
];

const salesItems = [
  { title: "Dashboard", url: "/sales", icon: LayoutDashboard },
];

const engineeringItems = [
  { title: "Dashboard", url: "/engineering", icon: LayoutDashboard },
  { title: "My Tasks", url: "/engineering/tasks", icon: ClipboardCheck },
  { title: "Documents", url: "/engineering/documents", icon: FileText },
];

const procurementItems = [
  { title: "Dashboard", url: "/procurement", icon: LayoutDashboard },
];

const executionItems = [
  { title: "Dashboard", url: "/execution", icon: LayoutDashboard },
  { title: "My Tasks", url: "/execution/tasks", icon: ClipboardCheck },
  { title: "Documents", url: "/execution/documents", icon: FileText },
  { title: "Daily Logs", url: "/execution/logs", icon: BookOpen },
  { title: "Photos", url: "/execution/photos", icon: Camera },
];

const clientItems = [
  { title: "My Projects", url: "/client", icon: Eye },
  { title: "Document Access", url: "/client/documents", icon: FileText },
  { title: "Closeout Access", url: "/client/closeout", icon: Package },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { roles, profile, signOut } = useAuth();

  const roleOrder: AppRole[] = [
    "admin",
    "sales",
    "engineering",
    "procurement",
    "execution",
    "client",
  ];
  const effectiveRole = roleOrder.find((role) => roles.includes(role)) ?? null;

  const isAdmin = effectiveRole === "admin";
  const isSales = effectiveRole === "sales";
  const isEngineering = effectiveRole === "engineering";
  const isProcurement = effectiveRole === "procurement";
  const isExecution = effectiveRole === "execution";
  const isClient = effectiveRole === "client";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div
        className={`border-b border-sidebar-border ${collapsed ? "px-2 py-3" : "px-4 py-4"}`}
      >
        <div
          className={`flex ${collapsed ? "justify-center" : "justify-start"} ${collapsed ? "min-h-[40px]" : "min-h-[98px]"}`}
        >
          {collapsed ? (
            <img
              src="/logo.png"
              alt="Element"
              className="h-10 w-10 object-contain"
            />
          ) : (
            <div className="h-[86px] w-[250px] max-w-full overflow-hidden">
              <img
                src="/logo.png"
                alt="Element"
                className="h-full w-full origin-left object-contain object-left scale-[1.9] drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)]"
              />
            </div>
          )}
        </div>
      </div>

      <SidebarContent>
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs tracking-wider">
                Administration
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin"}
                        className={`hover:bg-sidebar-accent flex items-center ${collapsed ? "justify-center" : ""}`}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon
                          className={`h-4 w-4 flex-shrink-0 ${!collapsed ? "mr-2" : ""}`}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSales && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs tracking-wider">
                Sales
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {salesItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/sales"}
                        className={`hover:bg-sidebar-accent flex items-center ${collapsed ? "justify-center" : ""}`}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon
                          className={`h-4 w-4 flex-shrink-0 ${!collapsed ? "mr-2" : ""}`}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isEngineering && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs tracking-wider">
                Engineering
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {engineeringItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/engineering"}
                        className={`hover:bg-sidebar-accent flex items-center ${collapsed ? "justify-center" : ""}`}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon
                          className={`h-4 w-4 flex-shrink-0 ${!collapsed ? "mr-2" : ""}`}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isProcurement && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs tracking-wider">
                Procurement
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {procurementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/procurement"}
                        className={`hover:bg-sidebar-accent flex items-center ${collapsed ? "justify-center" : ""}`}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon
                          className={`h-4 w-4 flex-shrink-0 ${!collapsed ? "mr-2" : ""}`}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isExecution && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs tracking-wider">
                Execution
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {executionItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/execution"}
                        className={`hover:bg-sidebar-accent flex items-center ${collapsed ? "justify-center" : ""}`}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon
                          className={`h-4 w-4 flex-shrink-0 ${!collapsed ? "mr-2" : ""}`}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isClient && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs tracking-wider">
                Client Portal
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {clientItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className={`hover:bg-sidebar-accent flex items-center ${collapsed ? "justify-center" : ""}`}
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon
                          className={`h-4 w-4 flex-shrink-0 ${!collapsed ? "mr-2" : ""}`}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div
          className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <User className="h-4 w-4 text-sidebar-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {profile?.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className={`flex-shrink-0 text-sidebar-foreground hover:text-destructive ${collapsed ? "hidden" : ""}`}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
