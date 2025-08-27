import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { scanDartProject } from './scanner';
import { extractCodeForAnalysis } from './extractor';
import { analyzeFunctionality, comprehensiveAnalysis } from './analyzer';
import {
  type CLIOptions,
  type AnalysisOptions,
  type FunctionalAnalysis,
  type Workflow,
} from './types';

async function analyzeDartApp(projectPath: string, options: CLIOptions = {}) {
  console.log(
    '🔍 Starting Dart app analysis with Claude Code integration...\n'
  );

  // Step 1: Scan and categorize files
  console.log('📁 Scanning project structure...');
  const categories = scanDartProject(projectPath);

  console.log(`Found:
  - ${categories.components.length} component files
  - ${categories.state.length} state management files
  - ${categories.services.length} service files
  - ${categories.utils.length} utility files
  - Entry point: ${categories.entry || 'not found'}\n`);

  // Step 2: Extract relevant code chunks
  console.log('📝 Extracting code for analysis...');
  const chunks = await extractCodeForAnalysis(projectPath, categories);
  console.log(`Prepared ${chunks.length} code chunks for analysis\n`);

  // Step 3: Analyze functionality using Claude CLI
  const analysisOptions: AnalysisOptions = {
    model: options.model || 'sonnet',
    verbose: options.verbose || false,
    useCache: !options.noCache,
    timeout: options.timeout,
  };

  let analysis;

  if (options.comprehensive) {
    // Use comprehensive analysis for deeper understanding
    analysis = await comprehensiveAnalysis(chunks, analysisOptions);
  } else {
    // Use chunk-by-chunk analysis for efficiency
    analysis = await analyzeFunctionality(chunks, analysisOptions);
  }

  // Step 4: Generate reports
  console.log('\n📊 Generating analysis reports...\n');

  // Ensure analysis directories exist
  const analysisDir = path.join(__dirname, '..', 'analysis');
  const rawDir = path.join(analysisDir, 'raw');
  const functionalDir = path.join(analysisDir, 'functional');

  [analysisDir, rawDir, functionalDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Save file categories
  const categoriesPath = path.join(rawDir, 'file-categories.json');
  try {
    fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
    console.log(`✅ File categories saved to: ${categoriesPath}`);
  } catch (error) {
    console.error(`❌ Failed to save file categories:`, error);
    throw new Error(
      `Failed to save file categories: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Save functional analysis
  const analysisPath = path.join(functionalDir, 'analysis.json');
  try {
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    console.log(`✅ Functional analysis saved to: ${analysisPath}`);
  } catch (error) {
    console.error(`❌ Failed to save functional analysis:`, error);
    throw new Error(
      `Failed to save functional analysis: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Generate human-readable report
  const report = generateReadableReport(analysis);
  const reportPath = path.join(analysisDir, 'report.md');
  try {
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Readable report saved to: ${reportPath}\n`);
  } catch (error) {
    console.error(`❌ Failed to save report:`, error);
    throw new Error(
      `Failed to save report: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  console.log('🎯 Analysis complete! Next steps:');
  console.log('1. Review the functional analysis');
  console.log('2. Validate understanding with test app');
  console.log('3. Begin TypeScript architecture planning');

  return analysis;
}

function generateReadableReport(analysis: FunctionalAnalysis): string {
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

// Run analysis if called directly
if (require.main === module) {
  const program = new Command();

  program
    .name('dart-to-ts-analyzer')
    .description('Analyze Dart Flutter apps for TypeScript conversion')
    .version('1.0.0')
    .argument('[project-path]', 'Path to Dart project directory', path.join(__dirname, '..', '..', 'frontend_release_dashboard'))
    .option('-c, --comprehensive', 'Use comprehensive analysis (slower but more thorough)', false)
    .option('-m, --model <model>', 'Choose Claude model: sonnet (default) or opus', 'sonnet')
    .option('-v, --verbose', 'Show detailed progress and API usage', false)
    .option('--no-cache', 'Don\'t use cached responses', false)
    .option('-t, --timeout <seconds>', 'Timeout for analysis in seconds (default: 600)', '600')
    .action((projectPath: string, options: any) => {
      const cliOptions: CLIOptions = {
        comprehensive: options.comprehensive,
        verbose: options.verbose,
        noCache: !options.cache,
        model: options.model as 'sonnet' | 'opus',
        timeout: parseInt(options.timeout) * 1000, // Convert seconds to milliseconds
      };

      // Validate model option
      if (!['sonnet', 'opus'].includes(cliOptions.model!)) {
        console.error(`Error: Invalid model "${cliOptions.model}". Use 'sonnet' or 'opus'.`);
        process.exit(1);
      }

      // Validate project path exists
      if (!fs.existsSync(projectPath)) {
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
