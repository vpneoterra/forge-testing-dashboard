import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import type { Benchmark, TestRun } from "@shared/schema";
import { format } from "date-fns";

const ORANGE = "#E87722";
const CYAN = "#00B4D8";
const GREEN = "#2DC653";
const PURPLE = "#8B5CF6";
const AMBER = "#F59E0B";
const MAGENTA = "#D946EF";
const RED = "#EF4444";
const TEAL = "#06B6D4";

const tooltipStyle = { background: "#232529", border: "1px solid hsl(225,5%,22%)", borderRadius: 6, fontSize: 12 };
const axisTick = { fontSize: 11, fill: "#9CA3AF" };

export default function Benchmarks() {
  const { data: benchmarks, isLoading: benchLoading } = useQuery<Benchmark[]>({ queryKey: ["/api/benchmarks"] });
  const { data: runs, isLoading: runsLoading } = useQuery<TestRun[]>({ queryKey: ["/api/test-runs"] });
  const isLoading = benchLoading || runsLoading;

  const timeData = (benchmarks || []).map((b) => ({
    date: format(new Date(b.periodStart), "MM/dd"),
    avgScore: Math.round(b.avgScore),
    claudeScore: Math.round(b.claudeAvgScore || 88),
    industryAccuracy: Math.round(b.industryAccuracy * 100),
    domainAccuracy: Math.round((b.domainAccuracy || 0) * 100),
    claudeAccuracy: Math.round((b.claudeIndustryAccuracy || 0) * 100),
    avgStandards: b.avgStandards,
    standardsRelevance: Math.round((b.standardsRelevance || 0) * 100),
    paramQuality: Math.round(b.avgScoreParameters || 0),
    scopeScore: Math.round(b.avgScoreScope || 0),
    pipelineStages: b.avgPipelineStages,
    confidenceScore: Math.round(b.avgScoreConfidence || 0),
    avgTimingMs: Math.round(b.avgTimingMs),
    crossStepScore: Math.round(b.avgScoreCrossStep || 0),
    classification: Math.round(b.avgScoreClassification || 0),
    standards: Math.round(b.avgScoreStandards || 0),
    latency: Math.round(b.avgScoreLatency || 0),
  }));

  // Confidence calibration scatter from runs
  const confData = (runs || []).map(r => ({
    confidence: Math.round((r.forgeConfidence || 0) * 100),
    correct: r.industryCorrect ? 100 : 0,
    name: `#${r.id}`,
  }));

  // Latency decomposition over time
  const latencyArea = [...(runs || [])].sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime()).map(r => ({
    name: `#${r.id}`,
    step1: r.forgeTimingStep1 ? Math.round(r.forgeTimingStep1 / 1000) : 0,
    step2: r.forgeTimingStep2 ? Math.round(r.forgeTimingStep2 / 1000) : 0,
    step3: r.forgeTimingStep3 ? Math.round(r.forgeTimingStep3 / 1000) : 0,
  }));

  // Drift rate from benchmarks
  const driftData = timeData.map(d => ({
    ...d,
    driftRate: 100 - d.crossStepScore,
  }));

  // Score heatmap by industry (grouped bar)
  const industryRunMap = new Map<string, { cls: number[]; std: number[]; par: number[]; scp: number[]; gap: number[]; cnf: number[]; xst: number[]; lat: number[] }>();
  (runs || []).forEach(r => {
    const key = r.claudeIndustry || r.industry;
    const short = key.length > 14 ? key.slice(0, 12) + "…" : key;
    const prev = industryRunMap.get(short) || { cls: [], std: [], par: [], scp: [], gap: [], cnf: [], xst: [], lat: [] };
    prev.cls.push(r.scoreClassification || 0);
    prev.std.push(r.scoreStandards || 0);
    prev.par.push(r.scoreParameters || 0);
    prev.scp.push(r.scoreScope || 0);
    prev.gap.push(r.scoreGapAnalysis || 0);
    prev.cnf.push(r.scoreConfidence || 0);
    prev.xst.push(r.scoreCrossStep || 0);
    prev.lat.push(r.scoreLatency || 0);
    industryRunMap.set(short, prev);
  });
  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const heatmapData = Array.from(industryRunMap.entries()).map(([name, d]) => ({
    name,
    Classification: avg(d.cls),
    Standards: avg(d.std),
    Parameters: avg(d.par),
    Scope: avg(d.scp),
  })).sort((a, b) => (b.Classification + b.Standards) - (a.Classification + a.Standards)).slice(0, 10);

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="bg-card border-card-border">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent>{isLoading ? <Skeleton className="h-[180px]" /> : children}</CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-bold" data-testid="text-page-title">Benchmarks</h2>
        <p className="text-sm text-muted-foreground">Multi-axis trend tracking and FORGE vs Claude comparison</p>
      </div>

      {/* 3x3 grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* 1. Overall Score Trend */}
        <ChartCard title="Overall Score Trend">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
              <XAxis dataKey="date" tick={axisTick} />
              <YAxis domain={[0, 100]} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="avgScore" name="FORGE" stroke={ORANGE} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="claudeScore" name="Claude" stroke={CYAN} strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Classification Accuracy */}
        <ChartCard title="Classification Accuracy Trend">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
              <XAxis dataKey="date" tick={axisTick} />
              <YAxis domain={[0, 100]} tick={axisTick} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="industryAccuracy" name="Industry" stroke={ORANGE} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="domainAccuracy" name="Domain" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="claudeAccuracy" name="Claude" stroke={CYAN} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. Standards Relevance */}
        <ChartCard title="Standards Relevance Trend">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
              <XAxis dataKey="date" tick={axisTick} />
              <YAxis domain={[0, 100]} tick={axisTick} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="standardsRelevance" name="Standards" stroke={PURPLE} fill={PURPLE} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Param Quality & Scope Score */}
        <ChartCard title="Param Quality vs Scope Score">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
              <XAxis dataKey="date" tick={axisTick} />
              <YAxis domain={[0, 100]} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="paramQuality" name="Params" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="scopeScore" name="Scope" stroke={MAGENTA} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Confidence Score Trend */}
        <ChartCard title="Confidence Score Trend">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
              <XAxis dataKey="date" tick={axisTick} />
              <YAxis domain={[0, 100]} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="confidenceScore" name="Confidence" stroke={TEAL} fill={TEAL} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6. Avg Timing */}
        <ChartCard title="Average Response Time (ms)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
              <XAxis dataKey="date" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="avgTimingMs" name="Timing (ms)" fill={CYAN} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 7. Cross-Step & Drift */}
        <ChartCard title="Cross-Step Coherence vs Drift">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={driftData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
              <XAxis dataKey="date" tick={axisTick} />
              <YAxis domain={[0, 100]} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="crossStepScore" name="Cross-Step" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="driftRate" name="Drift" stroke={RED} strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 8. Score Heatmap by Industry */}
        <ChartCard title="Score by Industry (Top 10)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={heatmapData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
              <XAxis type="number" domain={[0, 100]} tick={axisTick} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} width={70} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Classification" fill={ORANGE} stackId="a" />
              <Bar dataKey="Standards" fill={CYAN} stackId="a" />
              <Bar dataKey="Parameters" fill={GREEN} stackId="a" />
              <Bar dataKey="Scope" fill={PURPLE} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 9. Confidence Calibration Scatter */}
        <ChartCard title="Confidence Calibration (Scatter)">
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
              <XAxis dataKey="confidence" name="Confidence %" tick={axisTick} unit="%" />
              <YAxis dataKey="correct" name="Correct" tick={axisTick} domain={[-10, 110]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={confData} fill={AMBER} opacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
