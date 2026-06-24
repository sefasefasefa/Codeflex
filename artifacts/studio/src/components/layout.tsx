import { Link, useLocation } from "wouter";
import { MessageSquare, Folder, Settings, LayoutDashboard, LogOut, Terminal, Menu, X } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/chat",     icon: MessageSquare, label: "Sohbet" },
  { href: "/projects", icon: LayoutDashboard, label: "Projeler" },
  { href: "/files",    icon: Folder,         label: "Dosyalar" },
  { href: "/settings", icon: Settings,        label: "Ayarlar" },
];

function Avatar({ user }: { user: { firstName?: string | null; profileImageUrl?: string | null } }) {
  if (user?.profileImageUrl) {
    return (
      <img
        src={user.profileImageUrl}
        alt="Kullanici"
        className="w-8 h-8 rounded-full border border-white/10 object-cover"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300">
      {user?.firstName?.[0]?.toUpperCase() || "K"}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">AI Studio</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                    active
                      ? "bg-indigo-600/20 text-indigo-300 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  data-testid={`nav-${item.href.slice(1)}`}
                >
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-indigo-400" : ""}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-border p-3 flex items-center gap-2.5">
          <Avatar user={user ?? {}} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.firstName || "Kullanici"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email || ""}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            title="Cikis Yap"
            data-testid="button-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">AI Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar user={user ?? {}} />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute top-14 right-0 bottom-0 w-64 bg-card border-l border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex-1 py-3 px-2 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all text-sm ${
                        active
                          ? "bg-indigo-600/20 text-indigo-300 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <item.icon className={`w-4 h-4 ${active ? "text-indigo-400" : ""}`} />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-4">
              <button
                onClick={() => { setMobileOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cikis Yap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden relative md:mt-0 mt-14">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                  active ? "text-indigo-400" : "text-muted-foreground"
                }`}
                data-testid={`mobile-nav-${item.href.slice(1)}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
