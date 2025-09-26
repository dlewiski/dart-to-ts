export interface PackageUsage {
  packageName: string;
  imports: string[];
  actuallyUsed: {
    functions: string[];
    classes: string[];
    constants: string[];
    types: string[];
  };
  linesOfCode: number;
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex';
}

export interface PackageDecision {
  packageName: string;
  action: 'inline' | 'eliminate' | 'replace' | 'preserve';
  reason: string;
  replacement?: string;
  inlinedCode?: string;
  extractedUtilities?: ExtractedUtility[];
}

export interface ExtractedUtility {
  name: string;
  type: 'function' | 'class' | 'constant' | 'type';
  code: string;
  dependencies: string[];
}

export interface ConversionResult {
  success: boolean;
  typescript: string;
  imports: string[];
  metrics: ConversionMetrics;
  decisions: PackageDecision[];
  errors?: string[];
}

export interface ConversionMetrics {
  file: string;
  timeMs: number;
  cost: number;
  packagesEliminated: number;
  packagesInlined: number;
  packagesReplaced: number;
  locOriginal: number;
  locGenerated: number;
  techDebtScore: number;
  techDebtReduction: number;
}

export interface TechDebtPattern {
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  fix: string;
  occurrences: number;
}

export interface AnalysisResult {
  projectPath: string;
  totalFiles: number;
  packages: PackageUsage[];
  techDebt: TechDebtPattern[];
  recommendations: string[];
  estimatedSavings: {
    dependencies: number;
    linesOfCode: number;
    complexity: number;
  };
}

export interface ConversionConfig {
  inputPath: string;
  outputPath: string;
  extractPath: string;
  decisionsPath: string;
  aggressive: boolean;
  preserveComments: boolean;
  modernize: boolean;
  useLLM: boolean;
  llmModel?: string;
  maxConcurrency: number;
}

export interface DartFile {
  path: string;
  content: string;
  imports: string[];
  exports: string[];
  parts: string[];
  libraryName?: string;
}

export interface TypeScriptFile {
  path: string;
  content: string;
  imports: ImportDeclaration[];
  exports: ExportDeclaration[];
}

export interface ImportDeclaration {
  source: string;
  specifiers: Array<{
    name: string;
    alias?: string;
    isDefault?: boolean;
    isNamespace?: boolean;
  }>;
}

export interface ExportDeclaration {
  source?: string;
  specifiers: Array<{
    name: string;
    alias?: string;
    isDefault?: boolean;
  }>;
}

export interface LLMPrompt {
  system: string;
  user: string;
  context?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  reasoning?: string;
  confidence: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}