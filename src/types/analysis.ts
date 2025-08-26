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
  [key: string]: string | StateShape | StateShape[];
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

export interface ChunkAnalysisResult {
  appPurpose?: string;
  initialization?: string[];
  services?: string[];
  routing?: string;
  dependencies?: string[];
  middleware?: string[];
  stateShape?: StateShape;
  keyActions?: string[];
  selectors?: string[];
  userFeatures?: string[];
  interactions?: string[];
  dataSource?: string[];
  operations?: string[];
  dataFormat?: {
    request: string;
    response: string;
  } | null;
  errorHandling?: string[];
  caching?: string;
  coreDependencies?: string[];
  tsEquivalents?: Record<string, string>;
  missingEquivalents?: string[];
  customImplementations?: string[];
  rules?: string[];
  validations?: string[];
  calculations?: string[];
  conditionalLogic?: string[];
  dataConstraints?: string[];
}

export interface ComprehensiveAnalysisResult {
  summary?: {
    appPurpose: string;
    targetUsers: string;
    coreValue: string;
  };
  features?: Feature[];
  architecture?: {
    pattern: string;
    layers: string[];
    keyComponents: string[];
  };
  dataFlow?: {
    sources: string[];
    processing: string[];
    storage: string;
  };
  dependencies?: {
    critical: string[];
    replaceable: string[];
  };
  migrationConsiderations?: string[];
}

export interface AnalysisOptions {
  useCache?: boolean;
  verbose?: boolean;
  model?: 'sonnet' | 'opus';
}