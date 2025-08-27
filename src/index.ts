// Re-export the main analysis function for programmatic use
export { analyzeDartApp } from '../main.ts';
export type { CLIOptions, FunctionalAnalysis } from './types/index.ts';
export { AnalysisService } from './services/analysis-service.ts';

// This file provides exports for programmatic usage
// The main CLI is in ../main.ts
