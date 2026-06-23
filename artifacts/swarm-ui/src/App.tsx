import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout";
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
  defaultOptions: { queries: { staleTime: 2000, retry: 1 } },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:projectId" component={ProjectDetail} />
        <Route path="/runs" component={Runs} />
        <Route path="/runs/:runId" component={RunDetail} />
        <Route path="/agents" component={Agents} />
        <Route path="/snapshots" component={Snapshots} />
        <Route path="/workspace" component={Workspace} />
        <Route path="/terminal" component={Terminal} />
        <Route path="/models" component={Models} />
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
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
