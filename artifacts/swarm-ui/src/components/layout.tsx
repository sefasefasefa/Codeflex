import { Link, useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarInset, SidebarTrigger,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Activity, PlayCircle,
  Layers, Terminal, SquareTerminal, MessageSquare, BotMessageSquare,
  Menu, MoreHorizontal, ShieldCheck,
} from "lucide-react";
import { useGetStats, useListRuns } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function MobileMoreButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 text-muted-foreground active:text-foreground transition-colors"
    >
      <MoreHorizontal className="w-5 h-5" />
      <span className="text-[10px] font-mono font-medium leading-none">More</span>
    </button>
  );
}

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
    { label: "Chat", href: "/chat", icon: MessageSquare },
    { label: "Ajan Sohbet", href: "/agent-chat", icon: BotMessageSquare },
    { label: "Runs", href: "/runs", icon: PlayCircle, badge: activeRuns || undefined },
    { label: "Terminal", href: "/terminal", icon: SquareTerminal },
  ];
  const systemNav = [
    { label: "Admin Panel", href: "/admin", icon: ShieldCheck },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const bottomNav = [
    { label: "Dashboard", href: "/", icon: Activity },
    { label: "Runs", href: "/runs", icon: PlayCircle, badge: activeRuns || undefined },
    { label: "Chat", href: "/chat", icon: MessageSquare },
    { label: "Terminal", href: "/terminal", icon: SquareTerminal },
  ];

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

        <SidebarInset className="flex-1 bg-background flex flex-col min-w-0 overflow-x-hidden">
          {/* Mobile top bar — hidden on desktop */}
          <header className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-border bg-background sticky top-0 z-20 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <Terminal className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm font-mono text-primary">SWARM_CTRL</span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-mono text-green-400/70">online</span>
            </span>
          </header>

          {/* Scrollable content — leaves room for mobile bottom nav */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)] md:pb-0">
            <div className="md:pb-0 pb-16">
              {children}
            </div>
          </div>

          {/* Mobile bottom navigation — hidden on desktop */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border flex items-stretch"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {bottomNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 transition-colors relative",
                  isActive(item.href)
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                {isActive(item.href) && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-primary text-primary-foreground rounded-full text-[10px] font-mono font-bold flex items-center justify-center px-0.5">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono font-medium leading-none">{item.label}</span>
              </Link>
            ))}

            {/* "More" button opens the sidebar drawer */}
            <MobileMoreButton />
          </nav>
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
