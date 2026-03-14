import {
  type TestConfig, type InsertTestConfig,
  type TestRun, type InsertTestRun,
  type Recommendation, type InsertRecommendation,
  type Benchmark, type InsertBenchmark,
} from "@shared/schema";

export interface IStorage {
  // Test Configs
  getTestConfigs(): Promise<TestConfig[]>;
  getTestConfig(id: number): Promise<TestConfig | undefined>;
  createTestConfig(config: InsertTestConfig): Promise<TestConfig>;
  updateTestConfig(id: number, config: Partial<InsertTestConfig>): Promise<TestConfig | undefined>;
  deleteTestConfig(id: number): Promise<boolean>;

  // Test Runs
  getTestRuns(): Promise<TestRun[]>;
  getTestRun(id: number): Promise<TestRun | undefined>;
  getTestRunsByConfig(configId: number): Promise<TestRun[]>;
  createTestRun(run: InsertTestRun): Promise<TestRun>;
  updateTestRun(id: number, run: Partial<InsertTestRun>): Promise<TestRun | undefined>;

  // Recommendations
  getRecommendations(): Promise<Recommendation[]>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  createRecommendation(rec: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: number, rec: Partial<InsertRecommendation>): Promise<Recommendation | undefined>;

  // Benchmarks
  getBenchmarks(): Promise<Benchmark[]>;
  getBenchmark(id: number): Promise<Benchmark | undefined>;
  createBenchmark(benchmark: InsertBenchmark): Promise<Benchmark>;
}

export class MemStorage implements IStorage {
  private testConfigs: Map<number, TestConfig>;
  private testRuns: Map<number, TestRun>;
  private recommendations: Map<number, Recommendation>;
  private benchmarks: Map<number, Benchmark>;
  private nextId: { configs: number; runs: number; recs: number; benchmarks: number };

  constructor() {
    this.testConfigs = new Map();
    this.testRuns = new Map();
    this.recommendations = new Map();
    this.benchmarks = new Map();
    this.nextId = { configs: 1, runs: 1, recs: 1, benchmarks: 1 };
    this.seedData();
  }

  private seedData() {
    const configs: InsertTestConfig[] = [
      // Healthcare & Medical
      {
        name: "Clinical Diagnosis Assistant",
        industry: "Healthcare",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 1024, topP: 0.9 },
        scoringDimensions: ["classification", "standards", "parameters", "scope", "gap_analysis", "confidence", "cross_step", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      {
        name: "Medical Records Summarizer",
        industry: "Healthcare",
        language: "Spanish",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 2048, topP: 0.95 },
        scoringDimensions: ["classification", "standards", "scope", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 120,
      },
      // Legal & Compliance
      {
        name: "Contract Review Engine",
        industry: "Legal",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.05, maxTokens: 4096, topP: 0.99 },
        scoringDimensions: ["classification", "standards", "parameters", "scope", "gap_analysis", "confidence", "cross_step", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      {
        name: "Regulatory Compliance Checker",
        industry: "Legal",
        language: "French",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 2048, topP: 0.95 },
        scoringDimensions: ["classification", "standards", "scope", "gap_analysis", "confidence"],
        isActive: true,
        scheduleInterval: 180,
      },
      // Financial Services
      {
        name: "Investment Portfolio Analyzer",
        industry: "Finance",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.15, maxTokens: 2048, topP: 0.92 },
        scoringDimensions: ["classification", "standards", "parameters", "scope", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 30,
      },
      {
        name: "Fraud Detection Assistant",
        industry: "Finance",
        language: "German",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.05, maxTokens: 1024, topP: 0.98 },
        scoringDimensions: ["classification", "standards", "gap_analysis", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 15,
      },
      // Technology & Software
      {
        name: "Code Review Assistant",
        industry: "Technology",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 8192, topP: 0.9 },
        scoringDimensions: ["classification", "parameters", "scope", "gap_analysis", "cross_step", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      {
        name: "API Documentation Generator",
        industry: "Technology",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.3, maxTokens: 4096, topP: 0.85 },
        scoringDimensions: ["classification", "standards", "scope", "confidence"],
        isActive: false,
        scheduleInterval: 240,
      },
      // Education
      {
        name: "Curriculum Builder",
        industry: "Education",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.4, maxTokens: 3072, topP: 0.88 },
        scoringDimensions: ["classification", "standards", "scope", "gap_analysis", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 120,
      },
      {
        name: "Student Assessment Analyzer",
        industry: "Education",
        language: "Portuguese",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.25, maxTokens: 2048, topP: 0.91 },
        scoringDimensions: ["classification", "parameters", "scope", "confidence"],
        isActive: true,
        scheduleInterval: 180,
      },
      // Manufacturing
      {
        name: "Quality Control Inspector",
        industry: "Manufacturing",
        language: "Japanese",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 1024, topP: 0.97 },
        scoringDimensions: ["classification", "standards", "parameters", "gap_analysis", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 30,
      },
      {
        name: "Supply Chain Optimizer",
        industry: "Manufacturing",
        language: "Chinese",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 2048, topP: 0.93 },
        scoringDimensions: ["classification", "standards", "scope", "cross_step", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      // Retail & E-commerce
      {
        name: "Product Recommendation Engine",
        industry: "Retail",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.45, maxTokens: 1024, topP: 0.87 },
        scoringDimensions: ["classification", "parameters", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 15,
      },
      {
        name: "Customer Service Bot",
        industry: "Retail",
        language: "Italian",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.35, maxTokens: 512, topP: 0.9 },
        scoringDimensions: ["classification", "standards", "scope", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 30,
      },
      // Energy & Utilities
      {
        name: "Grid Load Forecaster",
        industry: "Energy",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 2048, topP: 0.96 },
        scoringDimensions: ["classification", "standards", "parameters", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      {
        name: "Renewable Energy Advisor",
        industry: "Energy",
        language: "Korean",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.3, maxTokens: 1536, topP: 0.89 },
        scoringDimensions: ["classification", "scope", "gap_analysis", "confidence"],
        isActive: false,
        scheduleInterval: 120,
      },
      // Insurance
      {
        name: "Claims Processing Assistant",
        industry: "Insurance",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 2048, topP: 0.97 },
        scoringDimensions: ["classification", "standards", "parameters", "scope", "gap_analysis", "confidence", "cross_step", "latency"],
        isActive: true,
        scheduleInterval: 45,
      },
      {
        name: "Risk Assessment Engine",
        industry: "Insurance",
        language: "Dutch",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.05, maxTokens: 3072, topP: 0.99 },
        scoringDimensions: ["classification", "standards", "gap_analysis", "confidence"],
        isActive: true,
        scheduleInterval: 90,
      },
      // Real Estate
      {
        name: "Property Valuation Assistant",
        industry: "Real Estate",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 2048, topP: 0.92 },
        scoringDimensions: ["classification", "standards", "parameters", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      {
        name: "Market Trend Analyzer",
        industry: "Real Estate",
        language: "Arabic",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.25, maxTokens: 1024, topP: 0.9 },
        scoringDimensions: ["classification", "scope", "gap_analysis", "confidence"],
        isActive: true,
        scheduleInterval: 120,
      },
      // Pharmaceuticals
      {
        name: "Drug Interaction Checker",
        industry: "Pharmaceuticals",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.05, maxTokens: 2048, topP: 0.99 },
        scoringDimensions: ["classification", "standards", "parameters", "scope", "gap_analysis", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 30,
      },
      {
        name: "Clinical Trial Monitor",
        industry: "Pharmaceuticals",
        language: "Swedish",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 4096, topP: 0.97 },
        scoringDimensions: ["classification", "standards", "scope", "cross_step", "confidence"],
        isActive: true,
        scheduleInterval: 60,
      },
      // Government & Public Sector
      {
        name: "Policy Analysis Assistant",
        industry: "Government",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.15, maxTokens: 4096, topP: 0.94 },
        scoringDimensions: ["classification", "standards", "scope", "gap_analysis", "confidence", "cross_step"],
        isActive: true,
        scheduleInterval: 180,
      },
      {
        name: "Benefits Eligibility Checker",
        industry: "Government",
        language: "Hindi",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 1024, topP: 0.96 },
        scoringDimensions: ["classification", "standards", "parameters", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      // Agriculture
      {
        name: "Crop Disease Detector",
        industry: "Agriculture",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 1536, topP: 0.91 },
        scoringDimensions: ["classification", "standards", "gap_analysis", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 90,
      },
      {
        name: "Irrigation Optimizer",
        industry: "Agriculture",
        language: "Turkish",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.15, maxTokens: 1024, topP: 0.93 },
        scoringDimensions: ["classification", "parameters", "scope", "confidence"],
        isActive: false,
        scheduleInterval: 120,
      },
      // Transportation & Logistics
      {
        name: "Route Optimization Engine",
        industry: "Transportation",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 2048, topP: 0.96 },
        scoringDimensions: ["classification", "parameters", "scope", "cross_step", "latency"],
        isActive: true,
        scheduleInterval: 30,
      },
      {
        name: "Fleet Maintenance Predictor",
        industry: "Transportation",
        language: "Russian",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 1024, topP: 0.92 },
        scoringDimensions: ["classification", "standards", "gap_analysis", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      // Media & Entertainment
      {
        name: "Content Moderation System",
        industry: "Media",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.05, maxTokens: 512, topP: 0.99 },
        scoringDimensions: ["classification", "standards", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 15,
      },
      {
        name: "Personalized News Curator",
        industry: "Media",
        language: "Polish",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.4, maxTokens: 1024, topP: 0.86 },
        scoringDimensions: ["classification", "scope", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 30,
      },
      // Hospitality & Travel
      {
        name: "Travel Itinerary Planner",
        industry: "Hospitality",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.5, maxTokens: 3072, topP: 0.85 },
        scoringDimensions: ["classification", "scope", "gap_analysis", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      {
        name: "Hotel Revenue Optimizer",
        industry: "Hospitality",
        language: "Thai",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 1536, topP: 0.92 },
        scoringDimensions: ["classification", "parameters", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 120,
      },
      // Human Resources
      {
        name: "Resume Screening Assistant",
        industry: "Human Resources",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 2048, topP: 0.92 },
        scoringDimensions: ["classification", "standards", "scope", "gap_analysis", "confidence"],
        isActive: true,
        scheduleInterval: 60,
      },
      {
        name: "Employee Onboarding Guide",
        industry: "Human Resources",
        language: "Vietnamese",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.35, maxTokens: 2048, topP: 0.88 },
        scoringDimensions: ["classification", "scope", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 180,
      },
      // Cybersecurity
      {
        name: "Threat Intelligence Analyzer",
        industry: "Cybersecurity",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.05, maxTokens: 4096, topP: 0.99 },
        scoringDimensions: ["classification", "standards", "parameters", "scope", "gap_analysis", "confidence", "cross_step", "latency"],
        isActive: true,
        scheduleInterval: 15,
      },
      {
        name: "Vulnerability Assessment Tool",
        industry: "Cybersecurity",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 2048, topP: 0.97 },
        scoringDimensions: ["classification", "standards", "gap_analysis", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 30,
      },
      // Telecommunications
      {
        name: "Network Anomaly Detector",
        industry: "Telecommunications",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.1, maxTokens: 1024, topP: 0.97 },
        scoringDimensions: ["classification", "standards", "parameters", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 15,
      },
      {
        name: "Customer Churn Predictor",
        industry: "Telecommunications",
        language: "Greek",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 1536, topP: 0.91 },
        scoringDimensions: ["classification", "scope", "gap_analysis", "confidence"],
        isActive: true,
        scheduleInterval: 90,
      },
      // Environmental Science
      {
        name: "Climate Impact Assessor",
        industry: "Environmental",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 3072, topP: 0.92 },
        scoringDimensions: ["classification", "standards", "scope", "gap_analysis", "confidence", "cross_step"],
        isActive: true,
        scheduleInterval: 120,
      },
      {
        name: "Carbon Footprint Calculator",
        industry: "Environmental",
        language: "Norwegian",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.15, maxTokens: 1024, topP: 0.94 },
        scoringDimensions: ["classification", "parameters", "confidence", "latency"],
        isActive: false,
        scheduleInterval: 240,
      },
      // Nonprofit & NGO
      {
        name: "Grant Writing Assistant",
        industry: "Nonprofit",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.45, maxTokens: 4096, topP: 0.87 },
        scoringDimensions: ["classification", "standards", "scope", "gap_analysis", "confidence"],
        isActive: true,
        scheduleInterval: 240,
      },
      {
        name: "Impact Measurement Tool",
        industry: "Nonprofit",
        language: "Swahili",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.3, maxTokens: 2048, topP: 0.9 },
        scoringDimensions: ["classification", "scope", "gap_analysis", "confidence"],
        isActive: true,
        scheduleInterval: 180,
      },
      // Sports & Fitness
      {
        name: "Athletic Performance Analyzer",
        industry: "Sports",
        language: "English",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.3, maxTokens: 2048, topP: 0.9 },
        scoringDimensions: ["classification", "parameters", "scope", "confidence", "latency"],
        isActive: true,
        scheduleInterval: 60,
      },
      {
        name: "Injury Prevention Advisor",
        industry: "Sports",
        language: "Finnish",
        ragEndpoint: "/api/onboarding/unified",
        parameters: { temperature: 0.2, maxTokens: 1536, topP: 0.93 },
        scoringDimensions: ["classification", "standards", "gap_analysis", "confidence"],
        isActive: true,
        scheduleInterval: 120,
      },
    ];

    configs.forEach((config) => {
      const id = this.nextId.configs++;
      const now = new Date();
      this.testConfigs.set(id, {
        ...config,
        id,
        createdAt: now,
        updatedAt: now,
        lastRunAt: null,
      });
    });

    // Seed test runs for the first 10 configs
    const statuses = ["completed", "completed", "completed", "failed", "running"] as const;
    const now = new Date();

    for (let configId = 1; configId <= 10; configId++) {
      const numRuns = Math.floor(Math.random() * 8) + 3;
      for (let i = 0; i < numRuns; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const runDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);

        const scores = status === "completed" ? {
          classification: Math.random() * 30 + 65,
          standards: Math.random() * 25 + 68,
          parameters: Math.random() * 20 + 72,
          scope: Math.random() * 28 + 64,
          gap_analysis: Math.random() * 22 + 70,
          confidence: Math.random() * 18 + 74,
          cross_step: Math.random() * 24 + 69,
          latency: Math.random() * 15 + 78,
        } : null;

        const overallScore = scores
          ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
          : null;

        const runId = this.nextId.runs++;
        this.testRuns.set(runId, {
          id: runId,
          configId,
          status,
          startedAt: runDate,
          completedAt: status === "completed" ? new Date(runDate.getTime() + Math.random() * 5000 + 1000) : null,
          scores,
          overallScore,
          rawResponse: null,
          errorMessage: status === "failed" ? "API timeout after 30s" : null,
          latencyMs: status === "completed" ? Math.floor(Math.random() * 3000 + 500) : null,
          tokensUsed: status === "completed" ? Math.floor(Math.random() * 2000 + 200) : null,
        });
      }
    }

    // Seed recommendations
    const recTemplates = [
      {
        configId: 1,
        type: "performance",
        priority: "high",
        title: "Reduce temperature for more deterministic outputs",
        description: "Analysis shows high variance in classification scores. Lowering temperature from 0.2 to 0.1 could improve consistency by ~15%.",
        suggestedAction: { parameter: "temperature", currentValue: 0.2, suggestedValue: 0.1 },
        estimatedImprovement: 15.0,
        status: "pending",
      },
      {
        configId: 2,
        type: "quality",
        priority: "medium",
        title: "Increase context window for better summarization",
        description: "Gap analysis scores indicate missing context. Increasing maxTokens to 4096 would allow more comprehensive document processing.",
        suggestedAction: { parameter: "maxTokens", currentValue: 2048, suggestedValue: 4096 },
        estimatedImprovement: 22.0,
        status: "pending",
      },
      {
        configId: 3,
        type: "latency",
        priority: "low",
        title: "Optimize token usage with structured prompting",
        description: "Average latency is 2.3s. Implementing structured output formatting could reduce response size by 30% and improve latency.",
        suggestedAction: { technique: "structured_prompting", expectedLatencyReduction: "30%" },
        estimatedImprovement: 30.0,
        status: "applied",
      },
      {
        configId: 5,
        type: "performance",
        priority: "high",
        title: "Enable cross-step reasoning for portfolio analysis",
        description: "Cross-step dimension scores are 12% below average. Adding chain-of-thought prompting would improve multi-step financial reasoning.",
        suggestedAction: { technique: "chain_of_thought", addDimension: "cross_step" },
        estimatedImprovement: 18.5,
        status: "pending",
      },
      {
        configId: 7,
        type: "quality",
        priority: "medium",
        title: "Add standards dimension for code quality benchmarking",
        description: "Code review assistant lacks standards scoring. Adding this dimension would enable comparison against industry coding standards.",
        suggestedAction: { addDimension: "standards" },
        estimatedImprovement: 12.0,
        status: "dismissed",
      },
    ];

    recTemplates.forEach((rec) => {
      const id = this.nextId.recs++;
      this.recommendations.set(id, {
        ...rec,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Seed benchmarks
    const benchmarkData = [
      { configId: 1, dimension: "classification", score: 87.3, percentile: 78, sampleSize: 150 },
      { configId: 1, dimension: "standards", score: 82.1, percentile: 65, sampleSize: 150 },
      { configId: 1, dimension: "confidence", score: 91.2, percentile: 88, sampleSize: 150 },
      { configId: 1, dimension: "latency", score: 78.9, percentile: 55, sampleSize: 150 },
      { configId: 2, dimension: "classification", score: 85.7, percentile: 72, sampleSize: 120 },
      { configId: 2, dimension: "scope", score: 88.4, percentile: 81, sampleSize: 120 },
      { configId: 3, dimension: "classification", score: 93.1, percentile: 94, sampleSize: 200 },
      { configId: 3, dimension: "standards", score: 95.8, percentile: 97, sampleSize: 200 },
      { configId: 3, dimension: "gap_analysis", score: 89.6, percentile: 84, sampleSize: 200 },
      { configId: 5, dimension: "classification", score: 84.2, percentile: 68, sampleSize: 180 },
      { configId: 5, dimension: "confidence", score: 90.5, percentile: 87, sampleSize: 180 },
    ];

    benchmarkData.forEach((bench) => {
      const id = this.nextId.benchmarks++;
      this.benchmarks.set(id, {
        id,
        configId: bench.configId,
        dimension: bench.dimension,
        score: bench.score,
        percentile: bench.percentile,
        sampleSize: bench.sampleSize,
        recordedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    });
  }

  // Test Config methods
  async getTestConfigs(): Promise<TestConfig[]> {
    return Array.from(this.testConfigs.values());
  }

  async getTestConfig(id: number): Promise<TestConfig | undefined> {
    return this.testConfigs.get(id);
  }

  async createTestConfig(config: InsertTestConfig): Promise<TestConfig> {
    const id = this.nextId.configs++;
    const now = new Date();
    const newConfig: TestConfig = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
    };
    this.testConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateTestConfig(id: number, config: Partial<InsertTestConfig>): Promise<TestConfig | undefined> {
    const existing = this.testConfigs.get(id);
    if (!existing) return undefined;
    const updated: TestConfig = { ...existing, ...config, updatedAt: new Date() };
    this.testConfigs.set(id, updated);
    return updated;
  }

  async deleteTestConfig(id: number): Promise<boolean> {
    return this.testConfigs.delete(id);
  }

  // Test Run methods
  async getTestRuns(): Promise<TestRun[]> {
    return Array.from(this.testRuns.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
    );
  }

  async getTestRun(id: number): Promise<TestRun | undefined> {
    return this.testRuns.get(id);
  }

  async getTestRunsByConfig(configId: number): Promise<TestRun[]> {
    return Array.from(this.testRuns.values())
      .filter((run) => run.configId === configId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async createTestRun(run: InsertTestRun): Promise<TestRun> {
    const id = this.nextId.runs++;
    const newRun: TestRun = {
      ...run,
      id,
      startedAt: run.startedAt ?? new Date(),
      completedAt: run.completedAt ?? null,
      scores: run.scores ?? null,
      overallScore: run.overallScore ?? null,
      rawResponse: run.rawResponse ?? null,
      errorMessage: run.errorMessage ?? null,
      latencyMs: run.latencyMs ?? null,
      tokensUsed: run.tokensUsed ?? null,
    };
    this.testRuns.set(id, newRun);
    return newRun;
  }

  async updateTestRun(id: number, run: Partial<InsertTestRun>): Promise<TestRun | undefined> {
    const existing = this.testRuns.get(id);
    if (!existing) return undefined;
    const updated: TestRun = { ...existing, ...run };
    this.testRuns.set(id, updated);
    return updated;
  }

  // Recommendation methods
  async getRecommendations(): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values());
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    return this.recommendations.get(id);
  }

  async createRecommendation(rec: InsertRecommendation): Promise<Recommendation> {
    const id = this.nextId.recs++;
    const newRec: Recommendation = {
      ...rec,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedImprovement: rec.estimatedImprovement ?? null,
    };
    this.recommendations.set(id, newRec);
    return newRec;
  }

  async updateRecommendation(id: number, rec: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    const existing = this.recommendations.get(id);
    if (!existing) return undefined;
    const updated: Recommendation = { ...existing, ...rec, updatedAt: new Date() };
    this.recommendations.set(id, updated);
    return updated;
  }

  // Benchmark methods
  async getBenchmarks(): Promise<Benchmark[]> {
    return Array.from(this.benchmarks.values());
  }

  async getBenchmark(id: number): Promise<Benchmark | undefined> {
    return this.benchmarks.get(id);
  }

  async createBenchmark(benchmark: InsertBenchmark): Promise<Benchmark> {
    const id = this.nextId.benchmarks++;
    const newBenchmark: Benchmark = {
      ...benchmark,
      id,
      recordedAt: benchmark.recordedAt ?? new Date(),
    };
    this.benchmarks.set(id, newBenchmark);
    return newBenchmark;
  }
}

export const storage = new MemStorage();
