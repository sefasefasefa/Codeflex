import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { useEffect } from "react";

import Layout from "@/components/layout";
import Landing from "@/pages/landing";
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

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#080b14] px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#080b14] px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ProtectedSettings() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Landing />;
  return (
    <Layout>
      <Settings />
    </Layout>
  );
}

function Router() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    if (!clerkPubKey) return <Landing />;
    return <LoadingScreen />;
  }

  return (
    <Switch>
      <Route path="/">
        {isSignedIn ? <Redirect to="/projects" /> : <Landing />}
      </Route>

      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Projects home — full screen, no sidebar */}
      <Route path="/projects">
        {isSignedIn ? <Projects /> : <Landing />}
      </Route>

      {/* Project workspace — full screen 3-column */}
      <Route path="/projects/:id">
        {isSignedIn ? <ProjectDetail /> : <Landing />}
      </Route>

      {/* Settings — uses sidebar layout */}
      <Route path="/settings" component={ProtectedSettings} />

      {/* Legacy redirects */}
      <Route path="/chat">
        {isSignedIn ? <Redirect to="/projects" /> : <Landing />}
      </Route>
      <Route path="/chat/:id">
        {isSignedIn ? <Redirect to="/projects" /> : <Landing />}
      </Route>
      <Route path="/files">
        {isSignedIn ? <Redirect to="/projects" /> : <Landing />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function NoAuthApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Landing />
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
          <Router />
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
