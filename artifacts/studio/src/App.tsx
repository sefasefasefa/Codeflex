import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";

import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Settings from "@/pages/settings";
import Chat from "@/pages/chat";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "");

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

function LoginScreen() {
  const { login } = useAuth();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">AI Studio</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl p-8 w-full text-center">
          <p className="text-white font-medium mb-4">AI Studio'ya Hoş Geldiniz</p>
          <button
            onClick={login}
            className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Switch>
        <Route path="/">
          <Redirect to="/chat" />
        </Route>

        <Route path="/chat">
          <Layout><Chat /></Layout>
        </Route>
        <Route path="/chat/:id">
          {({ id }: { id: string }) => <Layout><Chat key={id} /></Layout>}
        </Route>

        <Route path="/projects">
          <Layout><Projects /></Layout>
        </Route>

        <Route path="/projects/:id">
          {({ id }: { id: string }) => <ProjectDetail key={id} />}
        </Route>

        <Route path="/settings">
          <Layout><Settings /></Layout>
        </Route>

        <Route path="/files">
          <Layout><Settings /></Layout>
        </Route>

        <Route component={NotFound} />
      </Switch>

      {!isAuthenticated && <LoginScreen />}
    </>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
