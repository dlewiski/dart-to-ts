import { join } from '../../deps.ts';
import { scanDartProject } from '../scanner.ts';
import { extractCodeForAnalysis } from '../extractor.ts';
import { analyzeFunctionality, comprehensiveAnalysis } from '../analyzer.ts';
import {
  ensureDirectoryExists,
  safeWriteJsonFile,
} from '../utils/file-operations.ts';
import {
  type AnalysisOptions,
  type CLIOptions,
  type CodeChunk,
  type FileCategories,
  type FunctionalAnalysis,
} from '../types/index.ts';

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

interface OutputDirectories {
  base: string;
  raw: string;
  functional: string;
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
      '🔍 Starting Dart app analysis with Claude Code integration...\n',
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
   * Save analysis results to files with structured output
   */
  async saveResults(
    result: AnalysisResult,
    outputDir?: string,
  ): Promise<AnalysisReport> {
    console.log('\n📊 Generating analysis reports...\n');

    const outputPaths = this.createOutputDirectories(outputDir);
    const filePaths = await this.saveAllResultFiles(result, outputPaths);

    return filePaths;
  }

  private scanProject(): FileCategories {
    return scanDartProject(this.projectPath);
  }

  private extractCode(categories: FileCategories): Promise<CodeChunk[]> {
    return extractCodeForAnalysis(this.projectPath, categories);
  }

  private async performAnalysis(
    chunks: CodeChunk[],
    options: CLIOptions,
  ): Promise<FunctionalAnalysis> {
    const analysisOptions: AnalysisOptions = {
      model: options.model || 'sonnet',
      verbose: options.verbose || false,
      useCache: !options.noCache,
    };
    if (options.timeout !== undefined) {
      analysisOptions.timeout = options.timeout;
    }

    // Use parallel processing if enabled
    if (options.parallel) {
      const { ParallelAnalyzer } = await import(
        '../core/parallel/ParallelAnalyzer.ts'
      );
      const parallelAnalyzer = new ParallelAnalyzer({
        ...analysisOptions,
        maxWorkers: options.workers || 4,
        useWorkers: false, // Use simulated parallel for now
      });

      console.log(
        `🚀 Using parallel processing with ${options.workers || 4} workers\n`,
      );

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

  /**
   * Create and ensure output directory structure exists
   */
  private createOutputDirectories(outputDir?: string): OutputDirectories {
    const baseDir = outputDir || join(Deno.cwd(), 'analysis');
    const directories = {
      base: baseDir,
      raw: join(baseDir, 'raw'),
      functional: join(baseDir, 'functional'),
    };

    // Ensure all directories exist
    Object.values(directories).forEach(ensureDirectoryExists);

    return directories;
  }

  /**
   * Save all result files and return their paths
   */
  private async saveAllResultFiles(
    result: AnalysisResult,
    directories: OutputDirectories,
  ): Promise<AnalysisReport> {
    const categoriesPath = join(directories.raw, 'file-categories.json');
    const analysisPath = join(directories.functional, 'analysis.json');
    const reportPath = join(directories.base, 'report.md');

    // Save file categories
    await this.saveWithErrorHandling(
      () => safeWriteJsonFile(categoriesPath, result.categories),
      `File categories saved to: ${categoriesPath}`,
      'Failed to save file categories',
    );

    // Save functional analysis
    await this.saveWithErrorHandling(
      () => safeWriteJsonFile(analysisPath, result.analysis),
      `Functional analysis saved to: ${analysisPath}`,
      'Failed to save functional analysis',
    );

    // Generate and save human-readable report
    const report = this.generateReadableReport(result.analysis);
    await this.saveWithErrorHandling(
      async () => {
        await Deno.writeTextFile(reportPath, report);
      },
      `Readable report saved to: ${reportPath}\n`,
      'Failed to save report',
    );

    return { categoriesPath, analysisPath, reportPath };
  }

  /**
   * Save operation with proper error handling and logging
   */
  private async saveWithErrorHandling(
    saveOperation: () => Promise<void> | void,
    successMessage: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      await saveOperation();
      console.log(`✅ ${successMessage}`);
    } catch (error) {
      const errorDetails = error instanceof Error
        ? error.message
        : String(error);
      console.error(`❌ ${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${errorDetails}`);
    }
  }

  /**
   * Generate comprehensive human-readable analysis report
   */
  private generateReadableReport(analysis: FunctionalAnalysis): string {
    // Generate markdown report from analysis
    const report: string[] = [];

    report.push('# Dart Application Analysis Report\n');
    report.push(`## Application Purpose\n${analysis.appPurpose}\n`);

    if (analysis.coreFeatures.length > 0) {
      report.push('## Core Features\n');
      analysis.coreFeatures.forEach((feature) => {
        report.push(`- ${feature}`);
      });
      report.push('');
    }

    if (analysis.userWorkflows.length > 0) {
      report.push('## User Workflows\n');
      analysis.userWorkflows.forEach((workflow) => {
        report.push(`### ${workflow.name}`);
        workflow.steps.forEach((step) => {
          report.push(`1. ${step}`);
        });
        report.push('');
      });
    }

    report.push('## State Management\n');
    report.push(`- Pattern: ${analysis.stateManagement.pattern}`);
    report.push(
      `- Key Actions: ${
        analysis.stateManagement.keyActions.join(', ') || 'None identified'
      }`,
    );
    report.push('');

    report.push('## Data Flow\n');
    report.push(
      `- Sources: ${analysis.dataFlow.sources.join(', ') || 'None identified'}`,
    );
    report.push(
      `- Transformations: ${
        analysis.dataFlow.transformations.join(', ') || 'None identified'
      }`,
    );
    report.push('');

    report.push('## Dependencies\n');
    report.push(
      `- Dart packages: ${
        analysis.dependencies.dart.join(', ') || 'None identified'
      }`,
    );
    report.push('\n---\n');
    report.push(
      '*Note: TypeScript migration strategies will be determined in Phase 2*',
    );

    return report.join('\n');
  }
}
