/**
 * Type definitions for phase transitions and data contracts
 *
 * These types define the input/output contracts between phases,
 * ensuring clean separation of concerns and testable interfaces.
 */

import type { CodeChunk, FileCategories, FunctionalAnalysis } from './index.ts';

// =============================================================================
// Phase 1: Analysis Types (Current Implementation)
// =============================================================================

/**
 * Metadata about the analysis process and quality
 */
export interface AnalysisMetadata {
  /** Analysis timestamp */
  timestamp: string;
  /** Analysis duration in seconds */
  duration: number;
  /** Claude model used for analysis */
  model: 'sonnet' | 'opus';
  /** Number of chunks processed */
  chunksProcessed: number;
  /** Analysis success rate */
  successRate: number;
  /** Total tokens used */
  tokensUsed?: number;
  /** Analysis cost in USD */
  cost?: number;
  /** Cache hit rate */
  cacheHitRate?: number;
}

/**
 * Complete output from Phase 1 analysis
 */
export interface Phase1Output {
  /** Functional analysis of the Dart codebase */
  analysis: FunctionalAnalysis;
  /** File categorization and structure */
  categories: FileCategories;
  /** Processed code chunks */
  chunks: CodeChunk[];
  /** Analysis process metadata */
  metadata: AnalysisMetadata;
}

// =============================================================================
// Phase 2: Migration Strategy Types (Future Implementation)
// =============================================================================

/**
 * Risk assessment for migration
 */
export interface RiskAssessment {
  /** Risk category */
  category: 'low' | 'medium' | 'high' | 'critical';
  /** Risk description */
  description: string;
  /** Potential impact */
  impact: string;
  /** Mitigation strategy */
  mitigation: string;
  /** Estimated effort to address */
  effort: 'low' | 'medium' | 'high';
}

/**
 * Dependency migration mapping
 */
export interface DependencyMapping {
  /** Dart package to TypeScript package mapping */
  packageMappings: Record<string, string>;
  /** Packages that need custom implementation */
  customImplementations: string[];
  /** Packages with no direct equivalent */
  manualMigration: string[];
  /** Dev dependency recommendations */
  devDependencies: string[];
}

/**
 * Architectural migration plan
 */
export interface ArchitecturalPlan {
  /** Overall architecture pattern (e.g., 'React + Redux', 'React + Zustand') */
  pattern: string;
  /** State management approach */
  stateManagement: {
    library: string;
    pattern: string;
    rationale: string;
  };
  /** Component architecture */
  components: {
    approach: string; // e.g., 'functional components with hooks'
    styleSystem: string; // e.g., 'CSS modules', 'styled-components'
    testing: string;
  };
  /** Build and development setup */
  tooling: {
    bundler: string; // e.g., 'Vite', 'Webpack'
    packageManager: string; // e.g., 'pnpm', 'npm'
    typeChecker: string;
    linter: string;
  };
}

/**
 * Individual migration phase/step
 */
export interface MigrationPhase {
  /** Phase name */
  name: string;
  /** Phase description */
  description: string;
  /** Prerequisites for this phase */
  prerequisites: string[];
  /** Deliverables from this phase */
  deliverables: string[];
  /** Estimated effort in hours */
  estimatedHours: number;
  /** Risk level for this phase */
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Overall migration strategy
 */
export interface MigrationStrategy {
  /** Strategy name */
  name: string;
  /** Strategy description and rationale */
  description: string;
  /** Migration approach (e.g., 'incremental', 'big-bang', 'strangler') */
  approach: 'incremental' | 'big-bang' | 'strangler' | 'hybrid';
  /** Rationale for this strategy */
  rationale: string;
  /** Key benefits */
  benefits: string[];
  /** Key challenges */
  challenges: string[];
}

/**
 * Complete migration plan from Phase 2
 */
export interface MigrationPlan {
  /** Overall migration strategy */
  strategy: MigrationStrategy;
  /** Dependency migration plan */
  dependencies: DependencyMapping;
  /** Architectural decisions and plan */
  architecture: ArchitecturalPlan;
  /** Step-by-step migration phases */
  phases: MigrationPhase[];
  /** Risk assessment and mitigation */
  risks: RiskAssessment[];
  /** General recommendations */
  recommendations: string[];
  /** Estimated total effort */
  totalEstimatedHours: number;
  /** Success criteria */
  successCriteria: string[];
}

/**
 * Input to Phase 2 (same as Phase 1 output)
 */
export interface Phase2Input extends Phase1Output {}

/**
 * Output from Phase 2
 */
export interface Phase2Output {
  /** Migration plan */
  plan: MigrationPlan;
  /** Analysis metadata for Phase 2 */
  metadata: {
    timestamp: string;
    duration: number;
    model: string;
    tokensUsed?: number;
    cost?: number;
  };
}

// =============================================================================
// Phase 3: Code Generation Types (Future Implementation)
// =============================================================================

/**
 * Generated file information
 */
export interface GeneratedFile {
  /** File path relative to project root */
  path: string;
  /** File content */
  content: string;
  /** File type */
  type: 'typescript' | 'json' | 'markdown' | 'config';
  /** Whether file should be executable */
  executable?: boolean;
}

/**
 * Generated project structure
 */
export interface GeneratedProject {
  /** Generated files */
  files: GeneratedFile[];
  /** Project configuration */
  config: {
    packageJson: Record<string, unknown>;
    tsConfig: Record<string, unknown>;
    viteConfig?: string;
    eslintConfig?: Record<string, unknown>;
  };
  /** Setup instructions */
  setupInstructions: string[];
  /** Post-generation tasks */
  postGenerationTasks: string[];
}

/**
 * Input to Phase 3
 */
export interface Phase3Input extends Phase2Output {
  /** Original Dart source code for reference */
  originalCode: CodeChunk[];
}

/**
 * Output from Phase 3
 */
export interface Phase3Output {
  /** Generated TypeScript project */
  project: GeneratedProject;
  /** Generation metadata */
  metadata: {
    timestamp: string;
    duration: number;
    filesGenerated: number;
    linesOfCode: number;
  };
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Generic phase interface for future phases
 */
export interface Phase<TInput, TOutput> {
  /** Phase name */
  name: string;
  /** Phase description */
  description: string;
  /** Execute the phase */
  execute(input: TInput): Promise<TOutput>;
  /** Validate input */
  validateInput(input: TInput): boolean;
  /** Validate output */
  validateOutput(output: TOutput): boolean;
}
