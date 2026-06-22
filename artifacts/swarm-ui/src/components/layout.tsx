import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarInset,
} from "@/components/ui/sidebar";
import {
  Activity, Cpu, PlayCircle, HardDrive, FolderOpen,
  Layers, Terminal, SquareTerminal, BrainCircuit,
} from "lucide-react";
import { useGetStats, useListRuns } from "@workspace/api-client-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: stats } = useGetStats({ query: { refetchInterval: 5000 } });
  const { data: runs = [] } = useListRuns({ status: "running" }, { query: { refetchInterval: 3000 } });
  const activeRuns = runs.length;

  const mainNav = [
    { label: "Dashboard", href: "/", icon: Activity },
    { label: "Projects", href: "/projects", icon: Layers, badge: stats?.totalProjects },
  ];
  const pipelineNav = [
    { label: "Runs", href: "/runs", icon: PlayCircle, badge: activeRuns || undefined },
    { label: "Terminal", href: "/terminal", icon: SquareTerminal },
  ];
  const systemNav = [
    { label: "Models", href: "/models", icon: BrainCircuit },
    { label: "Agents", href: "/agents", icon: Cpu, badge: stats?.totalAgents },
    { label: "Snapshots", href: "/snapshots", icon: HardDrive },
    { label: "Workspace", href: "/workspace", icon: FolderOpen },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground w-full">
        <Sidebar className="border-r border-border">
          <SidebarContent>
            <div className="flex h-14 items-center px-4 border-b border-border gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              <span className="font-bold text-base font-mono text-primary">SWARM_CTRL</span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-mono text-green-400/70">online</span>
              </span>
            </div>

            <NavGroup label="MAIN" items={mainNav} isActive={isActive} />
            <NavGroup label="PIPELINE" items={pipelineNav} isActive={isActive} />
            <NavGroup label="SYSTEM" items={systemNav} isActive={isActive} />

            {stats && (
              <div className="mt-auto p-3 border-t border-border/50 space-y-1">
                <div className="text-xs font-mono text-muted-foreground flex justify-between">
                  <span>files written</span>
                  <span className="text-cyan-400">{stats.totalFiles}</span>
                </div>
                <div className="text-xs font-mono text-muted-foreground flex justify-between">
                  <span>total logs</span>
                  <span className="text-cyan-400">{stats.totalLogs}</span>
                </div>
              </div>
            )}
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1 bg-background overflow-hidden flex flex-col">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

type NavItem = { label: string; href: string; icon: React.ElementType; badge?: number };

function NavGroup({ label, items, isActive }: { label: string; items: NavItem[]; isActive: (href: string) => boolean }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-mono tracking-widest opacity-50">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(item.href)}>
                <Link href={item.href} className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-xs font-mono bg-primary/20 text-primary rounded px-1.5 py-0.5 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
