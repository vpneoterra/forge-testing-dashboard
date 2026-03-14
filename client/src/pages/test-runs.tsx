import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Check, X as XIcon, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TestRun } from "@shared/schema";
import { useState } from "react";
import { format } from "date-fns";

const DIMS = [
  { key: "scoreClassification", label: "Cls", color: "#E87722" },
  { key: "scoreStandards", label: "Std", color: "#00B4D8" },
  { key: "scoreParameters", label: "Par", color: "#2DC653" },
  { key: "scoreScope", label: "Scp", color: "#8B5CF6" },
  { key: "scoreGapAnalysis", label: "Gap", color: "#F59E0B" },
  { key: "scoreConfidence", label: "Cnf", color: "#D946EF" },
  { key: "scoreCrossStep", label: "XSt", color: "#EF4444" },
  { key: "scoreLatency", label: "Lat", color: "#06B6D4" },
] as const;

const tooltipStyle = { background: "#232529", border: "1px solid hsl(225,5%,22%)", borderRadius: 6, fontSize: 12 };

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pass: "bg-green-500/15 text-green-400 border-green-500/30",
    fail: "bg-red-500/15 text-red-400 border-red-500/30",
    error: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    partial: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return <Badge variant="outline" className={colors[status] || ""}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

function MatchIcon({ correct }: { correct: boolean | null | undefined }) {
  if (correct === true) return <Check className="w-3.5 h-3.5 text-green-400" />;
  if (correct === false) return <XIcon className="w-3.5 h-3.5 text-red-400" />;
  return <span className="text-muted-foreground text-xs">-</span>;
}

export default function TestRunsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [complexityFilter, setComplexityFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (industryFilter !== "all") params.set("industry", industryFilter);
  if (complexityFilter !== "all") params.set("complexity", complexityFilter);
  if (languageFilter !== "all") params.set("language", languageFilter);

  const queryStr = params.toString();
  const { data: runs, isLoading } = useQuery<TestRun[]>({
    queryKey: ["/api/test-runs" + (queryStr ? `?${queryStr}` : "")],
  });

  const sr = selectedRun;

  // Build timing chart for detail panel
  const timingData = sr ? [
    { step: "Step 1", ms: sr.forgeTimingStep1 || 0 },
    { step: "Step 2", ms: sr.forgeTimingStep2 || 0 },
    { step: "Step 3", ms: sr.forgeTimingStep3 || 0 },
  ] : [];

  return (
    <div className="p-6 space-y-4 max-w-[1600px]">
      <div>
        <h2 className="text-xl font-bold" data-testid="text-page-title">Test Runs</h2>
        <p className="text-sm text-muted-foreground">Full test history with 8-dimension scoring</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3" data-testid="filters-bar">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Industry" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {["consumer","consumer_electronics","hvac","electrical","nuclear","software","chemical","structural","automotive","water_treatment","marine","pharma","aerospace","biomedical","telecom","renewable","transportation","semiconductor","robotics","oil_gas","agriculture"].map(i =>
              <SelectItem key={i} value={i}>{i.replace(/_/g, " ")}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={complexityFilter} onValueChange={setComplexityFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Complexity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="entry">Entry</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="very_high">Very High</SelectItem>
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue placeholder="Lang" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {["en","es","de","fr","ja","pt","ko","ar","zh","hi","it","tr","sv","pl"].map(l =>
              <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto font-mono">{runs?.length || 0} runs</span>
      </div>

      {/* Table */}
      <Card className="bg-card border-card-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-test-runs">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Time</th>
                    <th className="text-left py-2 px-2 font-medium">Prompt</th>
                    <th className="text-left py-2 px-2 font-medium">Industry</th>
                    <th className="text-left py-2 px-2 font-medium">Status</th>
                    <th className="text-center py-2 px-2 font-medium">Score</th>
                    {DIMS.map(d => (
                      <th key={d.key} className="text-center py-2 px-1 font-medium" title={d.label} style={{ color: d.color }}>{d.label}</th>
                    ))}
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(runs || []).map((run) => (
                    <tr key={run.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedRun(run)} data-testid={`row-run-${run.id}`}>
                      <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{run.id}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground font-mono">{format(new Date(run.runAt), "MM/dd HH:mm")}</td>
                      <td className="py-2 px-2 max-w-[180px] truncate text-xs">{run.prompt.slice(0, 35)}…</td>
                      <td className="py-2 px-2"><span className={`text-xs font-mono ${run.industryCorrect ? "text-green-400" : "text-red-400"}`}>{run.forgeIndustry}</span></td>
                      <td className="py-2 px-2"><StatusBadge status={run.status} /></td>
                      <td className="py-2 px-2 text-center">
                        <span className={`font-mono font-bold text-sm ${(run.overallScore || 0) >= 70 ? "text-green-400" : (run.overallScore || 0) >= 45 ? "text-amber-400" : "text-red-400"}`}>{run.overallScore}</span>
                      </td>
                      {DIMS.map(d => {
                        const val = (run as any)[d.key] as number | null;
                        return (
                          <td key={d.key} className="py-2 px-1 text-center">
                            <span className={`text-[10px] font-mono font-bold ${(val || 0) >= 70 ? "text-green-400" : (val || 0) >= 45 ? "text-amber-400" : "text-red-400"}`}>{val ?? "-"}</span>
                          </td>
                        );
                      })}
                      <td className="py-2 px-2"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <SheetContent className="w-[560px] sm:max-w-[560px] bg-card border-l border-border overflow-y-auto" data-testid="sheet-run-detail">
          <SheetHeader>
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              Run #{sr?.id} {sr && <StatusBadge status={sr.status} />}
            </SheetTitle>
          </SheetHeader>

          {sr && (
            <ScrollArea className="mt-4 space-y-5 pr-2">
              <div className="space-y-5">
                {/* Prompt */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">PROMPT</h4>
                  <p className="text-xs bg-muted/30 rounded-md p-3 font-mono leading-relaxed">{sr.prompt}</p>
                </div>

                {/* Classification Comparison */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">CLASSIFICATION COMPARISON</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="font-medium text-muted-foreground"></div>
                    <div className="font-medium text-primary text-center">FORGE</div>
                    <div className="font-medium text-secondary text-center">Expected</div>
                    {[
                      { label: "Industry", forge: sr.forgeIndustry, expected: sr.claudeIndustry, correct: sr.industryCorrect },
                      { label: "Domain", forge: sr.forgeDomain, expected: sr.claudeDomain, correct: sr.domainCorrect },
                      { label: "Device Type", forge: sr.forgeDeviceType, expected: null, correct: sr.deviceTypeCorrect },
                      { label: "Intent", forge: sr.forgeIntent, expected: null, correct: sr.intentCorrect },
                    ].map((row, i) => (
                      <div key={i} className="contents">
                        <div className="flex items-center gap-1 text-muted-foreground"><MatchIcon correct={row.correct} /> {row.label}</div>
                        <div className="text-center font-mono">{row.forge || "-"}</div>
                        <div className="text-center font-mono">{row.expected || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dimension Scores */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">DIMENSION SCORES</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {DIMS.map(d => {
                      const val = (sr as any)[d.key] as number | null;
                      return (
                        <div key={d.key} className="text-center p-2 rounded-md border border-border/50">
                          <div className="text-[10px] text-muted-foreground mb-0.5" style={{ color: d.color }}>{d.label}</div>
                          <div className={`text-lg font-bold font-mono ${(val || 0) >= 70 ? "text-green-400" : (val || 0) >= 45 ? "text-amber-400" : "text-red-400"}`}>{val ?? "-"}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 mt-2 p-2 rounded-md bg-muted/20 border border-border">
                    <span className="text-xs text-muted-foreground">Overall:</span>
                    <span className={`text-xl font-bold font-mono ${(sr.overallScore || 0) >= 70 ? "text-green-400" : (sr.overallScore || 0) >= 45 ? "text-amber-400" : "text-red-400"}`}>{sr.overallScore}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${(sr.overallScore || 0) >= 70 ? "bg-green-400" : (sr.overallScore || 0) >= 45 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${sr.overallScore}%` }} />
                    </div>
                  </div>
                </div>

                {/* Entity Extraction */}
                {sr.forgeEntities && sr.forgeEntities.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">ENTITIES EXTRACTED ({sr.forgeEntities.length})</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {sr.forgeEntities.map((e, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-primary/30 text-primary">{e}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Standards */}
                {sr.forgeStandards && sr.forgeStandards.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">STANDARDS CITED ({sr.forgeStandards.length})</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {sr.forgeStandards.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-secondary/30 text-secondary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timing Breakdown */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">TIMING BREAKDOWN</h4>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={timingData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 5% 22%)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} unit="ms" />
                      <YAxis type="category" dataKey="step" tick={{ fontSize: 10, fill: "#9CA3AF" }} width={45} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="ms" fill="#E87722" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="text-xs text-muted-foreground mt-1">Total: {sr.forgeTiming ? `${sr.forgeTiming}ms` : "-"}</div>
                </div>

                {/* FORGE Response */}
                {sr.forgeResponse && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">FORGE RESPONSE</h4>
                    <div className="bg-muted/20 rounded-md p-3 border border-border">
                      <pre className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-auto">
                        {JSON.stringify(sr.forgeResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Errors */}
                {sr.errorMessage && (
                  <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
                    <h4 className="text-xs font-medium text-red-400 mb-1">ERROR</h4>
                    <p className="text-xs font-mono text-red-300">{sr.errorMessage}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
