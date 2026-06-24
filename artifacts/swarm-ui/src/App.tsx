import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout";
import { AdminLayout } from "@/components/admin-layout";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Runs from "@/pages/runs";
import RunDetail from "@/pages/run-detail";
import Agents from "@/pages/agents";
import Snapshots from "@/pages/snapshots";
import Workspace from "@/pages/workspace";
import Terminal from "@/pages/terminal";
import Models from "@/pages/models";
import Chat from "@/pages/chat";
import AgentChat from "@/pages/agent-chat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2000,
      retry: false,
      throwOnError: false,
    },
  },
});

function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground font-mono">Yükleniyor...</span>
      </div>
    </div>
  );
}

function LoginScreen() {
  const { login } = useAuth();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm font-mono">S</span>
          </div>
          <span className="font-bold text-lg font-mono tracking-tight">SWARM_CTRL</span>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-2xl p-8 w-full text-center space-y-4">
          <p className="text-sm text-muted-foreground font-mono">Devam etmek için giriş yapın</p>
          <button
            onClick={login}
            className="w-full px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium font-mono transition-colors"
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
        <Route path="/admin" component={AdminRouter} />
        <Route path="/admin/:rest*" component={AdminRouter} />
        <Route>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/projects" component={Projects} />
              <Route path="/projects/:projectId" component={ProjectDetail} />
              <Route path="/runs" component={Runs} />
              <Route path="/runs/:runId" component={RunDetail} />
              <Route path="/terminal" component={Terminal} />
              <Route path="/chat" component={Chat} />
              <Route path="/chat/:id" component={Chat} />
              <Route path="/agent-chat" component={AgentChat} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </Route>
      </Switch>

      {!isAuthenticated && <LoginScreen />}
    </>
  );
}

function AdminRouter() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin/providers" component={Models} />
        <Route path="/admin/agents" component={Agents} />
        <Route path="/admin/snapshots" component={Snapshots} />
        <Route path="/admin/workspace" component={Workspace} />
        <Route path="/admin" component={Models} />
      </Switch>
    </AdminLayout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
