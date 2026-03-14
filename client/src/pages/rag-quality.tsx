import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";
import type { TestRun, Benchmark } from "@shared/schema";
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

export default function RAGQuality() {
  const { data: runs, isLoading: runsLoading } = useQuery<TestRun[]>({ queryKey: ["/api/test-runs"] });
  const { data: benchmarks, isLoading: benchLoading } = useQuery<Benchmark[]>({ queryKey: ["/api/benchmarks"] });
  const isLoading = runsLoading || benchLoading;

  // --- Radar: Average of all 8 dimensions ---
  const avg8 = (field: keyof TestRun) =>
    runs && runs.length > 0
      ? Math.round(runs.reduce((s, r) => s + ((r[field] as number) || 0), 0) / runs.length)
      : 0;

  const radarData = [
    { dim: "Classification", score: avg8("scoreClassification"), fullMark: 100 },
    { dim: "Standards", score: avg8("scoreStandards"), fullMark: 100 },
    { dim: "Parameters", score: avg8("scoreParameters"), fullMark: 100 },
    { dim: "Scope", score: avg8("scoreScope"), fullMark: 100 },
    { dim: "Gap Analysis", score: avg8("scoreGapAnalysis"), fullMark: 100 },
    { dim: "Confidence", score: avg8("scoreConfidence"), fullMark: 100 },
    { dim: "Cross-Step", score: avg8("scoreCrossStep"), fullMark: 100 },
    { dim: "Latency", score: avg8("scoreLatency"), fullMark: 100 },
  ];

  // --- KPI cards ---
  const totalRuns = runs?.length ?? 0;
  const avgOverall = runs && runs.length > 0
    ? Math.round(runs.reduce((s, r) => s + (r.forgeScore || 0), 0) / runs.length)
    : 0;
  const industryAcc = runs && runs.length > 0
    ? Math.round(runs.filter(r => r.industryCorrect).length / runs.length * 100)
    : 0;
  const domainAcc = runs && runs.length > 0
    ? Math.round(runs.filter(r => r.domainCorrect).length / runs.length * 100)
    : 0;

  // --- Score distribution bar ---
  const buckets = ["0-20", "21-40", "41-60", "61-80", "81-100"];
  const distData = buckets.map((label, i) => ({
    range: label,
    count: (runs || []).filter(r => {
      const s = r.forgeScore || 0;
      return s >= i * 20 && s < (i + 1) * 20 + (i === 4 ? 1 : 0);
    }).length,
  }));

  // --- Language breakdown ---
  const langMap = new Map<string, number[]>();
  (runs || []).forEach(r => {
    const lang = r.language || "en";
    const arr = langMap.get(lang) || [];
    arr.push(r.forgeScore || 0);
    langMap.set(lang, arr);
  });
  const langData = Array.from(langMap.entries())
    .map(([lang, scores]) => ({
      lang,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  // --- Trend over benchmarks ---
  const trendData = (benchmarks || []).map(b => ({
    date: format(new Date(b.periodStart), "MM/dd"),
    cls: Math.round(b.avgScoreClassification || 0),
    std: Math.round(b.avgScoreStandards || 0),
    par: Math.round(b.avgScoreParameters || 0),
    scp: Math.round(b.avgScoreScope || 0),
    gap: Math.round(b.avgScoreGapAnalysis || 0),
    cnf: Math.round(b.avgScoreConfidence || 0),
    xst: Math.round(b.avgScoreCrossStep || 0),
    lat: Math.round(b.avgScoreLatency || 0),
  }));

  const KPI = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-card border border-card-border rounded-lg p-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-bold" data-testid="text-page-title">RAG Quality</h2>
        <p className="text-sm text-muted-foreground">8-dimension quality profile and distribution analysis</p>
      </div>

      {/* KPI Row */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <KPI label="Total Runs" value={totalRuns} />
          <KPI label="Avg Overall Score" value={`${avgOverall}/100`} />
          <KPI label="Industry Accuracy" value={`${industryAcc}%`} />
          <KPI label="Domain Accuracy" value={`${domainAcc}%`} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Radar */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">8-Dimension Profile</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px]" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(225 5% 22%)" />
                  <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar name="Score" dataKey="score" stroke={ORANGE} fill={ORANGE} fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Score Distribution</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px]" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
                  <XAxis dataKey="range" tick={axisTick} />
                  <YAxis tick={axisTick} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Runs" fill={CYAN} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Language breakdown */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Score by Language</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px]" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={langData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
                  <XAxis type="number" domain={[0, 100]} tick={axisTick} />
                  <YAxis type="category" dataKey="lang" tick={{ fontSize: 10, fill: "#9CA3AF" }} width={30} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="avg" name="Avg Score" fill={GREEN} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dimension trends */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">All 8 Dimensions Over Time</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[200px]" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
                <XAxis dataKey="date" tick={axisTick} />
                <YAxis domain={[0, 100]} tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="cls" name="Classification" stroke={ORANGE} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="std" name="Standards" stroke={CYAN} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="par" name="Parameters" stroke={GREEN} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="scp" name="Scope" stroke={PURPLE} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="gap" name="Gap" stroke={AMBER} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="cnf" name="Confidence" stroke={MAGENTA} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="xst" name="Cross-Step" stroke={RED} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="lat" name="Latency" stroke={TEAL} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
