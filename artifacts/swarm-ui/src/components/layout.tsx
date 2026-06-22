import { Link, useLocation } from "wouter";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Activity, Cpu, PlayCircle, HardDrive, FolderOpen } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { label: "Dashboard", href: "/", icon: Activity },
    { label: "Runs", href: "/runs", icon: PlayCircle },
    { label: "Agents", href: "/agents", icon: Cpu },
    { label: "Snapshots", href: "/snapshots", icon: HardDrive },
    { label: "Workspace", href: "/workspace", icon: FolderOpen },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground w-full">
        <Sidebar className="border-r border-border">
          <SidebarContent>
            <div className="flex h-14 items-center px-4 border-b border-border">
              <span className="font-bold text-lg font-mono text-primary flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                SWARM_CTRL
              </span>
            </div>
            <SidebarGroup>
              <SidebarGroupLabel>Orchestration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={location === item.href}>
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1 bg-background overflow-hidden flex flex-col">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
