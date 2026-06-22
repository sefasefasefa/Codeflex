import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Runs from "@/pages/runs";
import RunDetail from "@/pages/run-detail";
import Agents from "@/pages/agents";
import Snapshots from "@/pages/snapshots";
import Workspace from "@/pages/workspace";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/runs" component={Runs} />
        <Route path="/runs/:runId" component={RunDetail} />
        <Route path="/agents" component={Agents} />
        <Route path="/snapshots" component={Snapshots} />
        <Route path="/workspace" component={Workspace} />
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
