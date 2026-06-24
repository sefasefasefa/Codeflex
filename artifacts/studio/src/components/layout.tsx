import { Link, useLocation } from "wouter";
import { MessageSquare, Folder, Settings, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/chat", icon: MessageSquare, label: "Sohbet" },
    { href: "/projects", icon: LayoutDashboard, label: "Projeler" },
    { href: "/files", icon: Folder, label: "Dosyalar" },
    { href: "/settings", icon: Settings, label: "Ayarlar" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="w-16 border-r border-border bg-card flex flex-col items-center py-4 flex-shrink-0">
        <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center text-primary font-bold mb-8">
          AI
        </div>
        
        <nav className="flex-1 flex flex-col gap-4 w-full px-2">
          {navItems.map((item) => {
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`} title={item.label}>
                  <item.icon className="w-5 h-5" />
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 flex flex-col items-center gap-4 w-full px-2 border-t border-border">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="User" className="w-10 h-10 rounded-full border border-border" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-medium">
              {user?.firstName?.[0] || "U"}
            </div>
          )}
          <button 
            onClick={logout}
            className="w-12 h-12 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Çıkış Yap"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}