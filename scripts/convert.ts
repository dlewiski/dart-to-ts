#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import fs from 'fs-extra';
import * as path from 'path';
import { ConversionOrchestrator } from '../src/converter/index.js';
import { DartFile, ConversionConfig } from '../src/types.js';
import { defaultConversionConfig, ignoredPaths } from '../src/config/settings.js';

const program = new Command();

program
  .name('convert')
  .description('Convert Dart project to TypeScript')
  .version('1.0.0')
  .argument('<input>', 'Path to Dart project or file')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('-e, --extract <path>', 'Extracted utilities directory', './extracted')
  .option('-d, --decisions <path>', 'Decisions log directory', './decisions')
  .option('--aggressive', 'Aggressive optimization mode')
  .option('--no-modernize', 'Skip modernization patterns')
  .option('--no-preserve-comments', 'Remove comments')
  .option('--no-llm', 'Disable LLM enhancement')
  .option('--concurrency <number>', 'Max concurrent conversions', '5')
  .option('--dry-run', 'Analyze without converting')
  .option('-v, --verbose', 'Verbose output')
  .action(async (input: string, options: any) => {
    const spinner = ora('Preparing conversion...').start();

    try {
      // Build configuration
      const config: ConversionConfig = {
        ...defaultConversionConfig,
        inputPath: input,
        outputPath: options.output,
        extractPath: options.extract,
        decisionsPath: options.decisions,
        aggressive: options.aggressive || false,
        preserveComments: options.preserveComments,
        modernize: options.modernize,
        useLLM: options.llm,
        maxConcurrency: parseInt(options.concurrency) || 5,
      };

      // Check for AWS credentials if LLM is enabled
      if (config.useLLM && !process.env.AWS_ACCESS_KEY_ID) {
        console.warn(
          chalk.yellow('\n⚠️  Warning: AWS credentials not found. LLM enhancement disabled.')
        );
        console.warn(
          chalk.gray('   Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to enable LLM features.')
        );
        config.useLLM = false;
      }

      // Find Dart files
      spinner.text = 'Scanning for Dart files...';
      const stats = await fs.stat(input);
      const isDirectory = stats.isDirectory();
      let dartFilePaths: string[];

      if (isDirectory) {
        dartFilePaths = await glob('**/*.dart', {
          cwd: input,
          ignore: ignoredPaths,
        });
      } else {
        dartFilePaths = [path.basename(input)];
      }

      if (dartFilePaths.length === 0) {
        throw new Error('No Dart files found');
      }

      spinner.text = `Found ${dartFilePaths.length} Dart files`;

      // Read Dart files
      spinner.text = 'Reading Dart files...';
      const files: DartFile[] = await Promise.all(
        dartFilePaths.map(async filePath => {
          const fullPath = isDirectory ? path.join(input, filePath) : input;
          const content = await fs.readFile(fullPath, 'utf-8');

          return {
            path: filePath,
            content,
            imports: extractImports(content),
            exports: extractExports(content),
            parts: [],
          };
        })
      );

      if (options.dryRun) {
        spinner.text = 'Running in dry-run mode (analysis only)...';
        // Just analyze without converting
        await analyzeDryRun(files, config);
        spinner.succeed(chalk.green('Dry run complete!'));
        return;
      }

      // Create output directories
      await fs.ensureDir(config.outputPath);
      await fs.ensureDir(config.extractPath);
      await fs.ensureDir(config.decisionsPath);

      // Create converter
      spinner.text = 'Initializing converter...';
      const orchestrator = new ConversionOrchestrator(config);

      // Convert files
      spinner.text = 'Converting files...';
      const results = await orchestrator.convertProject(files, config);

      // Save converted files
      spinner.text = 'Saving converted files...';
      let successCount = 0;
      let failCount = 0;

      for (const [filePath, result] of results) {
        if (result.success) {
          const outputPath = path.join(config.outputPath, filePath.replace('.dart', '.ts'));
          await fs.ensureDir(path.dirname(outputPath));
          await fs.writeFile(outputPath, result.typescript);
          successCount++;

          if (options.verbose) {
            console.log(chalk.green(`✓ ${filePath}`));
          }
        } else {
          failCount++;
          if (options.verbose) {
            console.log(chalk.red(`✗ ${filePath}: ${result.errors?.join(', ')}`));
          }
        }
      }

      // Save decision log
      const decisions = Array.from(results.values()).flatMap(r => r.decisions);
      await fs.writeJSON(path.join(config.decisionsPath, 'conversion-decisions.json'), decisions, {
        spaces: 2,
      });

      // Generate reports
      spinner.text = 'Generating reports...';
      const { TechDebtReporter, PackageReporter } = await import('../src/reports/index.js');

      const debtReporter = new TechDebtReporter();
      const packageReporter = new PackageReporter();

      // Get tech debt patterns from first result
      const _firstResult = Array.from(results.values())[0];
      const techDebtPatterns: any[] = []; // Would come from analysis

      await debtReporter.generateReport(techDebtPatterns, results, config.decisionsPath);
      await packageReporter.generateReport(decisions, results, config.decisionsPath);

      spinner.succeed(chalk.green('Conversion complete!'));

      // Print summary
      printConversionSummary(successCount, failCount, decisions, config);
    } catch (error) {
      spinner.fail(chalk.red('Conversion failed'));
      console.error(chalk.red('\n❌ Error:'), error);
      process.exit(1);
    }
  });

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const exportRegex = /export\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  return exports;
}

async function analyzeDryRun(files: DartFile[], _config: ConversionConfig) {
  const { Analyzer } = await import('../src/analyzer/index.js');
  const { PackageDecisionMaker } = await import('../src/intelligence/index.js');

  const analyzer = new Analyzer();
  const analysis = await analyzer.analyze(files);

  const decisionMaker = new PackageDecisionMaker();
  const decisions = await decisionMaker.makeDecisions(analysis.packages);

  console.log(chalk.cyan('\n═══ Dry Run Analysis ═══'));
  console.log(chalk.white('Files to convert:'), files.length);
  console.log(chalk.white('Packages found:'), analysis.packages.length);
  console.log(chalk.white('Tech debt patterns:'), analysis.techDebt.length);

  console.log(chalk.cyan('\nPackage Actions:'));
  const actionCounts = decisions.reduce(
    (acc, d) => {
      acc[d.action] = (acc[d.action] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(chalk.red('  Eliminate:'), actionCounts.eliminate || 0);
  console.log(chalk.yellow('  Inline:'), actionCounts.inline || 0);
  console.log(chalk.blue('  Replace:'), actionCounts.replace || 0);
  console.log(chalk.green('  Preserve:'), actionCounts.preserve || 0);

  console.log(chalk.cyan('\nEstimated Impact:'));
  console.log(chalk.white('  Dependencies reduced:'), analysis.estimatedSavings.dependencies);
  console.log(chalk.white('  Lines saved:'), analysis.estimatedSavings.linesOfCode);
  console.log(chalk.white('  Complexity reduction:'), analysis.estimatedSavings.complexity);
}

function printConversionSummary(
  successCount: number,
  failCount: number,
  decisions: any[],
  config: ConversionConfig
) {
  console.log('\n' + chalk.cyan('═'.repeat(60)));
  console.log(chalk.cyan.bold('🚀 Conversion Complete'));
  console.log(chalk.cyan('═'.repeat(60)));

  console.log(chalk.white('\nFiles:'));
  console.log(chalk.green(`  ✅ Successful: ${successCount}`));
  if (failCount > 0) {
    console.log(chalk.red(`  ❌ Failed: ${failCount}`));
  }

  const actionCounts = decisions.reduce(
    (acc, d) => {
      acc[d.action] = (acc[d.action] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(chalk.white('\nPackage Actions:'));
  console.log(chalk.red(`  🗑️  Eliminated: ${actionCounts.eliminate || 0}`));
  console.log(chalk.yellow(`  📦 Inlined: ${actionCounts.inline || 0}`));
  console.log(chalk.blue(`  🔄 Replaced: ${actionCounts.replace || 0}`));
  console.log(chalk.green(`  ✅ Preserved: ${actionCounts.preserve || 0}`));

  console.log(chalk.white('\nOutput:'));
  console.log(chalk.white('  TypeScript files:'), config.outputPath);
  console.log(chalk.white('  Extracted utilities:'), config.extractPath);
  console.log(chalk.white('  Reports:'), config.decisionsPath);

  console.log('\n' + chalk.cyan('═'.repeat(60)));
  console.log(chalk.green('✨ Next steps:'));
  console.log(chalk.white('  1. Review the generated TypeScript code'));
  console.log(chalk.white('  2. Check the migration guide in decisions/'));
  console.log(chalk.white('  3. Install replacement packages (see package-report.md)'));
  console.log(chalk.white('  4. Run TypeScript compiler to check for errors'));
  console.log(chalk.cyan('═'.repeat(60)) + '\n');
}

program.parse();
