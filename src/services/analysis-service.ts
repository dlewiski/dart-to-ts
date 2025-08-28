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
  type BusinessLogic,
  type CLIOptions,
  type CodeChunk,
  type DataFlow,
  type Dependencies,
  type FileCategories,
  type FunctionalAnalysis,
  type StateManagement,
  type Workflow,
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
        '../core/parallel/ParallelAnalyzer'
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
      () => safeWriteJsonFile(reportPath, report),
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
    const sections = [
      this.generateHeaderSection(),
      this.generatePurposeSection(analysis.appPurpose),
      this.generateFeaturesSection(analysis.coreFeatures),
      this.generateWorkflowsSection(analysis.userWorkflows),
      this.generateDataArchitectureSection(analysis.dataFlow),
      this.generateStateManagementSection(analysis.stateManagement),
      this.generateBusinessLogicSection(analysis.businessLogic),
      this.generateDependencyMappingSection(analysis.dependencies),
      this.generateConversionStrategySection(),
    ];

    return sections.join('\n\n');
  }

  private generateHeaderSection(): string {
    return '# Dart Application Functional Analysis Report';
  }

  private generatePurposeSection(purpose: string): string {
    return `## Application Purpose\n${purpose}`;
  }

  private generateFeaturesSection(features: string[]): string {
    const featureList = features.map((feature) => `- ${feature}`).join('\n');
    return `## Core Features\n${featureList}`;
  }

  private generateWorkflowsSection(workflows: Workflow[]): string {
    const workflowSections = workflows
      .map((workflow) => {
        const stepList = workflow.steps
          .map((step, index) => `${index + 1}. ${step}`)
          .join('\n');
        return `### ${workflow.name}\n${stepList}`;
      })
      .join('\n');

    return `## User Workflows\n${workflowSections}`;
  }

  private generateDataArchitectureSection(dataFlow: DataFlow): string {
    const sources = dataFlow.sources.map((s: string) => `- ${s}`).join('\n');
    const transformations = dataFlow.transformations
      .map((t: string) => `- ${t}`)
      .join('\n');
    const destinations = dataFlow.destinations
      .map((d: string) => `- ${d}`)
      .join('\n');

    return `## Data Architecture\n### Sources\n${sources}\n\n### Transformations\n${transformations}\n\n### Destinations\n${destinations}`;
  }

  private generateStateManagementSection(
    stateManagement: StateManagement,
  ): string {
    return `## State Management\n- **Pattern**: ${stateManagement.pattern}\n- **Key Actions**: ${
      stateManagement.keyActions.join(
        ', ',
      )
    }\n- **Selectors**: ${stateManagement.selectors.join(', ')}`;
  }

  private generateBusinessLogicSection(businessLogic: BusinessLogic): string {
    const rules = businessLogic.rules.map((r: string) => `- ${r}`).join('\n');
    const validations = businessLogic.validations
      .map((v: string) => `- ${v}`)
      .join('\n');

    return `## Business Logic\n### Rules\n${rules}\n\n### Validations\n${validations}`;
  }

  private generateDependencyMappingSection(dependencies: Dependencies): string {
    const mappings = Object.entries(dependencies.tsEquivalents)
      .map(([dart, ts]) => `- **${dart}** → ${ts}`)
      .join('\n');

    return `## Dependency Mapping\n${mappings}`;
  }

  private generateConversionStrategySection(): string {
    const strategies = [
      '1. Implement Redux Toolkit for state management',
      '2. Use React functional components with hooks',
      '3. Create TypeScript interfaces for all data models',
      '4. Implement service layer with Axios',
      '5. Maintain existing business logic and validations',
    ].join('\n');

    return `## Conversion Strategy\nBased on this analysis, the TypeScript conversion should:\n${strategies}`;
  }
}
