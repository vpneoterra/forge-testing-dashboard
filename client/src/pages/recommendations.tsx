import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Hash,
  Lightbulb,
  XCircle,
} from "lucide-react";
import type { Recommendation, TestRun } from "@shared/schema";
import { useState } from "react";
import { format } from "date-fns";

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    low: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${styles[severity] || ""}`} data-testid={`badge-severity-${severity}`}>
      {severity.toUpperCase()}
    </Badge>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "open": return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    case "in_progress": return <Clock className="w-3.5 h-3.5 text-blue-400" />;
    case "resolved": return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    case "wont_fix": return <XCircle className="w-3.5 h-3.5 text-slate-400" />;
    default: return null;
  }
}

export default function Recommendations() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data: recs, isLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  const { data: selectedRec } = useQuery<Recommendation & { linkedRuns: TestRun[] }>({
    queryKey: ["/api/recommendations", selectedId],
    enabled: !!selectedId,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/recommendations/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["/api/recommendations", selectedId] });
      toast({ title: "Status updated" });
    },
  });

  const filteredRecs = (recs || []).filter(r => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (severityFilter !== "all" && r.severity !== severityFilter) return false;
    return true;
  });

  const categories = [...new Set((recs || []).map(r => r.category))];

  return (
    <div className="flex h-full" data-testid="page-recommendations">
      {/* Left Panel — List */}
      <div className="w-[380px] border-r border-border flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold mb-1" data-testid="text-page-title">Recommendations</h2>
          <p className="text-xs text-muted-foreground mb-3">Improvement tracking for FORGE pipeline</p>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-7 text-[11px] flex-1" data-testid="select-category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-7 text-[11px] flex-1" data-testid="select-severity-filter">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1.5">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : filteredRecs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No recommendations match filters</div>
            ) : (
              filteredRecs.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedId === rec.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-border hover:bg-muted/20"
                  }`}
                  onClick={() => setSelectedId(rec.id)}
                  data-testid={`card-rec-${rec.id}`}
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <SeverityBadge severity={rec.severity} />
                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                      {rec.category}
                    </Badge>
                    <div className="ml-auto flex items-center gap-1">
                      <StatusIcon status={rec.status} />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold leading-tight mb-1" data-testid={`text-rec-title-${rec.id}`}>{rec.title}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{rec.description.slice(0, 120)}…</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {rec.affectedTests} tests
                    </span>
                    <span className="capitalize">{rec.status.replace("_", " ")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel — Detail */}
      <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
        {!selectedId ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a recommendation to view details</p>
            </div>
          </div>
        ) : !selectedRec ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-[800px]" data-testid="panel-rec-detail">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SeverityBadge severity={selectedRec.severity} />
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                  {selectedRec.category}
                </Badge>
                <div className="flex items-center gap-1.5 ml-auto">
                  <StatusIcon status={selectedRec.status} />
                  <span className="text-xs capitalize text-muted-foreground">{selectedRec.status.replace("_", " ")}</span>
                </div>
              </div>
              <h2 className="text-lg font-bold" data-testid="text-rec-detail-title">{selectedRec.title}</h2>
            </div>

            {/* Status Controls */}
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/10" data-testid="panel-status-controls">
              <span className="text-xs text-muted-foreground mr-2">Change status:</span>
              {["open", "in_progress", "resolved", "wont_fix"].map((s) => (
                <Button
                  key={s}
                  variant={selectedRec.status === s ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-[11px] ${selectedRec.status === s ? "bg-primary" : ""}`}
                  onClick={() => updateStatus.mutate({ id: selectedRec.id, status: s })}
                  disabled={updateStatus.isPending}
                  data-testid={`button-status-${s}`}
                >
                  <StatusIcon status={s} />
                  <span className="ml-1 capitalize">{s.replace("_", " ")}</span>
                </Button>
              ))}
            </div>

            {/* Impact */}
            <div className="flex gap-4">
              <Card className="bg-card border-card-border flex-1">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold font-mono text-primary">{selectedRec.affectedTests}</div>
                  <div className="text-[10px] text-muted-foreground">Tests Affected</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-card-border flex-1">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold font-mono text-secondary">{selectedRec.linkedRunIds?.length || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Linked Runs</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-card-border flex-1">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold font-mono">{format(new Date(selectedRec.createdAt), "MM/dd")}</div>
                  <div className="text-[10px] text-muted-foreground">Created</div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedRec.description}</p>
            </div>

            {/* Action Items */}
            {selectedRec.actionItems && selectedRec.actionItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Action Items</h3>
                <ul className="space-y-2">
                  {selectedRec.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Linked Test Runs */}
            {selectedRec.linkedRuns && selectedRec.linkedRuns.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Linked Test Runs</h3>
                <div className="space-y-1.5">
                  {selectedRec.linkedRuns.map((run) => (
                    <div key={run.id} className="flex items-center gap-3 p-2 rounded border border-border/60 text-xs" data-testid={`row-linked-run-${run.id}`}>
                      <span className="font-mono text-muted-foreground">#{run.id}</span>
                      <span className="text-muted-foreground">{format(new Date(run.runAt), "MM/dd HH:mm")}</span>
                      <span className="truncate flex-1">{run.prompt.slice(0, 50)}…</span>
                      <span className={`font-mono font-bold ${ (run.overallScore || 0) >= 70 ? "text-green-400" : (run.overallScore || 0) >= 45 ? "text-amber-400" : "text-red-400"}`}>{run.overallScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
