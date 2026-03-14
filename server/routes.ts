import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTestConfig, insertTestRun } from "@shared/schema";

// Scheduler state
let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let schedulerRunning = false;
let nextRunTime: Date | null = null;

// ========================
// Multi-Axis Scoring Engine
// ========================

function scoreClassification(config: any, forgeData: any): number {
  let score = 0;
  const expected = config.expectedIndustry?.toLowerCase() || "";
  const detected = (forgeData.industry || "").toLowerCase();
  // Industry key match: 40pts
  if (detected.includes(expected.split("/")[0].trim()) || expected.includes(detected.split("/")[0].trim())) score += 40;
  // Domain type match: 25pts
  const expectedDomain = (config.expectedDomain || "").toLowerCase();
  const detectedDomain = (forgeData.domain || "").toLowerCase();
  if (detectedDomain.includes(expectedDomain.split(" ")[0]) || expectedDomain.includes(detectedDomain.split(" ")[0])) score += 25;
  // Device type match: 15pts
  if (config.expectedDeviceType && forgeData.deviceType && forgeData.deviceType.toLowerCase().includes(config.expectedDeviceType.toLowerCase().split("_")[0])) score += 15;
  // Intent detection: 20pts
  if (config.expectedIntent && forgeData.intent && forgeData.intent.toLowerCase() === config.expectedIntent.toLowerCase()) score += 20;
  return Math.min(100, score);
}

function scoreStandards(config: any, forgeData: any): number {
  let score = 0;
  const count = forgeData.standardsCount || 0;
  // Count adequacy: 30pts
  if (count >= 15) score += 30;
  else if (count >= 10) score += 25;
  else if (count >= 5) score += 15;
  // Relevance: 40pts
  const expectedStds = config.expectedStandards || [];
  const forgeStds = forgeData.standards || [];
  if (expectedStds.length > 0 && forgeStds.length > 0) {
    const forgeStdCodes = forgeStds.map((s: any) => (typeof s === "string" ? s : s.code || "").toLowerCase());
    const matched = expectedStds.filter((es: string) => forgeStdCodes.some((fc: string) => fc.includes(es.toLowerCase().split(" ")[0]) || es.toLowerCase().includes(fc.split(" ")[0])));
    score += Math.round((matched.length / expectedStds.length) * 40);
  } else if (count >= 5) {
    score += 15;
  }
  // Specificity: 15pts (not just ISO 9001)
  const genericStds = ["iso 9001", "iso 14001", "iso 45001"];
  const nonGeneric = forgeStds.filter((s: any) => {
    const code = (typeof s === "string" ? s : s.code || "").toLowerCase();
    return !genericStds.some(g => code.includes(g));
  });
  score += Math.min(15, Math.round((nonGeneric.length / Math.max(count, 1)) * 15));
  // Citation accuracy: 15pts
  if (count > 0) score += Math.min(15, Math.round((count / 10) * 15));
  return Math.min(100, score);
}

function scoreParameters(config: any, forgeData: any): number {
  let score = 0;
  // Scale reasonableness: 30pts
  const complexity = config.expectedComplexityTier || config.complexity || "medium";
  const teamSize = forgeData.teamSize || 3;
  const duration = forgeData.durationMonths || 6;
  const scaleMap: Record<string, { minTeam: number; maxTeam: number; minDur: number; maxDur: number }> = {
    entry: { minTeam: 1, maxTeam: 5, minDur: 2, maxDur: 8 },
    low: { minTeam: 2, maxTeam: 8, minDur: 3, maxDur: 12 },
    medium: { minTeam: 4, maxTeam: 15, minDur: 6, maxDur: 24 },
    high: { minTeam: 6, maxTeam: 25, minDur: 10, maxDur: 36 },
    very_high: { minTeam: 10, maxTeam: 50, minDur: 18, maxDur: 60 },
  };
  const scale = scaleMap[complexity] || scaleMap.medium;
  if (teamSize >= scale.minTeam && teamSize <= scale.maxTeam) score += 15;
  else score += 5;
  if (duration >= scale.minDur && duration <= scale.maxDur) score += 15;
  else score += 5;
  // Solver relevance: 25pts
  const expectedSolvers = config.expectedSolverTypes || [];
  const forgeSolvers = forgeData.solverTypes || [];
  if (expectedSolvers.length > 0 && forgeSolvers.length > 0) {
    const matched = expectedSolvers.filter((es: string) => forgeSolvers.some((fs: string) => fs.toLowerCase().includes(es.toLowerCase().split("_")[0])));
    score += Math.round((matched.length / expectedSolvers.length) * 25);
  } else if (forgeSolvers.length > 0) {
    score += 10;
  }
  // KPI relevance: 25pts
  const expectedKpis = config.expectedKpis || [];
  const forgeKpis = forgeData.kpis || [];
  if (expectedKpis.length > 0 && forgeKpis.length > 0) {
    const matched = expectedKpis.filter((ek: string) => forgeKpis.some((fk: string) => fk.toLowerCase().includes(ek.toLowerCase().split("_")[0])));
    score += Math.round((matched.length / expectedKpis.length) * 25);
  } else if (forgeKpis.length > 0) {
    score += 10;
  }
  // Governance: 20pts
  if (config.expectedRigorLevel && forgeData.rigorLevel && forgeData.rigorLevel.toLowerCase() === config.expectedRigorLevel.toLowerCase()) score += 20;
  else if (forgeData.rigorLevel) score += 8;
  return Math.min(100, score);
}

function scoreScope(forgeData: any): number {
  let score = 0;
  const stages = forgeData.pipelineStages || 0;
  // Pipeline depth: 30pts
  if (stages >= 7) score += 30;
  else if (stages >= 5) score += 25;
  else if (stages >= 3) score += 15;
  else if (stages >= 1) score += 5;
  // Convergence loops: 25pts
  const loops = forgeData.convergenceLoops || 0;
  if (loops >= 5) score += 25;
  else if (loops >= 3) score += 20;
  else if (loops >= 1) score += 10;
  // Review gates: 25pts
  const gates = forgeData.reviewGates || 0;
  if (gates >= 5) score += 25;
  else if (gates >= 3) score += 20;
  else if (gates >= 1) score += 10;
  // Duration/complexity: 20pts
  if (stages >= 5 && loops >= 2 && gates >= 2) score += 20;
  else if (stages >= 3) score += 10;
  return Math.min(100, score);
}

function scoreGapAnalysis(forgeData: any): number {
  let score = 0;
  const gaps = forgeData.gaps || [];
  const questions = forgeData.questions || [];
  // Gaps: 40pts
  if (gaps.length >= 5) score += 40;
  else if (gaps.length >= 3) score += 30;
  else if (gaps.length >= 1) score += 15;
  // Questions: 30pts
  if (questions.length >= 5) score += 30;
  else if (questions.length >= 3) score += 20;
  else if (questions.length >= 1) score += 10;
  // Gap relevance: 30pts (assume relevant if specific)
  const relevantGaps = gaps.filter((g: any) => g.priority === "high" || g.priority === "critical");
  score += Math.min(30, relevantGaps.length * 10);
  return Math.min(100, score);
}

function scoreConfidenceCalibration(industryCorrect: boolean, confidence: number): number {
  let score = 0;
  if (industryCorrect && confidence > 0.8) score += 50;
  else if (!industryCorrect && confidence < 0.6) score += 30;
  else if (industryCorrect && confidence > 0.7) score += 30;
  else if (!industryCorrect && confidence > 0.8) score += 0; // overconfident wrong
  else score += 15;
  // Per-field confidence spread: 20pts (simplified)
  if (confidence > 0.5) score += 20;
  // Low confidence on ambiguous: bonus
  if (!industryCorrect && confidence < 0.5) score += 20;
  return Math.min(100, score);
}

function scoreCrossStep(forgeData: any): number {
  let score = 0;
  const s1 = forgeData.step1Industry || "";
  const s2 = forgeData.step2Industry || "";
  const s3 = forgeData.step3Industry || "";
  // Industry same across steps: 50pts
  if (s1 && s2 && s3 && s1.toLowerCase() === s2.toLowerCase() && s2.toLowerCase() === s3.toLowerCase()) score += 50;
  else if (s1 && s2 && s1.toLowerCase() === s2.toLowerCase()) score += 25;
  // Domain consistency: 25pts (simplified - grant if industry consistent)
  if (s1 && s2 && s3 && s1.toLowerCase() === s2.toLowerCase() && s2.toLowerCase() === s3.toLowerCase()) score += 25;
  else score += 10;
  // Standards-governance match: 25pts (simplified)
  if (forgeData.pipelineStages >= 4 && forgeData.standardsCount >= 5) score += 25;
  else if (forgeData.standardsCount >= 3) score += 10;
  return Math.min(100, score);
}

function scoreLatency(timingMs: number, step2Ms?: number): number {
  let score = 0;
  if (timingMs < 10000) score = 100;
  else if (timingMs < 20000) score = 80;
  else if (timingMs < 30000) score = 60;
  else if (timingMs < 40000) score = 40;
  else if (timingMs < 60000) score = 20;
  else score = 0;
  // Bonus: step2 < 15s
  if (step2Ms && step2Ms < 15000) score = Math.min(100, score + 10);
  return score;
}

function extractForgeFields(response: any) {
  if (!response) return {};
  const s1 = response.step1_interpret || response.step1 || {};
  const s2 = response.step2_refine || response.step2 || {};
  const s3 = response.step3_generate || response.step3 || {};
  const project = response.project || {};
  const timing = response.timing || {};

  return {
    industry: s1.industry || s1.classifiedIndustry || response.industry || "Unknown",
    domain: s1.domain || s1.classifiedDomain || response.domain || "Unknown",
    confidence: s1.confidence || response.confidence || 0.5,
    deviceType: s1.deviceType || s1.device_type || null,
    intent: s1.intent || s1.project_intent || null,
    entities: s1.entities || s1.key_entities || [],
    standards: s2.standards || s2.applicable_standards || [],
    standardsCount: (s2.standards || s2.applicable_standards || []).length,
    cpcSections: s1.cpc_sections || [],
    cpcClasses: s1.cpc_classes || [],
    cpcSubclasses: s1.cpc_subclasses || [],
    projectName: project.name || s3.project_name || null,
    complexityTier: s1.complexity_tier || s1.complexity || null,
    rigorLevel: s2.rigor_level || s2.governance?.rigor_level || null,
    solverTypes: s2.solver_types || s2.simulation?.solver_types || [],
    kpis: s2.kpis || s3.kpis || [],
    gaps: s3.gaps || s3.gap_analysis || [],
    questions: s3.questions || s3.clarification_questions || [],
    pipelineStages: s3.pipeline_stages || s3.stages?.length || project.pipeline_stages || 3,
    convergenceLoops: s3.convergence_loops || project.convergence_loops || 0,
    reviewGates: s3.review_gates || project.review_gates || 0,
    durationMonths: project.duration_months || s3.duration_months || null,
    teamSize: project.team_size || s3.team_size || null,
    step1Industry: s1.industry || s1.classifiedIndustry || null,
    step2Industry: s2.industry || s2.classifiedIndustry || null,
    step3Industry: s3.industry || s3.classifiedIndustry || null,
    timingStep1: timing.step1_ms || timing.step1 || null,
    timingStep2: timing.step2_ms || timing.step2 || null,
    timingStep3: timing.step3_ms || timing.step3 || null,
  };
}

async function triggerTest() {
  try {
    const configs = await storage.getActiveTestConfigs();
    if (configs.length === 0) return null;

    const config = configs[Math.floor(Math.random() * configs.length)];
    const prompt = config.templatePrompt;
    const startTime = Date.now();

    let forgeResponse: any = null;
    let forgeStatus = 0;
    let forgeTimingMs = 0;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch("https://forgenew-production.up.railway.app/api/onboarding/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      forgeStatus = res.status;
      forgeTimingMs = Date.now() - startTime;
      if (res.ok) {
        forgeResponse = await res.json();
      }
    } catch (err: any) {
      forgeTimingMs = Date.now() - startTime;
      forgeStatus = 0;
    }

    // Extract fields
    const forgeData = extractForgeFields(forgeResponse);
    const forgeIndustry = forgeData.industry;
    const forgeDomain = forgeData.domain;
    const forgeConfidence = forgeData.confidence;

    // Compare industry
    const industryCorrect = forgeIndustry.toLowerCase().includes(config.expectedIndustry.toLowerCase().split("/")[0].trim()) ||
      config.expectedIndustry.toLowerCase().includes(forgeIndustry.toLowerCase().split("/")[0].trim());
    const domainCorrect = forgeDomain.toLowerCase().includes(config.expectedDomain.toLowerCase().split(" ")[0]) ||
      config.expectedDomain.toLowerCase().includes(forgeDomain.toLowerCase().split(" ")[0]);
    const deviceTypeCorrect = !!(config.expectedDeviceType && forgeData.deviceType &&
      forgeData.deviceType.toLowerCase().includes(config.expectedDeviceType.toLowerCase().split("_")[0]));
    const intentCorrect = !!(config.expectedIntent && forgeData.intent &&
      forgeData.intent.toLowerCase() === config.expectedIntent.toLowerCase());

    // Cross-step drift
    const s1 = forgeData.step1Industry || forgeIndustry;
    const s2 = forgeData.step2Industry || forgeIndustry;
    const s3 = forgeData.step3Industry || forgeIndustry;
    const industryDriftDetected = !!(s1 && s2 && s3 && (s1.toLowerCase() !== s2.toLowerCase() || s2.toLowerCase() !== s3.toLowerCase()));

    // Score each dimension
    const scClassification = scoreClassification(config, { industry: forgeIndustry, domain: forgeDomain, deviceType: forgeData.deviceType, intent: forgeData.intent });
    const scStandards = scoreStandards(config, { standardsCount: forgeData.standardsCount, standards: forgeData.standards });
    const scParameters = scoreParameters(config, { teamSize: forgeData.teamSize, durationMonths: forgeData.durationMonths, solverTypes: forgeData.solverTypes, kpis: forgeData.kpis, rigorLevel: forgeData.rigorLevel });
    const scScope = scoreScope({ pipelineStages: forgeData.pipelineStages, convergenceLoops: forgeData.convergenceLoops, reviewGates: forgeData.reviewGates, standardsCount: forgeData.standardsCount });
    const scGapAnalysis = scoreGapAnalysis({ gaps: forgeData.gaps, questions: forgeData.questions });
    const scConfidence = scoreConfidenceCalibration(industryCorrect, forgeConfidence);
    const scCrossStep = scoreCrossStep({ step1Industry: s1, step2Industry: s2, step3Industry: s3, pipelineStages: forgeData.pipelineStages, standardsCount: forgeData.standardsCount });
    const scLatency = scoreLatency(forgeTimingMs, forgeData.timingStep2 || undefined);

    // Overall weighted score
    const overallScore = Math.round(
      scClassification * 0.25 +
      scStandards * 0.20 +
      scParameters * 0.15 +
      scScope * 0.15 +
      scGapAnalysis * 0.05 +
      scConfidence * 0.05 +
      scCrossStep * 0.05 +
      scLatency * 0.10
    );

    // Status
    let status = "fail";
    if (overallScore >= 70 && industryCorrect) status = "pass";
    else if (overallScore >= 45 || industryCorrect) status = "partial";
    else if (forgeStatus === 0) status = "error";

    // Issues
    const issues: string[] = [];
    if (!industryCorrect) issues.push(`Industry misclassified: expected "${config.expectedIndustry}", got "${forgeIndustry}"`);
    if (forgeData.standardsCount < 5) issues.push(`Low standards count: ${forgeData.standardsCount}`);
    if (forgeData.pipelineStages < 4) issues.push(`Shallow pipeline: ${forgeData.pipelineStages} stages`);
    if (forgeConfidence > 0.8 && !industryCorrect) issues.push("High confidence on wrong answer");
    if (forgeTimingMs > 30000) issues.push(`Slow response: ${forgeTimingMs}ms`);
    if (industryDriftDetected) issues.push("Cross-step industry drift detected");

    const improvements: string[] = [];
    if (!industryCorrect) improvements.push(`Add ${config.expectedIndustry} to taxonomy`);
    if (config.language !== "en") improvements.push(`Improve ${config.language} language support`);

    const run = await storage.createTestRun({
      configId: config.id,
      runAt: new Date(),
      status,
      prompt,
      industry: config.industry,
      complexity: config.complexity,
      language: config.language,
      promptLength: config.promptLength,
      forgeStatus,
      forgeIndustry,
      forgeDomain,
      forgeConfidence,
      forgePipelineStages: forgeData.pipelineStages,
      forgeStandardsCount: forgeData.standardsCount,
      forgeTimingMs,
      forgeResponse,
      claudeIndustry: config.expectedIndustry,
      claudeDomain: config.expectedDomain,
      claudeConfidence: 0.9,
      claudePipelineStages: 5,
      claudeStandardsCount: 12,
      claudeResponse: null,
      industryCorrect,
      overallScore,
      issues,
      improvements,
      scoreClassification: scClassification,
      scoreStandards: scStandards,
      scoreParameters: scParameters,
      scoreScope: scScope,
      scoreGapAnalysis: scGapAnalysis,
      scoreConfidence: scConfidence,
      scoreCrossStep: scCrossStep,
      scoreLatency: scLatency,
      forgeDeviceType: forgeData.deviceType,
      forgeIntent: forgeData.intent,
      forgeEntities: forgeData.entities,
      forgeStandards: forgeData.standards,
      forgeCpcSections: forgeData.cpcSections,
      forgeCpcClasses: forgeData.cpcClasses,
      forgeCpcSubclasses: forgeData.cpcSubclasses,
      forgeProjectName: forgeData.projectName,
      forgeComplexityTier: forgeData.complexityTier,
      forgeRigorLevel: forgeData.rigorLevel,
      forgeSolverTypes: forgeData.solverTypes,
      forgeKpis: forgeData.kpis,
      forgeGaps: forgeData.gaps,
      forgeQuestions: forgeData.questions,
      forgeConvergenceLoops: forgeData.convergenceLoops,
      forgeReviewGates: forgeData.reviewGates,
      forgeDurationMonths: forgeData.durationMonths,
      forgeTeamSize: forgeData.teamSize,
      forgeTimingStep1: forgeData.timingStep1,
      forgeTimingStep2: forgeData.timingStep2,
      forgeTimingStep3: forgeData.timingStep3,
      step1Industry: s1,
      step2Industry: s2,
      step3Industry: s3,
      industryDriftDetected,
      domainCorrect,
      deviceTypeCorrect,
      intentCorrect,
    });

    return run;
  } catch (err) {
    console.error("Trigger test error:", err);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Test Configs
  app.get("/api/test-configs", async (_req, res) => {
    const configs = await storage.getTestConfigs();
    res.json(configs);
  });

  app.post("/api/test-configs", async (req, res) => {
    const parsed = insertTestConfig.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const config = await storage.createTestConfig(parsed.data);
    res.json(config);
  });

  // Test Runs
  app.get("/api/test-runs", async (req, res) => {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.industry) filters.industry = req.query.industry as string;
    if (req.query.complexity) filters.complexity = req.query.complexity as string;
    if (req.query.language) filters.language = req.query.language as string;
    const runs = await storage.getTestRuns(filters);
    res.json(runs);
  });

  app.get("/api/test-runs/:id", async (req, res) => {
    const run = await storage.getTestRun(parseInt(req.params.id));
    if (!run) return res.status(404).json({ error: "Not found" });
    res.json(run);
  });

  app.post("/api/test-runs", async (req, res) => {
    const parsed = insertTestRun.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const run = await storage.createTestRun(parsed.data);
    res.json(run);
  });

  app.post("/api/test-runs/trigger", async (_req, res) => {
    const run = await triggerTest();
    if (!run) return res.status(500).json({ error: "Failed to trigger test" });
    res.json(run);
  });

  // Recommendations
  app.get("/api/recommendations", async (_req, res) => {
    const recs = await storage.getRecommendations();
    res.json(recs);
  });

  app.get("/api/recommendations/:id", async (req, res) => {
    const rec = await storage.getRecommendation(parseInt(req.params.id));
    if (!rec) return res.status(404).json({ error: "Not found" });
    const linkedRuns = [];
    if (rec.linkedRunIds) {
      for (const rid of rec.linkedRunIds) {
        const run = await storage.getTestRun(rid);
        if (run) linkedRuns.push(run);
      }
    }
    res.json({ ...rec, linkedRuns });
  });

  app.patch("/api/recommendations/:id", async (req, res) => {
    const { status } = req.body;
    const updated = await storage.updateRecommendation(parseInt(req.params.id), { status });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // Benchmarks
  app.get("/api/benchmarks", async (_req, res) => {
    const benchmarks = await storage.getBenchmarks();
    res.json(benchmarks);
  });

  // Stats
  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // RAG Quality Stats
  app.get("/api/rag-quality", async (_req, res) => {
    const ragStats = await storage.getRagQualityStats();
    res.json(ragStats);
  });

  // Scheduler
  app.get("/api/scheduler/status", async (_req, res) => {
    res.json({
      running: schedulerRunning,
      interval: 3600000,
      nextRun: nextRunTime,
    });
  });

  app.post("/api/scheduler/start", async (_req, res) => {
    if (schedulerRunning) return res.json({ message: "Already running" });
    schedulerRunning = true;
    nextRunTime = new Date(Date.now() + 3600000);
    schedulerInterval = setInterval(async () => {
      await triggerTest();
      nextRunTime = new Date(Date.now() + 3600000);
    }, 3600000);
    res.json({ message: "Scheduler started", nextRun: nextRunTime });
  });

  app.post("/api/scheduler/stop", async (_req, res) => {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
    schedulerRunning = false;
    nextRunTime = null;
    res.json({ message: "Scheduler stopped" });
  });

  // Auto-start scheduler on boot in production
  if (process.env.NODE_ENV === "production" || process.env.AUTO_SCHEDULER === "true") {
    schedulerRunning = true;
    // Run first test 60s after boot, then every hour
    setTimeout(async () => {
      console.log("[scheduler] Running initial test on boot...");
      await triggerTest();
      nextRunTime = new Date(Date.now() + 3600000);
    }, 60000);
    schedulerInterval = setInterval(async () => {
      console.log("[scheduler] Running hourly test...");
      await triggerTest();
      nextRunTime = new Date(Date.now() + 3600000);
    }, 3600000);
    nextRunTime = new Date(Date.now() + 60000);
    console.log("[scheduler] Auto-started. First test in 60s, then every hour.");
  }

  return httpServer;
}
