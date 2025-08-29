// This file provides exports for programmatic usage
// The main CLI is in ../main.ts

import { CLIOptions } from './types/index.ts';
import { AnalysisService } from './services/analysis-service.ts';

/**
 * Analyze a Dart/Flutter application programmatically
 * 
 * @param projectPath Path to the Dart project directory
 * @param options Analysis options
 * @returns The functional analysis result
 */
export async function analyzeDartApp(projectPath: string, options: CLIOptions = {}) {
  const analysisService = new AnalysisService(projectPath);

  // Execute analysis workflow
  const result = await analysisService.analyze(options);

  // Save results to files
  await analysisService.saveResults(result);

  console.log('🎯 Analysis complete! Next steps:');
  console.log('1. Review the functional analysis');
  console.log('2. Validate understanding with test app');
  console.log('3. Begin TypeScript architecture planning');

  return result.analysis;
}

// Re-export types for external usage
export type { CLIOptions, FunctionalAnalysis } from './types/index.ts';
export { AnalysisService } from './services/analysis-service.ts';
export { ParallelAnalyzer } from './core/parallel/ParallelAnalyzer.ts';