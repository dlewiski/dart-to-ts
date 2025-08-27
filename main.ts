import { Command, colors, join } from './deps.ts';
import { AnalysisService } from './src/services/analysis-service.ts';
import { pathExists } from './src/utils/file-operations.ts';
import { type CLIOptions } from './src/types/index.ts';

async function analyzeDartApp(projectPath: string, options: CLIOptions = {}) {
  const analysisService = new AnalysisService(projectPath);

  // Execute analysis workflow
  const result = await analysisService.analyze(options);

  // Save results to files
  await analysisService.saveResults(result);

  console.log(colors.green('🎯 Analysis complete! Next steps:'));
  console.log('1. Review the functional analysis');
  console.log('2. Validate understanding with test app');
  console.log('3. Begin TypeScript architecture planning');

  return result.analysis;
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
      { default: false }
    )
    .option(
      '-m, --model <model:string>',
      'Choose Claude model: sonnet (default) or opus',
      { default: 'sonnet' }
    )
    .option(
      '-v, --verbose',
      'Show detailed progress and API usage',
      { default: false }
    )
    .option(
      '--no-cache',
      "Don't use cached responses",
      { default: false }
    )
    .option(
      '-t, --timeout <seconds:number>',
      'Timeout for analysis in seconds',
      { default: 600 }
    )
    .action(async (options, projectPath?: string) => {
      // Default project path
      const analysisPath = projectPath || 
        join(Deno.cwd(), 'frontend_release_dashboard');
      
      // Validate model option
      const model = options.model as 'sonnet' | 'opus';
      if (!['sonnet', 'opus'].includes(model)) {
        console.error(
          colors.red(`Error: Invalid model "${model}". Use 'sonnet' or 'opus'.`)
        );
        Deno.exit(1);
      }

      // Validate project path exists
      if (!await pathExists(analysisPath)) {
        console.error(colors.red(`Error: Project path "${analysisPath}" does not exist.`));
        Deno.exit(1);
      }

      const cliOptions: CLIOptions = {
        comprehensive: options.comprehensive,
        verbose: options.verbose,
        noCache: !options.cache,
        model,
        timeout: options.timeout * 1000, // Convert seconds to milliseconds
      };

      try {
        await analyzeDartApp(analysisPath, cliOptions);
      } catch (error) {
        console.error(colors.red('Fatal error during analysis:'), error);
        Deno.exit(1);
      }
    });

  await program.parse(Deno.args);
}

export { analyzeDartApp };