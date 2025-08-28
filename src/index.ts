import * as path from 'path';
import { Command } from 'commander';
import { AnalysisService } from './services/analysis-service';
import { pathExists } from './utils/file-operations';
import { type CLIOptions } from './types';

async function analyzeDartApp(projectPath: string, options: CLIOptions = {}) {
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

// Run analysis if called directly
if (require.main === module) {
  const program = new Command();

  program
    .name('dart-to-ts-analyzer')
    .description('Analyze Dart Flutter apps for TypeScript conversion')
    .version('1.0.0')
    .argument(
      '[project-path]',
      'Path to Dart project directory',
      path.join(__dirname, '..', '..', 'frontend_release_dashboard')
    )
    .option(
      '-c, --comprehensive',
      'Use comprehensive analysis (slower but more thorough)',
      false
    )
    .option(
      '-m, --model <model>',
      'Choose Claude model: sonnet (default) or opus',
      'sonnet'
    )
    .option('-v, --verbose', 'Show detailed progress and API usage', false)
    .option('--no-cache', "Don't use cached responses", false)
    .option(
      '-t, --timeout <seconds>',
      'Timeout for analysis in seconds (default: 600)',
      '600'
    )
    .option(
      '-p, --parallel',
      'Enable parallel processing for faster analysis',
      false
    )
    .option(
      '-w, --workers <count>',
      'Number of parallel workers (default: 4)',
      '4'
    )
    .action((projectPath: string, options: any) => {
      const cliOptions: CLIOptions = {
        comprehensive: options.comprehensive,
        verbose: options.verbose,
        noCache: !options.cache,
        model: options.model as 'sonnet' | 'opus',
        timeout: parseInt(options.timeout) * 1000, // Convert seconds to milliseconds
        parallel: options.parallel,
        workers: parseInt(options.workers),
      };

      // Validate model option
      if (!['sonnet', 'opus'].includes(cliOptions.model!)) {
        console.error(
          `Error: Invalid model "${cliOptions.model}". Use 'sonnet' or 'opus'.`
        );
        process.exit(1);
      }

      // Validate project path exists
      if (!pathExists(projectPath)) {
        console.error(`Error: Project path "${projectPath}" does not exist.`);
        process.exit(1);
      }

      analyzeDartApp(projectPath, cliOptions).catch((error) => {
        console.error('Fatal error during analysis:', error);
        process.exit(1);
      });
    });

  program.parse(process.argv);
}

export { analyzeDartApp };
