/**
 * Type definitions for analysis-related structures
 */

export interface Feature {
  name: string;
  description: string;
  userSteps?: string[];
}

export interface Workflow {
  name: string;
  steps: string[];
}

export interface DataFlow {
  sources: string[];
  transformations: string[];
  destinations: string[];
}

export interface StateShape {
  [key: string]: unknown;
}

export interface StateManagement {
  pattern: string;
  stateShape: StateShape;
  keyActions: string[];
  selectors: string[];
}

export interface BusinessLogic {
  rules: string[];
  validations: string[];
  calculations: string[];
}

export interface Dependencies {
  dart: string[];
  tsEquivalents: Record<string, string>;
}

export interface FunctionalAnalysis {
  appPurpose: string;
  coreFeatures: string[];
  userWorkflows: Workflow[];
  dataFlow: DataFlow;
  stateManagement: StateManagement;
  businessLogic: BusinessLogic;
  dependencies: Dependencies;
}

export interface AnalysisResult {
  result: FunctionalAnalysis | string;
  raw?: string;
  error?: string;
}

export interface DataFormat {
  request?: string;
  response?: string;
  type?: 'json' | 'xml' | 'csv' | 'binary' | 'other';
}

export interface ChunkAnalysisResult {
  // Entry point analysis
  appPurpose?: string;
  initialization?: string[];

  // Service layer analysis
  services?: string[];
  routing?: string;
  dependencies?: string[];

  // State management analysis
  middleware?: string[];
  stateShape?: StateShape;
  keyActions?: string[];
  selectors?: string[];

  // Component analysis
  userFeatures?: string[];
  interactions?: string[];

  // Data flow analysis
  dataSource?: string[];
  operations?: string[];
  dataFormat?: DataFormat | null;
  errorHandling?: string[];
  caching?: string;

  // Dependency analysis
  coreDependencies?: string[];
  tsEquivalents?: Record<string, string>;
  missingEquivalents?: string[];
  customImplementations?: string[];

  // Business logic analysis
  rules?: string[];
  validations?: string[];
  calculations?: string[];
  conditionalLogic?: string[];
  dataConstraints?: string[];
}

export interface AppSummary {
  appPurpose: string;
  targetUsers: string;
  coreValue: string;
  complexity?: 'low' | 'medium' | 'high';
}

export interface ArchitectureInfo {
  pattern: string;
  layers: string[];
  keyComponents: string[];
  principles?: string[];
}

export interface DataFlowInfo {
  sources: string[];
  processing: string[];
  storage: string;
  caching?: boolean;
}

export interface DependencyInfo {
  critical: string[];
  replaceable: string[];
  optional?: string[];
}

export interface ComprehensiveAnalysisResult {
  summary?: AppSummary;
  features?: Feature[];
  architecture?: ArchitectureInfo;
  dataFlow?: DataFlowInfo;
  dependencies?: DependencyInfo;
  migrationConsiderations?: string[];
}

// ClaudeModel is exported from claude.ts

export interface AnalysisOptions {
  useCache?: boolean;
  verbose?: boolean;
  model?: 'sonnet' | 'opus';
  timeout?: number;
  /** Cache duration in minutes (default: 120) */
  cacheDuration?: number;
}
