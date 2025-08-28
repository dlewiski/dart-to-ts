import { colors, Command, join } from './deps.ts';
import { AnalysisService } from './src/services/analysis-service.ts';
import { pathExists } from './src/utils/file-operations.ts';
import { type CLIOptions, type FunctionalAnalysis } from './src/types/index.ts';

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
  // Determine analysis path
  const analysisPath = projectPath ||
    join(Deno.cwd(), 'frontend_release_dashboard');

  // Validate project path exists
  if (!await pathExists(analysisPath)) {
    throw new Error(`Project path "${analysisPath}" does not exist.`);
  }

  // Validate and prepare model option
  const validatedModel = validateModelOption(options.model as string);

  const cliOptions: CLIOptions = {
    comprehensive: options.comprehensive as boolean,
    verbose: options.verbose as boolean,
    noCache: !options.cache as boolean,
    model: validatedModel,
    timeout: (options.timeout as number) * 1000, // Convert seconds to milliseconds
  };

  return { path: analysisPath, options: cliOptions };
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

// Main CLI entry point
if (import.meta.main) {
  const program = new Command()
    .name('dart-to-ts-analyzer')
    .description('Analyze Dart Flutter apps for TypeScript conversion')
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
    .option(
      '-v, --verbose',
      'Show detailed progress and API usage',
      { default: false },
    )
    .option(
      '--no-cache',
      "Don't use cached responses",
      { default: false },
    )
    .option(
      '-t, --timeout <seconds:number>',
      'Timeout for analysis in seconds',
      { default: 600 },
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
