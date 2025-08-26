import * as fs from 'fs';
import * as path from 'path';
import { scanDartProject } from './scanner';
import { extractCodeForAnalysis } from './extractor';
import { analyzeFunctionality } from './analyzer';

async function analyzeDartApp(projectPath: string) {
  console.log('🔍 Starting Dart app analysis...\n');
  
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
  
  // Step 3: Analyze functionality using LLM
  console.log('🧠 Analyzing functionality (using LLM)...');
  const analysis = await analyzeFunctionality(chunks);
  
  // Step 4: Generate reports
  console.log('📊 Generating analysis reports...\n');
  
  // Save file categories
  const categoriesPath = path.join(__dirname, '..', 'analysis', 'raw', 'file-categories.json');
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
  console.log(`✅ File categories saved to: ${categoriesPath}`);
  
  // Save functional analysis
  const analysisPath = path.join(__dirname, '..', 'analysis', 'functional', 'analysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  console.log(`✅ Functional analysis saved to: ${analysisPath}`);
  
  // Generate human-readable report
  const report = generateReadableReport(analysis);
  const reportPath = path.join(__dirname, '..', 'analysis', 'report.md');
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
  analyzeDartApp(projectPath).catch(console.error);
}

export { analyzeDartApp };