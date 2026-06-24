import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { useEffect } from "react";

import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "");

const clerkPubKey = (() => {
  const rawKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!rawKey) return null;
  try {
    return publishableKeyFromHost(
      window.location.hostname,
      rawKey,
    );
  } catch {
    return null;
  }
})();

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "#4f46e5",
    colorForeground: "#f1f5f9",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#ef4444",
    colorBackground: "#0d1117",
    colorInput: "#161b27",
    colorInputForeground: "#f1f5f9",
    colorNeutral: "#1e2433",
    fontFamily: "inherit",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden border border-white/10 shadow-2xl shadow-black/50",
    card: "!shadow-none !border-0 !bg-[#0d1117] !rounded-none",
    footer: "!shadow-none !border-0 !bg-[#0d1117] !rounded-none",
    headerTitle: "text-white",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-slate-300",
    footerActionLink: "text-indigo-400 hover:text-indigo-300",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-indigo-400",
    formFieldSuccessText: "text-green-400",
    alertText: "text-white",
    logoBox: "mb-2",
    logoImage: "w-10 h-10",
    socialButtonsBlockButton: "border-white/10 bg-white/5 hover:bg-white/10",
    formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500",
    formFieldInput: "bg-[#161b27] border-white/10 text-white",
    footerAction: "bg-[#0d1117]",
    dividerLine: "bg-white/10",
    alert: "bg-white/5 border-white/10",
    otpCodeFieldInput: "bg-[#161b27] border-white/10 text-white",
    main: "bg-[#0d1117]",
  },
};

function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#080b14]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-white/40">Yükleniyor...</span>
      </div>
    </div>
  );
}

function AuthModal() {
  const [location] = useLocation();
  const isSignUp = location.startsWith("/sign-up");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">AI Studio</span>
        </div>
        {isSignUp ? (
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
          />
        ) : (
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
          />
        )}
      </div>
    </div>
  );
}

function AppContent() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return <LoadingScreen />;

  return (
    <>
      <Switch>
        <Route path="/">
          <Redirect to="/projects" />
        </Route>

        <Route path="/sign-in/*?">
          {isSignedIn ? <Redirect to="/projects" /> : <Projects />}
        </Route>
        <Route path="/sign-up/*?">
          {isSignedIn ? <Redirect to="/projects" /> : <Projects />}
        </Route>

        <Route path="/projects">
          <Projects />
        </Route>

        <Route path="/projects/:id">
          {({ id }: { id: string }) => <ProjectDetail key={id} />}
        </Route>

        <Route path="/settings">
          {isSignedIn ? (
            <Layout><Settings /></Layout>
          ) : (
            <Projects />
          )}
        </Route>

        <Route path="/chat">
          <Redirect to="/projects" />
        </Route>
        <Route path="/chat/:id">
          <Redirect to="/projects" />
        </Route>
        <Route path="/files">
          <Redirect to="/projects" />
        </Route>

        <Route component={NotFound} />
      </Switch>

      {!isSignedIn && <AuthModal />}
    </>
  );
}

function NoAuthApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Projects />
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-white font-semibold text-lg tracking-tight">AI Studio</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl p-8 w-full text-center">
              <p className="text-white font-medium mb-1">Yapılandırma Gerekli</p>
              <p className="text-white/50 text-sm">Clerk anahtarları henüz tanımlanmamış.</p>
            </div>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthApp() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <WouterRouter base={basePath}>
      {clerkPubKey ? <AuthApp /> : <NoAuthApp />}
    </WouterRouter>
  );
}

export default App;
