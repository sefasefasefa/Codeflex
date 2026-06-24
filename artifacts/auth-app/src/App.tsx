import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Link } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useListUserActivity, useCreateUserActivity } from "@workspace/api-client-react";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#6366f1",
    colorForeground: "#f1f5f9",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#ef4444",
    colorBackground: "#0f172a",
    colorInput: "#1e293b",
    colorInputForeground: "#f1f5f9",
    colorNeutral: "#334155",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-slate-900 border border-slate-700/50 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-100 font-bold",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-slate-200",
    formFieldLabel: "text-slate-300 font-medium",
    footerActionLink: "text-indigo-400 hover:text-indigo-300",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-indigo-400",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-slate-200",
    logoBox: "py-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border border-slate-600 bg-slate-800 hover:bg-slate-700 transition-colors",
    formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 transition-colors",
    formFieldInput: "bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500",
    footerAction: "bg-slate-800/50",
    dividerLine: "bg-slate-700",
    alert: "bg-slate-800 border-slate-700",
    otpCodeFieldInput: "bg-slate-800 border-slate-600 text-slate-100",
    formFieldRow: "",
    main: "",
  },
};

function getDeviceType(ua: string): string {
  if (/mobile/i.test(ua)) return "Mobil";
  if (/tablet/i.test(ua)) return "Tablet";
  return "Masaüstü";
}

function getBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  if (/opera/i.test(ua)) return "Opera";
  return "Tarayıcı";
}

function getOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os/i.test(ua)) return "macOS";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/linux/i.test(ua)) return "Linux";
  return "Bilinmiyor";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    login: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    logout: "bg-red-500/15 text-red-400 border-red-500/30",
    signup: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  };
  const labels: Record<string, string> = {
    login: "Giriş",
    logout: "Çıkış",
    signup: "Kayıt",
  };
  const cls = styles[type] || "bg-slate-500/15 text-slate-400 border-slate-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {labels[type] || type}
    </span>
  );
}

function ActivityLogPage() {
  const { data: logs, isLoading } = useListUserActivity({ limit: 100 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Aktivite Geçmişi</h1>
            <p className="text-sm text-slate-500">Hesabına ait giriş ve işlem kayıtları</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-slate-700 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-700 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">Henüz aktivite kaydı yok</p>
            <p className="text-slate-600 text-sm mt-1">İlk girişinden sonra burada görünecek</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const ua = log.userAgent || "";
              const device = getDeviceType(ua);
              const browser = getBrowser(ua);
              const os = getOS(ua);
              return (
                <div
                  key={log.id}
                  className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 hover:border-slate-600/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-slate-700/80 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      {log.eventType === "login" || log.eventType === "signup" ? (
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <EventBadge type={log.eventType} />
                        <span className="text-slate-500 text-xs">{formatDate(log.createdAt)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                          </svg>
                          {device} · {browser} · {os}
                        </span>
                        {log.ipAddress && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            {log.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function UserPortalPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { mutate: logActivity } = useCreateUserActivity();
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (user && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      logActivity({ data: { eventType: "login" } });
    }
  }, [user, logActivity]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          {user?.imageUrl && (
            <img
              src={user.imageUrl}
              alt="Avatar"
              className="w-14 h-14 rounded-full border-2 border-indigo-500"
            />
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {user?.fullName || user?.username || "Kullanıcı"}
            </h2>
            <p className="text-sm text-slate-400">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Kullanıcı ID</p>
            <p className="text-sm text-slate-300 font-mono truncate">{user?.id}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Üyelik Tarihi</p>
            <p className="text-sm text-slate-300">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("tr-TR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "-"}
            </p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Doğrulanmış Email</p>
            <p className="text-sm text-slate-300">
              {user?.hasVerifiedEmailAddress ? "✓ Doğrulandı" : "✗ Doğrulanmadı"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            to="/activity"
            className="w-full flex items-center justify-between py-3 px-4 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 rounded-xl transition-colors font-medium group"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Aktivite Geçmişi
            </span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <button
            onClick={() => {
              logActivity({ data: { eventType: "logout" } });
              signOut({ redirectUrl: basePath || "/" });
            }}
            className="w-full py-3 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-colors font-medium"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <div className="w-full max-w-md">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <div className="w-full max-w-md">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-6">
      <div className="text-center max-w-lg">
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-slate-100 mb-3">Güvenli Giriş</h1>
        <p className="text-slate-400 text-lg mb-10">Email ile veya sosyal hesaplarınla giriş yap</p>

        <div className="grid grid-cols-1 gap-3 mb-8">
          {[
            { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", title: "Email + Şifre", desc: "Klasik email ile giriş" },
            { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", title: "Email Kodu (OTP)", desc: "Şifresiz, tek kullanımlık kod" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-left">
              <div className="w-9 h-9 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <div>
                <p className="text-slate-200 font-medium text-sm">{item.title}</p>
                <p className="text-slate-500 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
          {[
            { label: "Google ile Giriş", desc: "Google hesabınla devam et" },
            { label: "Apple ile Giriş", desc: "Apple ID ile devam et" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-left">
              <div className="w-9 h-9 bg-slate-700/60 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-200 font-medium text-sm">{item.label}</p>
                <p className="text-slate-500 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link to="/sign-in" className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-500/20">
            Giriş Yap
          </Link>
          <Link to="/sign-up" className="flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl font-semibold transition-colors">
            Kayıt Ol
          </Link>
        </div>
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><UserPortalPage /></Show>
      <Show when="signed-out"><HomePage /></Show>
    </>
  );
}

function ActivityRoute() {
  return (
    <>
      <Show when="signed-in"><ActivityLogPage /></Show>
      <Show when="signed-out">
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-400 mb-4">Aktivite geçmişini görmek için giriş yapmanız gerekiyor.</p>
            <Link to="/sign-in" className="text-indigo-400 hover:text-indigo-300 underline">Giriş Yap</Link>
          </div>
        </div>
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Tekrar hoş geldin", subtitle: "Hesabına giriş yap" } },
        signUp: { start: { title: "Hesap oluştur", subtitle: "Bugün başla" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/activity" component={ActivityRoute} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
