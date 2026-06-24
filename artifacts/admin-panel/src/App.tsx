import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { AppLayout } from "@/components/layout";
import { AdminLayout } from "@/components/admin-layout";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Chat from "@/pages/chat";
import Terminal from "@/pages/terminal";
import Models from "@/pages/models";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 2000, retry: false, throwOnError: false },
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
            <span className="text-primary-foreground font-bold text-sm font-mono">A</span>
          </div>
          <span className="font-bold text-lg font-mono tracking-tight">Admin Panel</span>
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
        {/* Admin routes */}
        <Route path="/admin">
          <AdminLayout><Redirect to="/admin/providers" /></AdminLayout>
        </Route>
        <Route path="/admin/providers">
          <AdminLayout><Models /></AdminLayout>
        </Route>

        {/* Main app routes */}
        <Route path="/">
          <AppLayout><Dashboard /></AppLayout>
        </Route>
        <Route path="/projects">
          <AppLayout><Projects /></AppLayout>
        </Route>
        <Route path="/projects/:id">
          <AppLayout><ProjectDetail /></AppLayout>
        </Route>
        <Route path="/chat">
          <AppLayout><Chat /></AppLayout>
        </Route>
        <Route path="/terminal">
          <AppLayout><Terminal /></AppLayout>
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base="">
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
