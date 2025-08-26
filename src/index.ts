import * as fs from 'fs';
import * as path from 'path';
import { scanDartProject } from './scanner';
import { extractCodeForAnalysis } from './extractor';
import { analyzeFunctionality, comprehensiveAnalysis, AnalysisOptions } from './analyzer';

interface CLIOptions {
  comprehensive?: boolean;
  model?: 'sonnet' | 'opus' | 'haiku';
  verbose?: boolean;
  noCache?: boolean;
}

async function analyzeDartApp(projectPath: string, options: CLIOptions = {}) {
  console.log('🔍 Starting Dart app analysis with Claude Code integration...\n');
  
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
  const chunks = extractCodeForAnalysis(projectPath, categories);
  console.log(`Prepared ${chunks.length} code chunks for analysis\n`);
  
  // Step 3: Analyze functionality using Claude CLI
  const analysisOptions: AnalysisOptions = {
    model: options.model || 'sonnet',
    verbose: options.verbose || false,
    useCache: !options.noCache
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
  
  [analysisDir, rawDir, functionalDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Save file categories
  const categoriesPath = path.join(rawDir, 'file-categories.json');
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
  console.log(`✅ File categories saved to: ${categoriesPath}`);
  
  // Save functional analysis
  const analysisPath = path.join(functionalDir, 'analysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  console.log(`✅ Functional analysis saved to: ${analysisPath}`);
  
  // Generate human-readable report
  const report = generateReadableReport(analysis);
  const reportPath = path.join(analysisDir, 'report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Readable report saved to: ${reportPath}\n`);
  
  console.log('🎯 Analysis complete! Next steps:');
  console.log('1. Review the functional analysis');
  console.log('2. Validate understanding with test app');
  console.log('3. Begin TypeScript architecture planning');
  
  return analysis;
}

function generateReadableReport(analysis: any): string {
  return `# Dart Application Functional Analysis Report

## Application Purpose
${analysis.appPurpose}

## Core Features
${analysis.coreFeatures.map((f: string) => `- ${f}`).join('\n')}

## User Workflows
${analysis.userWorkflows.map((w: any) => `
### ${w.name}
${w.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`).join('\n')}

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
  const projectPath = process.argv[2] || path.join(__dirname, '..', 'frontend_release_dashboard');
  
  // Parse command line options
  const options: CLIOptions = {
    comprehensive: process.argv.includes('--comprehensive'),
    verbose: process.argv.includes('--verbose'),
    noCache: process.argv.includes('--no-cache'),
    model: 'sonnet' // default
  };
  
  // Check for model option
  const modelIndex = process.argv.indexOf('--model');
  if (modelIndex !== -1 && process.argv[modelIndex + 1]) {
    const model = process.argv[modelIndex + 1] as 'sonnet' | 'opus' | 'haiku';
    if (['sonnet', 'opus', 'haiku'].includes(model)) {
      options.model = model;
    }
  }
  
  // Show usage if help requested
  if (process.argv.includes('--help')) {
    console.log(`
Usage: pnpm analyze [project-path] [options]

Options:
  --comprehensive    Use comprehensive analysis (slower but more thorough)
  --model <model>    Choose Claude model: sonnet (default), opus, or haiku
  --verbose          Show detailed progress and API usage
  --no-cache         Don't use cached responses
  --help             Show this help message

Examples:
  pnpm analyze
  pnpm analyze ./my-dart-app
  pnpm analyze --comprehensive --model opus
  pnpm analyze --verbose --no-cache
`);
    process.exit(0);
  }
  
  analyzeDartApp(projectPath, options).catch(console.error);
}

export { analyzeDartApp };