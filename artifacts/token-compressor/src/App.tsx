import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import ContextManager from "@/pages/ContextManager";
import { Zap, Brain } from "lucide-react";

const queryClient = new QueryClient();

type ActiveTab = "compressor" | "context";

function AppShell() {
  const [active, setActive] = useState<ActiveTab>("compressor");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border bg-card/50 backdrop-blur px-6 py-2 flex items-center gap-1 sticky top-0 z-10">
        <button
          onClick={() => setActive("compressor")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
            active === "compressor"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          data-testid="tab-compressor"
        >
          <Zap className="h-3 w-3" /> Token Sıkıştırıcı
        </button>
        <button
          onClick={() => setActive("context")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
            active === "context"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          data-testid="tab-context"
        >
          <Brain className="h-3 w-3" /> Context Manager
        </button>
      </nav>

      <main className="flex-1">
        {active === "compressor" ? <Home /> : <ContextManager />}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
