import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TestRuns from "@/pages/test-runs";
import Recommendations from "@/pages/recommendations";
import Benchmarks from "@/pages/benchmarks";
import TestGenerator from "@/pages/test-generator";
import RagQuality from "@/pages/rag-quality";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import {
  LayoutDashboard,
  TestTube2,
  Lightbulb,
  TrendingUp,
  Settings,
  Flame,
  Microscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/runs", label: "Test Runs", icon: TestTube2 },
  { path: "/benchmarks", label: "Benchmarks", icon: TrendingUp },
  { path: "/rag-quality", label: "RAG Quality", icon: Microscope },
  { path: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { path: "/generator", label: "Test Generator", icon: Settings },
];

function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-60 h-full flex flex-col bg-sidebar border-r border-sidebar-border" data-testid="sidebar">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wide text-foreground" data-testid="text-logo">FORGE</h1>
          <p className="text-[10px] font-mono text-muted-foreground leading-none">CONTINUOUS TESTING</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" data-testid="nav-sidebar">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location === "/" || location === ""
              : location.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <PerplexityAttribution />
      </div>
    </aside>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/runs" component={TestRuns} />
      <Route path="/recommendations" component={Recommendations} />
      <Route path="/benchmarks" component={Benchmarks} />
      <Route path="/generator" component={TestGenerator} />
      <Route path="/rag-quality" component={RagQuality} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
              <AppRouter />
            </main>
          </div>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
