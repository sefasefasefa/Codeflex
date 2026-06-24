import { Link, useLocation } from "wouter";
import {
  BrainCircuit,
  ArrowLeft, ShieldCheck, Settings2, Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: React.ElementType; desc: string };

const adminNav: NavItem[] = [
  { label: "Providers", href: "/providers", icon: BrainCircuit, desc: "LLM API anahtarları & modeller" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isActive = (href: string) => location.startsWith(href);

  return (
    <div className="flex min-h-screen bg-background text-foreground w-full">
      <aside className="w-64 shrink-0 border-r border-border flex flex-col bg-[#0a0a0a]">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-sm font-mono text-amber-400 tracking-wider">ADMIN PANEL</span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {adminNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group",
                  active
                    ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
                )}
              >
                <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-amber-400" : "text-muted-foreground group-hover:text-foreground")} />
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium font-mono leading-none", active ? "text-amber-400" : "")}>{item.label}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-sm font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            Uygulamaya dön
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        <div className="h-14 border-b border-border flex items-center px-6 gap-3 sticky top-0 bg-background/95 backdrop-blur z-10">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-muted-foreground">Admin Panel</span>
          <span className="text-muted-foreground/30">/</span>
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-sm font-mono text-amber-400">
            {adminNav.find(n => isActive(n.href))?.label ?? "Admin"}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="text-xs font-mono text-muted-foreground/40">system config</span>
          </div>
        </div>

        <div className="p-0">
          {children}
        </div>
      </main>
    </div>
  );
}
