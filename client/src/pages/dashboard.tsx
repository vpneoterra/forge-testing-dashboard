import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Play, Pause, Zap, TrendingUp, TrendingDown, Timer, Target, Activity,
  CheckCircle, Loader2, Shield, BookOpen, SlidersHorizontal, Layers,
  Search, Gauge, GitBranch, Clock,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import type { TestRun } from "@shared/schema";
import { useEffect, useState } from "react";
import { format } from "date-fns";

const DIMENSION_COLORS: Record<string, string> = {
  Classification: "#E87722",
  Standards: "#00B4D8",
  Parameters: "#2DC653",
  Scope: "#8B5CF6",
  "Gap Analysis": "#F59E0B",
  Confidence: "#D946EF",
  "Cross-Step": "#EF4444",
  Latency: "#06B6D4",
};

const tooltipStyle = { background: "#232529", border: "1px solid hsl(225,5%,22%)", borderRadius: 6, fontSize: 12 };

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round((value * eased) * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{typeof value === "number" && value % 1 === 0 ? Math.round(display) : display.toFixed(1)}{suffix}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pass: "bg-green-500/15 text-green-400 border-green-500/30",
    fail: "bg-red-500/15 text-red-400 border-red-500/30",
    error: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    partial: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return <Badge variant="outline" className={colors[status] || ""} data-testid={`status-badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

function DimensionKPI({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const bg = value >= 70 ? "text-green-400" : value >= 45 ? "text-amber-400" : "text-red-400";
  return (
    <Card className="bg-card border-card-border" data-testid={`card-dim-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
          <Icon className="w-3 h-3" style={{ color }} /> {label}
        </div>
        <div className={`text-lg font-bold font-mono ${bg}`}>
          <AnimatedCounter value={value} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/stats"] });
  const { data: runs, isLoading: runsLoading } = useQuery<TestRun[]>({ queryKey: ["/api/test-runs"] });
  const { data: scheduler } = useQuery<any>({ queryKey: ["/api/scheduler/status"], refetchInterval: 5000 });

  const triggerMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test-runs/trigger"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Test triggered", description: "Running test against FORGE API..." });
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

  const recentRuns = runs?.slice(0, 10) || [];

  // Radar chart data
  const radarData = stats ? [
    { dimension: "Classification", score: stats.avgScoreClassification || 0, fullMark: 100 },
    { dimension: "Standards", score: stats.avgScoreStandards || 0, fullMark: 100 },
    { dimension: "Parameters", score: stats.avgScoreParameters || 0, fullMark: 100 },
    { dimension: "Scope", score: stats.avgScoreScope || 0, fullMark: 100 },
    { dimension: "Gap Analysis", score: stats.avgScoreGapAnalysis || 0, fullMark: 100 },
    { dimension: "Confidence", score: stats.avgScoreConfidence || 0, fullMark: 100 },
    { dimension: "Cross-Step", score: stats.avgScoreCrossStep || 0, fullMark: 100 },
    { dimension: "Latency", score: stats.avgScoreLatency || 0, fullMark: 100 },
  ] : [];

  // Score trend
  const scoreChartData = [...(runs || [])].reverse().slice(-30).map((r) => ({
    name: `#${r.id}`,
    forge: r.overallScore || 0,
    claude: 88,
  }));

  // Industry accuracy
  const industryMap = new Map<string, { correct: number; total: number; domainCorrect: number }>();
  (runs || []).forEach((r) => {
    const key = r.claudeIndustry || r.industry;
    const prev = industryMap.get(key) || { correct: 0, total: 0, domainCorrect: 0 };
    prev.total++;
    if (r.industryCorrect) prev.correct++;
    if (r.domainCorrect) prev.domainCorrect++;
    industryMap.set(key, prev);
  });
  const industryChartData = Array.from(industryMap.entries()).map(([name, v]) => ({
    name: name.length > 22 ? name.slice(0, 20) + "…" : name,
    industry: Math.round((v.correct / v.total) * 100),
    domain: Math.round((v.domainCorrect / v.total) * 100),
  })).sort((a, b) => b.industry - a.industry);

  // Latency decomposition
  const latencyData = [...(runs || [])].reverse().slice(-15).map((r) => ({
    name: `#${r.id}`,
    step1: r.forgeTimingStep1 ? Math.round(r.forgeTimingStep1 / 1000) : 0,
    step2: r.forgeTimingStep2 ? Math.round(r.forgeTimingStep2 / 1000) : 0,
    step3: r.forgeTimingStep3 ? Math.round(r.forgeTimingStep3 / 1000) : 0,
  }));

  const dimensionIcons = [
    { label: "Classification", key: "avgScoreClassification", icon: Target, color: "#E87722" },
    { label: "Standards", key: "avgScoreStandards", icon: BookOpen, color: "#00B4D8" },
    { label: "Parameters", key: "avgScoreParameters", icon: SlidersHorizontal, color: "#2DC653" },
    { label: "Scope", key: "avgScoreScope", icon: Layers, color: "#8B5CF6" },
    { label: "Gap Analysis", key: "avgScoreGapAnalysis", icon: Search, color: "#F59E0B" },
    { label: "Confidence", key: "avgScoreConfidence", icon: Gauge, color: "#D946EF" },
    { label: "Cross-Step", key: "avgScoreCrossStep", icon: GitBranch, color: "#EF4444" },
    { label: "Latency", key: "avgScoreLatency", icon: Clock, color: "#06B6D4" },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-page-title">Dashboard</h2>
          <p className="text-sm text-muted-foreground">FORGE API multi-axis testing overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card">
            <div className={`w-2 h-2 rounded-full ${scheduler?.running ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-xs font-mono text-muted-foreground" data-testid="text-scheduler-status">
              {scheduler?.running ? "Auto ON" : "Auto OFF"}
            </span>
            {scheduler?.running ? (
              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => stopScheduler.mutate()} data-testid="button-stop-scheduler"><Pause className="w-3 h-3" /></Button>
            ) : (
              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => startScheduler.mutate()} data-testid="button-start-scheduler"><Play className="w-3 h-3" /></Button>
            )}
          </div>
          <Button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending} className="bg-primary hover:bg-primary/90" data-testid="button-run-test">
            {triggerMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Run Test Now
          </Button>
        </div>
      </div>

      {/* 8 Dimension KPI Cards */}
      <div className="grid grid-cols-8 gap-3">
        {statsLoading ? (
          Array(8).fill(0).map((_, i) => <Card key={i} className="bg-card border-card-border"><CardContent className="p-3"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-6 w-10" /></CardContent></Card>)
        ) : (
          dimensionIcons.map((d) => (
            <DimensionKPI key={d.key} label={d.label} value={stats?.[d.key] || 0} icon={d.icon} color={d.color} />
          ))
        )}
      </div>

      {/* Row 2: Radar + Score Trend */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Dimension Score Profile</CardTitle></CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
                  <PolarGrid stroke="hsl(225 5% 22%)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={5} tick={{ fontSize: 9, fill: "#6B7280" }} />
                  <Radar name="FORGE" dataKey="score" stroke="#E87722" fill="#E87722" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overall Score Trend — FORGE vs Claude</CardTitle></CardHeader>
          <CardContent>
            {runsLoading ? <Skeleton className="h-[260px]" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={scoreChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="forge" name="FORGE" stroke="#E87722" strokeWidth={2} dot={{ r: 3, fill: "#E87722" }} />
                  <Line type="monotone" dataKey="claude" name="Claude Baseline" stroke="#00B4D8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Industry Accuracy + Latency Decomposition */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Industry & Domain Accuracy</CardTitle></CardHeader>
          <CardContent>
            {runsLoading ? <Skeleton className="h-[240px]" /> : (
              <ResponsiveContainer width="100%" height={Math.max(240, industryChartData.length * 34)}>
                <BarChart data={industryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="industry" name="Industry %" fill="#E87722" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="domain" name="Domain %" fill="#00B4D8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Latency Decomposition (seconds)</CardTitle></CardHeader>
          <CardContent>
            {runsLoading ? <Skeleton className="h-[240px]" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} unit="s" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="step1" name="Step 1" stackId="a" fill="#E87722" />
                  <Bar dataKey="step2" name="Step 2" stackId="a" fill="#00B4D8" />
                  <Bar dataKey="step3" name="Step 3" stackId="a" fill="#2DC653" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent Test Runs</CardTitle></CardHeader>
        <CardContent>
          {runsLoading ? (
            <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-recent-runs">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Time</th>
                    <th className="text-left py-2 px-2 font-medium">Prompt</th>
                    <th className="text-left py-2 px-2 font-medium">Industry</th>
                    <th className="text-left py-2 px-2 font-medium">Overall</th>
                    <th className="text-left py-2 px-2 font-medium">Status</th>
                    {Object.entries(DIMENSION_COLORS).map(([dim]) => (
                      <th key={dim} className="text-center py-2 px-1 font-medium" title={dim}>{dim.slice(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run) => {
                    const dimScores = [
                      run.scoreClassification, run.scoreStandards, run.scoreParameters, run.scoreScope,
                      run.scoreGapAnalysis, run.scoreConfidence, run.scoreCrossStep, run.scoreLatency,
                    ];
                    const dimColors = Object.values(DIMENSION_COLORS);
                    return (
                      <tr key={run.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors" data-testid={`row-run-${run.id}`}>
                        <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{run.id}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{format(new Date(run.runAt), "HH:mm")}</td>
                        <td className="py-2 px-2 max-w-[200px] truncate text-xs">{run.prompt.slice(0, 40)}…</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs font-mono ${run.industryCorrect ? "text-green-400" : "text-red-400"}`}>{run.forgeIndustry}</span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`font-mono font-bold ${(run.overallScore || 0) >= 70 ? "text-green-400" : (run.overallScore || 0) >= 45 ? "text-amber-400" : "text-red-400"}`}>{run.overallScore}</span>
                        </td>
                        <td className="py-2 px-2"><StatusBadge status={run.status} /></td>
                        {dimScores.map((sc, i) => (
                          <td key={i} className="py-2 px-1 text-center">
                            <div className="w-6 h-6 rounded-sm mx-auto flex items-center justify-center text-[9px] font-mono font-bold"
                              style={{
                                backgroundColor: `${dimColors[i]}15`,
                                color: (sc || 0) >= 70 ? "#2DC653" : (sc || 0) >= 45 ? "#F59E0B" : "#EF4444",
                              }}>
                              {sc ?? "-"}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
