import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function Router() {
  const [location] = [window.location.pathname];
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = location.replace(base, "") || "/";

  if (path.startsWith("/admin")) {
    return <AdminRouter />;
  }

  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouterInner />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AppRouterInner() {
  return (
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
  );
}

export default App;
