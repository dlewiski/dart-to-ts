import { colors, Command, join } from './deps.ts';
import { AnalysisService } from './src/services/analysis-service.ts';
import { type CLIOptions, type FunctionalAnalysis } from './src/types/index.ts';
import { pathExistsAsync } from './src/utils/file-operations.ts';

/**
 * Main analysis function with improved error handling and logging
 */
async function analyzeDartApp(
  projectPath: string,
  options: CLIOptions = {},
): Promise<FunctionalAnalysis> {
  const analysisService = new AnalysisService(projectPath);

  try {
    // Execute analysis workflow with progress indication
    console.log(`\n🚀 Starting analysis of: ${projectPath}`);
    const analysisResult = await analysisService.analyze(options);

    // Save results to files with detailed reporting
    const savedPaths = await analysisService.saveResults(analysisResult);

    // Display completion message with next steps
    displayCompletionSummary(savedPaths);

    return analysisResult.analysis;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(colors.red(`\n❌ Analysis failed: ${errorMessage}`));
    throw error;
  }
}

/**
 * Display analysis completion summary and next steps
 */
function displayCompletionSummary(savedPaths: {
  categoriesPath: string;
  analysisPath: string;
  reportPath: string;
}): void {
  console.log(colors.green('\n🎯 Analysis complete! Next steps:'));
  console.log('1. Review the functional analysis');
  console.log('2. Validate understanding with test app');
  console.log('3. Begin TypeScript architecture planning');

  console.log(colors.cyan('\n📋 Generated files:'));
  console.log(`- Categories: ${savedPaths.categoriesPath}`);
  console.log(`- Analysis: ${savedPaths.analysisPath}`);
  console.log(`- Report: ${savedPaths.reportPath}`);
}

/**
 * Prepare and validate analysis configuration
 */
async function prepareAnalysisConfig(
  options: Record<string, unknown>,
  projectPath?: string,
): Promise<{ path: string; options: CLIOptions }> {
  const analysisPath = await validateAnalysisPath(projectPath);
  const cliOptions = createCLIOptions(options);

  return { path: analysisPath, options: cliOptions };
}

/**
 * Validate and determine analysis path
 */
async function validateAnalysisPath(projectPath?: string): Promise<string> {
  const analysisPath = projectPath ||
    join(Deno.cwd(), 'frontend_release_dashboard');

  if (!(await pathExistsAsync(analysisPath))) {
    throw new Error(`Project path "${analysisPath}" does not exist.`);
  }

  return analysisPath;
}

/**
 * Create CLI options from raw input
 */
function createCLIOptions(options: Record<string, unknown>): CLIOptions {
  return {
    comprehensive: options.comprehensive as boolean,
    verbose: options.verbose as boolean,
    noCache: !options.cache as boolean,
    model: validateModelOption(options.model as string),
    timeout: (options.timeout as number) * 1000, // Convert seconds to milliseconds
    parallel: options.parallel as boolean,
    workers: options.workers as number,
    provider: validateProviderOption(options.provider as string),
    ollamaModel: options.ollamaModel as string,
    ollamaUrl: options.ollamaUrl as string,
    parallelProviders: parseParallelProviders(
      options.parallelProviders as string,
    ),
    aggregation: validateAggregationOption(options.aggregation as string),
  };
}

/**
 * Type guard to validate Claude model option
 */
function isValidModel(model: string): model is 'sonnet' | 'opus' {
  return model === 'sonnet' || model === 'opus';
}

/**
 * Validate the Claude model option with proper type safety
 */
function validateModelOption(modelInput: string): 'sonnet' | 'opus' {
  if (!isValidModel(modelInput)) {
    throw new Error(`Invalid model "${modelInput}". Use 'sonnet' or 'opus'.`);
  }

  return modelInput;
}

/**
 * Validate provider option
 */
function validateProviderOption(
  provider?: string,
): 'claude' | 'ollama' | 'parallel' | undefined {
  if (!provider) return undefined;

  if (
    provider !== 'claude' && provider !== 'ollama' && provider !== 'parallel'
  ) {
    throw new Error(
      `Invalid provider "${provider}". Use 'claude', 'ollama', or 'parallel'.`,
    );
  }

  return provider;
}

/**
 * Validate aggregation strategy option
 */
function validateAggregationOption(
  aggregation?: string,
): 'first' | 'consensus' | 'best' | 'all' | undefined {
  if (!aggregation) return undefined;

  if (
    aggregation !== 'first' && aggregation !== 'consensus' &&
    aggregation !== 'best' && aggregation !== 'all'
  ) {
    throw new Error(
      `Invalid aggregation "${aggregation}". Use 'first', 'consensus', 'best', or 'all'.`,
    );
  }

  return aggregation;
}

/**
 * Parse parallel providers from comma-separated string
 */
function parseParallelProviders(providers?: string): string[] | undefined {
  if (!providers) return undefined;

  return providers.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
}

// Main CLI entry point
if (import.meta.main) {
  const program = new Command()
    .name('dart-to-ts-analyzer')
    .description('Analyze Dart web apps for TypeScript conversion')
    .version('2.0.0')
    .arguments('[project-path]')
    .option(
      '-c, --comprehensive',
      'Use comprehensive analysis (slower but more thorough)',
      { default: false },
    )
    .option(
      '-m, --model <model:string>',
      'Choose Claude model: sonnet (default) or opus',
      { default: 'sonnet' },
    )
    .option('-v, --verbose', 'Show detailed progress and API usage', {
      default: false,
    })
    .option('--no-cache', "Don't use cached responses", { default: false })
    .option(
      '-t, --timeout <seconds:number>',
      'Timeout for analysis in seconds',
      { default: 600 },
    )
    .option(
      '-p, --parallel',
      'Enable parallel processing for faster analysis',
      { default: false },
    )
    .option(
      '-w, --workers <count:number>',
      'Number of parallel workers (default: 4)',
      { default: 4 },
    )
    .option(
      '--provider <provider:string>',
      'LLM provider: claude (default), ollama, or parallel',
      { default: 'claude' },
    )
    .option(
      '--ollama-model <model:string>',
      'Ollama model to use (default: qwen2.5-coder)',
    )
    .option(
      '--ollama-url <url:string>',
      'Ollama server URL (default: http://localhost:11434)',
    )
    .option(
      '--parallel-providers <providers:string>',
      'Comma-separated list of providers for parallel execution',
    )
    .option(
      '--aggregation <strategy:string>',
      'Aggregation strategy for parallel: first, consensus, best, or all',
      { default: 'consensus' },
    )
    .action(async (options, projectPath?: string) => {
      try {
        const analysisConfig = await prepareAnalysisConfig(
          options,
          projectPath,
        );
        await analyzeDartApp(analysisConfig.path, analysisConfig.options);
      } catch (error) {
        console.error(colors.red('Fatal error during analysis:'), error);
        Deno.exit(1);
      }
    });

  await program.parse(Deno.args);
}

export { analyzeDartApp };
