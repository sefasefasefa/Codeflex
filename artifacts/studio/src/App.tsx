import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { useEffect } from "react";

import Layout from "@/components/layout";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

import Chat from "@/pages/chat";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Files from "@/pages/files";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">Yükleniyor...</div>;
  if (!isAuthenticated) return <Login />;

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">Yükleniyor...</div>;
  if (!isAuthenticated) return <Login />;
  
  return <Redirect to="/chat" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/chat">
        <ProtectedRoute component={Chat} />
      </Route>
      <Route path="/chat/:id">
        <ProtectedRoute component={Chat} />
      </Route>
      <Route path="/projects">
        <ProtectedRoute component={Projects} />
      </Route>
      <Route path="/projects/:id">
        <ProtectedRoute component={ProjectDetail} />
      </Route>
      <Route path="/files">
        <ProtectedRoute component={Files} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route component={NotFound} />
    </Switch>
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
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;