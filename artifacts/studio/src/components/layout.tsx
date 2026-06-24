import { Link, useLocation } from "wouter";
import { MessageSquare, Globe, Monitor, Plus, Settings, LogOut } from "lucide-react";
import { useUser, useClerk } from "@clerk/react";

const NAV_ITEMS = [
  { href: "/chat",     icon: MessageSquare, label: "Sohbet" },
  { href: "/projects", icon: Monitor,       label: "Projeler" },
  { href: "/settings", icon: Settings,      label: "Ayarlar" },
];

function SwarmIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="7" cy="7" r="3.2" />
      <circle cx="17" cy="7" r="3.2" />
      <circle cx="7" cy="17" r="3.2" />
      <circle cx="17" cy="17" r="3.2" />
    </svg>
  );
}

function UserAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  const { user } = useUser();
  const dim = size === "md" ? "w-10 h-10" : "w-8 h-8";
  const text = size === "md" ? "text-sm" : "text-xs";
  if (user?.imageUrl) {
    return <img src={user.imageUrl} alt="Profil" className={`${dim} rounded-xl border border-white/10 object-cover`} />;
  }
  return (
    <div className={`${dim} rounded-xl bg-white/10 border border-white/10 flex items-center justify-center ${text} font-semibold text-white/70`}>
      {user?.firstName?.[0]?.toUpperCase() || "K"}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL?.replace(/\/+$/, "") || "";

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#080b14] text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-white/5 bg-[#0d1117] shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/5">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
            <SwarmIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">AI Studio</span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                  active ? "bg-indigo-600/20 text-indigo-300 font-medium" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}>
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-indigo-400" : ""}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-3 flex items-center gap-2.5">
          <UserAvatar />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate text-white/80">Profil</div>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="p-1.5 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
            title="Çıkış Yap"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-[72px] md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav — matches image style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-[72px] bg-[#111318]/95 backdrop-blur-xl border-t border-white/5">
        {/* Avatar */}
        <Link href="/settings">
          <button className="flex items-center justify-center">
            <UserAvatar size="md" />
          </button>
        </Link>

        {/* Center icon group */}
        <div className="flex items-center gap-1 bg-[#1c1f27] rounded-2xl px-2 py-1.5">
          {/* Monitor / Projects */}
          <Link href="/projects">
            <button className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all ${
              isActive("/projects") ? "bg-indigo-600/20 text-indigo-400" : "text-white/40 hover:text-white hover:bg-white/5"
            }`}>
              <Monitor className="w-5 h-5" />
            </button>
          </Link>

          {/* Swarm / Chat — primary active */}
          <Link href="/chat">
            <button className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all ${
              isActive("/chat") ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "text-white/40 hover:text-white hover:bg-white/5"
            }`}>
              <SwarmIcon className="w-5 h-5" />
            </button>
          </Link>

          {/* Globe / Web */}
          <Link href="/files">
            <button className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all ${
              isActive("/files") ? "bg-indigo-600/20 text-indigo-400" : "text-white/40 hover:text-white hover:bg-white/5"
            }`}>
              <Globe className="w-5 h-5" />
            </button>
          </Link>
        </div>

        {/* Plus — new chat */}
        <Link href="/chat">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            onClick={() => {
              window.location.href = `${basePath}/chat`;
            }}
          >
            <Plus className="w-5 h-5" />
          </button>
        </Link>
      </nav>
    </div>
  );
}
