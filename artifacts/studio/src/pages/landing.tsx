import { useAuth } from "@workspace/replit-auth-web";
import { useState, useEffect } from "react";
import { Terminal, Zap, Brain, FolderCode, History, Key, ArrowRight, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";

const CLI_LINES = [
  { delay: 0,    text: "$ ais status",                         type: "cmd" },
  { delay: 600,  text: "  Sunucu: http://localhost:8080  OK",   type: "ok" },
  { delay: 900,  text: "  Modeller: 4 aktif",                  type: "info" },
  { delay: 1200, text: "$ ais list projects",                   type: "cmd" },
  { delay: 1800, text: "  [1] swarm-ctrl      (aktif, 12 run)", type: "info" },
  { delay: 2100, text: "  [2] my-api-project  (aktif, 4 run)",  type: "info" },
  { delay: 2500, text: "$ ais chat 'Bir Express API yaz'",      type: "cmd" },
  { delay: 3200, text: "  Yanit: Tabii! Önce bağımlılıkları...",type: "ai" },
];

const FEATURES = [
  { icon: Brain, title: "Yapay Zeka Sohbeti", desc: "Ollama, GPT-4, Claude ve daha fazlasıyla doğal dil ile kod yazın, hataları bulun, mimarı tartışın." },
  { icon: FolderCode, title: "Dosya Yönetimi", desc: "Ajan tarafından oluşturulan dosyaları görüntüleyin, düzenleyin. Versiyon geçmişine tek tıkla erişin." },
  { icon: Terminal, title: "CLI Arayüzü", desc: "Terminal veya tarayıcıdan aynı gücü kullanın. VSCode, CMD, iTerm — her yerde çalışır." },
  { icon: Zap, title: "Token Sıkıştırma", desc: "Uzun mesajlar otomatik sıkıştırılır. Daha az maliyet, daha hızlı yanıt, daha geniş bağlam." },
  { icon: History, title: "Sohbet Geçmişi", desc: "Tüm konuşmalarınız kaydedilir. Proje bazlı filtreleme, arama ve geçmişe dönme desteği." },
  { icon: Key, title: "API Anahtarları", desc: "Kendi uygulamalarınızı entegre edin. Giriş yapın, anahtar oluşturun ve API'yi kullanmaya başlayın." },
];

function CliDemo() {
  const [visible, setVisible] = useState<number[]>([]);

  useEffect(() => {
    CLI_LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisible((v) => [...v, i]);
      }, line.delay);
      return () => clearTimeout(t);
    });
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-sm overflow-hidden shadow-2xl w-full max-w-xl mx-auto">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-white/40 font-mono">AI Studio CLI</span>
      </div>
      <div className="p-4 font-mono text-sm space-y-1 min-h-[220px]">
        {CLI_LINES.map((line, i) => (
          <div
            key={i}
            className={`transition-all duration-300 ${
              visible.includes(i) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            } ${
              line.type === "cmd"  ? "text-cyan-400" :
              line.type === "ok"   ? "text-green-400" :
              line.type === "ai"   ? "text-purple-300" :
              "text-white/60"
            }`}
          >
            {line.text}
          </div>
        ))}
        {visible.length === CLI_LINES.length && (
          <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
}

function LoginButton({
  onClick,
  pending,
  variant = "primary",
  children,
  className = "",
}: {
  onClick: () => void;
  pending: boolean;
  variant?: "primary" | "small";
  children: React.ReactNode;
  className?: string;
}) {
  if (variant === "small") {
    return (
      <button
        onClick={onClick}
        disabled={pending}
        className={`relative flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all overflow-hidden ${
          pending
            ? "bg-indigo-700 cursor-wait"
            : "bg-indigo-600 hover:bg-indigo-500"
        } ${className}`}
      >
        {pending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Giriş yapılıyor...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all overflow-hidden shadow-lg shadow-indigo-600/20 ${
        pending
          ? "bg-indigo-700 cursor-wait"
          : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]"
      } ${className}`}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Giriş yapılıyor...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default function Landing() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const [pending, setPending] = useState(false);

  const handleLogin = () => {
    setPending(true);
    login();
  };

  const isPending = pending || isLoading;

  return (
    <div className="min-h-screen bg-[#080b14] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">AI Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#ozellikler" className="hidden sm:block text-sm text-white/50 hover:text-white transition-colors">Ozellikler</a>
            <a href="#cli" className="hidden sm:block text-sm text-white/50 hover:text-white transition-colors">CLI</a>
            <a href="#api" className="hidden sm:block text-sm text-white/50 hover:text-white transition-colors">API</a>
            <LoginButton onClick={handleLogin} pending={isPending} variant="small">
              Giriş Yap
            </LoginButton>
          </div>
        </div>
      </nav>

      {/* Pending overlay banner */}
      {isPending && (
        <div className="fixed top-14 left-0 right-0 z-40 flex items-center justify-center gap-2 py-2 bg-indigo-600/90 backdrop-blur-sm text-sm font-medium text-white animate-in fade-in slide-in-from-top-2 duration-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Replit ile giriş penceresi açılıyor...
        </div>
      )}

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-6">
            <Zap className="w-3 h-3" />
            Otomatik token sikistirma aktif
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Yapay Zeka ile<br />
            <span className="text-indigo-400">Kod Gelistir</span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Terminal veya tarayici — nerede olursaniz olun AI Studio ile proje yonetin,
            dosyalari goruntuleyin, yapay zekayla sohbet edin ve API anahtarlariyla
            kendi uygulamalarinizi entegre edin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <LoginButton
              onClick={handleLogin}
              pending={isPending}
              className="w-full sm:w-auto text-base"
            >
              Giriş Yap — Replit ile
              <ArrowRight className="w-4 h-4" />
            </LoginButton>
            <a
              href="#cli"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border border-white/10 hover:border-white/20 transition-all text-base text-white/70 hover:text-white"
            >
              CLI Kurulumu
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* CLI Demo */}
      <section id="cli" className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Terminal'den Yonet</h2>
            <p className="text-white/50 text-base max-w-xl mx-auto">
              CLI araci VSCode terminali, CMD veya iTerm'de calisir. API sunucusuna baglanir ve tum ozellikleri komut satirindan sunar.
            </p>
          </div>
          <CliDemo />
        </div>
      </section>

      {/* CLI Kurulum */}
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold text-sm text-white/50 uppercase tracking-wider mb-4">Kurulum</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex items-start gap-3">
                <span className="text-white/30 select-none mt-0.5">1</span>
                <span className="text-cyan-400">cd lib/cli && node build.mjs</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-white/30 select-none mt-0.5">2</span>
                <span className="text-cyan-400">node lib/cli/dist/cli.mjs status</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold text-sm text-white/50 uppercase tracking-wider mb-4">Komutlar</h3>
            <div className="space-y-1.5 font-mono text-sm">
              {[
                ["status", "Sunucu durumu"],
                ["list projects", "Projeleri listele"],
                ["create project <ad>", "Proje olustur"],
                ["chat <mesaj>", "Yapay zeka ile konusv"],
                ["models", "Model listesi"],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="flex items-center gap-2 text-xs">
                  <span className="text-cyan-400 shrink-0">{cmd}</span>
                  <span className="text-white/30 shrink-0">—</span>
                  <span className="text-white/50">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ozellikler" className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Tum Ozellikler</h2>
            <p className="text-white/50 max-w-xl mx-auto">Bir AI gelistirme ortamindan beklediginiz her sey, tek platformda.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all p-6 group">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-4 group-hover:bg-indigo-600/30 transition-colors">
                  <f.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="font-semibold mb-2 text-white">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API */}
      <section id="api" className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-8 sm:p-12 text-center">
          <Key className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">API Entegrasyonu</h2>
          <p className="text-white/50 mb-8 max-w-lg mx-auto">
            Giris yapin, Ayarlar sayfasindan API anahtarinizi olusturun. Bearer token olarak kullanin.
          </p>
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-sm text-left mb-8 overflow-x-auto">
            <div className="text-white/40 mb-1"># Ornek istek</div>
            <div className="text-cyan-400">curl -H <span className="text-yellow-300">"Authorization: Bearer sk-..."</span> \</div>
            <div className="text-cyan-400 ml-5">{"https://yourapp.replit.app/api/chat"}</div>
          </div>
          <LoginButton
            onClick={handleLogin}
            pending={isPending}
            className="px-8 py-3"
          >
            Giriş Yap ve Anahtar Al
          </LoginButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span>AI Studio</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#cli" className="hover:text-white/60 transition-colors">CLI</a>
            <a href="#api" className="hover:text-white/60 transition-colors">API</a>
            <a href="#ozellikler" className="hover:text-white/60 transition-colors">Ozellikler</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
