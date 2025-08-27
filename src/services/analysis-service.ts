import * as path from 'path';
import { scanDartProject } from '../scanner';
import { extractCodeForAnalysis } from '../extractor';
import { analyzeFunctionality, comprehensiveAnalysis } from '../analyzer';
import {
  safeWriteJsonFile,
  ensureDirectoryExists,
} from '../utils/file-operations';
import {
  type CLIOptions,
  type AnalysisOptions,
  type FunctionalAnalysis,
  type Workflow,
  type FileCategories,
  type CodeChunk,
} from '../types';

export interface AnalysisResult {
  analysis: FunctionalAnalysis;
  categories: FileCategories;
  chunks: CodeChunk[];
}

export interface AnalysisReport {
  categoriesPath: string;
  analysisPath: string;
  reportPath: string;
}

/**
 * Service class for handling Dart application analysis
 * Separates business logic from CLI concerns
 */
export class AnalysisService {
  constructor(private readonly projectPath: string) {}

  /**
   * Execute full analysis workflow
   */
  async analyze(options: CLIOptions = {}): Promise<AnalysisResult> {
    console.log(
      '🔍 Starting Dart app analysis with Claude Code integration...\n'
    );

    // Step 1: Scan and categorize files
    console.log('📁 Scanning project structure...');
    const categories = this.scanProject();
    this.logScanResults(categories);

    // Step 2: Extract relevant code chunks
    console.log('📝 Extracting code for analysis...');
    const chunks = await this.extractCode(categories);
    console.log(`Prepared ${chunks.length} code chunks for analysis\n`);

    // Step 3: Analyze functionality
    const analysis = await this.performAnalysis(chunks, options);

    return { analysis, categories, chunks };
  }

  /**
   * Save analysis results to files
   */
  async saveResults(
    result: AnalysisResult,
    outputDir?: string
  ): Promise<AnalysisReport> {
    console.log('\n📊 Generating analysis reports...\n');

    const baseDir = outputDir || path.join(__dirname, '..', '..', 'analysis');
    const analysisDir = path.resolve(baseDir);
    const rawDir = path.join(analysisDir, 'raw');
    const functionalDir = path.join(analysisDir, 'functional');

    // Ensure directories exist
    [analysisDir, rawDir, functionalDir].forEach(ensureDirectoryExists);

    // Save file categories
    const categoriesPath = path.join(rawDir, 'file-categories.json');
    this.saveWithErrorHandling(
      () => safeWriteJsonFile(categoriesPath, result.categories),
      `File categories saved to: ${categoriesPath}`,
      'Failed to save file categories'
    );

    // Save functional analysis
    const analysisPath = path.join(functionalDir, 'analysis.json');
    this.saveWithErrorHandling(
      () => safeWriteJsonFile(analysisPath, result.analysis),
      `Functional analysis saved to: ${analysisPath}`,
      'Failed to save functional analysis'
    );

    // Generate and save human-readable report
    const report = this.generateReadableReport(result.analysis);
    const reportPath = path.join(analysisDir, 'report.md');
    this.saveWithErrorHandling(
      () => safeWriteJsonFile(reportPath, report),
      `Readable report saved to: ${reportPath}\n`,
      'Failed to save report'
    );

    return { categoriesPath, analysisPath, reportPath };
  }

  private scanProject(): FileCategories {
    return scanDartProject(this.projectPath);
  }

  private async extractCode(categories: FileCategories): Promise<CodeChunk[]> {
    return extractCodeForAnalysis(this.projectPath, categories);
  }

  private async performAnalysis(
    chunks: CodeChunk[],
    options: CLIOptions
  ): Promise<FunctionalAnalysis> {
    const analysisOptions: AnalysisOptions = {
      model: options.model || 'sonnet',
      verbose: options.verbose || false,
      useCache: !options.noCache,
      timeout: options.timeout,
    };

    // Use parallel processing if enabled
    if (options.parallel) {
      const { ParallelAnalyzer } = await import('../core/parallel/ParallelAnalyzer');
      const parallelAnalyzer = new ParallelAnalyzer({
        ...analysisOptions,
        maxWorkers: options.workers || 4,
        useWorkers: false, // Use simulated parallel for now
      });
      
      console.log(`🚀 Using parallel processing with ${options.workers || 4} workers\n`);
      
      const result = await parallelAnalyzer.analyzeFunctionality(chunks);
      await parallelAnalyzer.shutdown();
      
      return result;
    }

    if (options.comprehensive) {
      return comprehensiveAnalysis(chunks, analysisOptions);
    } else {
      return analyzeFunctionality(chunks, analysisOptions);
    }
  }

  private logScanResults(categories: FileCategories): void {
    console.log(`Found:
  - ${categories.components.length} component files
  - ${categories.state.length} state management files
  - ${categories.services.length} service files
  - ${categories.utils.length} utility files
  - Entry point: ${categories.entry || 'not found'}\n`);
  }

  private saveWithErrorHandling(
    saveOperation: () => void,
    successMessage: string,
    errorMessage: string
  ): void {
    try {
      saveOperation();
      console.log(`✅ ${successMessage}`);
    } catch (error) {
      console.error(`❌ ${errorMessage}:`, error);
      throw new Error(
        `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private generateReadableReport(analysis: FunctionalAnalysis): string {
    return `# Dart Application Functional Analysis Report

## Application Purpose
${analysis.appPurpose}

## Core Features
${analysis.coreFeatures.map((f: string) => `- ${f}`).join('\n')}

## User Workflows
${analysis.userWorkflows
  .map(
    (w: Workflow) => `
### ${w.name}
${w.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`
  )
  .join('\n')}

## Data Architecture
### Sources
${analysis.dataFlow.sources.map((s: string) => `- ${s}`).join('\n')}

### Transformations
${analysis.dataFlow.transformations.map((t: string) => `- ${t}`).join('\n')}

### Destinations
${analysis.dataFlow.destinations.map((d: string) => `- ${d}`).join('\n')}

## State Management
- **Pattern**: ${analysis.stateManagement.pattern}
- **Key Actions**: ${analysis.stateManagement.keyActions.join(', ')}
- **Selectors**: ${analysis.stateManagement.selectors.join(', ')}

## Business Logic
### Rules
${analysis.businessLogic.rules.map((r: string) => `- ${r}`).join('\n')}

### Validations
${analysis.businessLogic.validations.map((v: string) => `- ${v}`).join('\n')}

## Dependency Mapping
${Object.entries(analysis.dependencies.tsEquivalents)
  .map(([dart, ts]) => `- **${dart}** → ${ts}`)
  .join('\n')}

## Conversion Strategy
Based on this analysis, the TypeScript conversion should:
1. Implement Redux Toolkit for state management
2. Use React functional components with hooks
3. Create TypeScript interfaces for all data models
4. Implement service layer with Axios
5. Maintain existing business logic and validations
`;
  }
}
