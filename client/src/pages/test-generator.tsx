import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Settings, Zap, BookOpen, Tag, Globe } from "lucide-react";
import type { TestConfig } from "@shared/schema";
import { useState } from "react";

const LANG_FLAGS: Record<string, string> = {
  en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", fr: "🇫🇷", ja: "🇯🇵", pt: "🇧🇷",
  ko: "🇰🇷", ar: "🇸🇦", zh: "🇨🇳", hi: "🇮🇳", it: "🇮🇹", tr: "🇹🇷",
  sv: "🇸🇪", pl: "🇵🇱",
};

const complexityColors: Record<string, string> = {
  entry: "bg-green-500/15 text-green-400 border-green-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  very_high: "bg-red-600/20 text-red-300 border-red-600/30",
};

export default function TestGenerator() {
  const { toast } = useToast();
  const [selectedConfig, setSelectedConfig] = useState<TestConfig | null>(null);
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [complexityFilter, setComplexityFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("none");

  const { data: configs, isLoading } = useQuery<TestConfig[]>({ queryKey: ["/api/test-configs"] });
  const { data: scheduler } = useQuery<{ running: boolean; interval: number; nextRun: string | null }>({ queryKey: ["/api/scheduler/status"], refetchInterval: 5000 });

  const triggerMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test-runs/trigger"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Test triggered", description: "Running against FORGE API…" });
    },
    onError: () => toast({ title: "Error", description: "Failed to trigger test", variant: "destructive" }),
  });

  const startScheduler = useMutation({
    mutationFn: () => apiRequest("POST", "/api/scheduler/start"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] }); toast({ title: "Scheduler started" }); },
  });
  const stopScheduler = useMutation({
    mutationFn: () => apiRequest("POST", "/api/scheduler/stop"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] }); toast({ title: "Scheduler stopped" }); },
  });

  const filtered = (configs || []).filter(c => {
    if (industryFilter !== "all" && c.industry !== industryFilter) return false;
    if (complexityFilter !== "all" && c.complexity !== complexityFilter) return false;
    if (languageFilter !== "all" && c.language !== languageFilter) return false;
    return true;
  });

  // Group configs
  const grouped = new Map<string, TestConfig[]>();
  if (groupBy === "industry") {
    filtered.forEach(c => {
      const key = c.expectedIndustry;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(c);
    });
  } else if (groupBy === "language") {
    filtered.forEach(c => {
      const key = c.language.toUpperCase();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(c);
    });
  } else {
    grouped.set("all", filtered);
  }

  const industries = [...new Set((configs || []).map(c => c.industry))].sort();
  const complexities = ["entry", "low", "medium", "high", "very_high"];
  const languages = [...new Set((configs || []).map(c => c.language))].sort();

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-page-title">Test Generator</h2>
          <p className="text-sm text-muted-foreground">{configs?.length || 0} test configurations across {languages.length} languages</p>
        </div>
        <Button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending} className="bg-primary hover:bg-primary/90" data-testid="button-generate-run">
          {triggerMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          Generate & Run
        </Button>
      </div>

      {/* Scheduler */}
      <Card className="bg-card border-card-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold">Automated Testing</h3>
                <p className="text-xs text-muted-foreground">Run tests every hour</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs ${scheduler?.running ? "text-green-400" : "text-muted-foreground"}`}>{scheduler?.running ? "Running" : "Stopped"}</span>
              <Switch checked={scheduler?.running || false} onCheckedChange={(checked) => { if (checked) startScheduler.mutate(); else stopScheduler.mutate(); }} data-testid="switch-scheduler" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3" data-testid="filters-generator">
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Industry" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map(i => <SelectItem key={i} value={i}>{i.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={complexityFilter} onValueChange={setComplexityFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Complexity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {complexities.map(c => <SelectItem key={c} value={c}>{c.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Language" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lang</SelectItem>
            {languages.map(l => <SelectItem key={l} value={l}>{LANG_FLAGS[l] || ""} {l.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Group by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Grouping</SelectItem>
            <SelectItem value="industry">By Industry</SelectItem>
            <SelectItem value="language">By Language</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto font-mono">{filtered.length} configs</span>
      </div>

      {/* Config Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : (
        Array.from(grouped.entries()).map(([group, items]) => (
          <div key={group}>
            {group !== "all" && (
              <h3 className="text-sm font-semibold text-muted-foreground mt-4 mb-2">{group} ({items.length})</h3>
            )}
            <div className="grid grid-cols-2 gap-3">
              {items.map((config) => (
                <Card
                  key={config.id}
                  className={`bg-card border-card-border cursor-pointer transition-all hover:border-primary/40 ${selectedConfig?.id === config.id ? "border-primary ring-1 ring-primary/30" : ""}`}
                  onClick={() => setSelectedConfig(selectedConfig?.id === config.id ? null : config)}
                  data-testid={`card-config-${config.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold">{config.name}</h3>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className={`text-[10px] ${complexityColors[config.complexity] || ""}`}>
                          {config.complexity.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                          {LANG_FLAGS[config.language] || ""} {config.language.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
                      <span>{config.expectedIndustry}</span>
                      <span>→</span>
                      <span>{config.expectedDomain}</span>
                    </div>
                    {/* Ground truth summary */}
                    <div className="flex items-center gap-3 mb-2 text-[10px]">
                      {config.expectedStandards && config.expectedStandards.length > 0 && (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <BookOpen className="w-3 h-3" /> {config.expectedStandards.length} standards
                        </span>
                      )}
                      {config.expectedEntities && config.expectedEntities.length > 0 && (
                        <span className="flex items-center gap-1 text-green-400">
                          <Tag className="w-3 h-3" /> {config.expectedEntities.length} entities
                        </span>
                      )}
                      {config.expectedCpcSection && (
                        <span className="flex items-center gap-1 text-purple-400">
                          CPC: {config.expectedCpcSection}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 font-mono leading-relaxed">{config.templatePrompt.slice(0, 100)}…</p>
                    {config.specialFeatures && config.specialFeatures.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {config.specialFeatures.map((f, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] border-secondary/30 text-secondary">{f}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Selected Config Preview */}
      {selectedConfig && (
        <Card className="bg-card border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              Preview: {selectedConfig.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 mb-3 text-xs">
              <div><span className="text-muted-foreground">Industry:</span><div className="font-mono mt-0.5">{selectedConfig.expectedIndustry}</div></div>
              <div><span className="text-muted-foreground">Domain:</span><div className="font-mono mt-0.5">{selectedConfig.expectedDomain}</div></div>
              <div><span className="text-muted-foreground">Complexity:</span><div className="font-mono mt-0.5 capitalize">{selectedConfig.complexity.replace("_", " ")}</div></div>
              <div><span className="text-muted-foreground">Language:</span><div className="font-mono mt-0.5">{LANG_FLAGS[selectedConfig.language] || ""} {selectedConfig.language.toUpperCase()}</div></div>
              <div><span className="text-muted-foreground">Intent:</span><div className="font-mono mt-0.5 capitalize">{selectedConfig.expectedIntent || "-"}</div></div>
            </div>
            {/* Ground truth details */}
            {selectedConfig.expectedStandards && selectedConfig.expectedStandards.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] text-muted-foreground uppercase">Expected Standards:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedConfig.expectedStandards.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-400">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {selectedConfig.expectedEntities && selectedConfig.expectedEntities.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] text-muted-foreground uppercase">Expected Entities:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedConfig.expectedEntities.map((e, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] border-green-500/30 text-green-400">{e}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-muted/20 rounded-md p-3 border border-border">
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Full Prompt</h4>
              <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed" data-testid="text-config-prompt">{selectedConfig.templatePrompt}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
