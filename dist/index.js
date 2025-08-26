"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDartApp = analyzeDartApp;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const scanner_1 = require("./scanner");
const extractor_1 = require("./extractor");
const analyzer_1 = require("./analyzer");
async function analyzeDartApp(projectPath) {
    console.log('🔍 Starting Dart app analysis...\n');
    // Step 1: Scan and categorize files
    console.log('📁 Scanning project structure...');
    const categories = (0, scanner_1.scanDartProject)(projectPath);
    console.log(`Found:
  - ${categories.components.length} component files
  - ${categories.state.length} state management files
  - ${categories.services.length} service files
  - ${categories.utils.length} utility files
  - Entry point: ${categories.entry || 'not found'}\n`);
    // Step 2: Extract relevant code chunks
    console.log('📝 Extracting code for analysis...');
    const chunks = (0, extractor_1.extractCodeForAnalysis)(projectPath, categories);
    console.log(`Prepared ${chunks.length} code chunks for analysis\n`);
    // Step 3: Analyze functionality using LLM
    console.log('🧠 Analyzing functionality (using LLM)...');
    const analysis = await (0, analyzer_1.analyzeFunctionality)(chunks);
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
function generateReadableReport(analysis) {
    return `# Dart Application Functional Analysis Report

## Application Purpose
${analysis.appPurpose}

## Core Features
${analysis.coreFeatures.map((f) => `- ${f}`).join('\n')}

## User Workflows
${analysis.userWorkflows.map((w) => `
### ${w.name}
${w.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`).join('\n')}

## Data Architecture
### Sources
${analysis.dataFlow.sources.map((s) => `- ${s}`).join('\n')}

### Transformations
${analysis.dataFlow.transformations.map((t) => `- ${t}`).join('\n')}

### Destinations
${analysis.dataFlow.destinations.map((d) => `- ${d}`).join('\n')}

## State Management
- **Pattern**: ${analysis.stateManagement.pattern}
- **Key Actions**: ${analysis.stateManagement.keyActions.join(', ')}
- **Selectors**: ${analysis.stateManagement.selectors.join(', ')}

## Business Logic
### Rules
${analysis.businessLogic.rules.map((r) => `- ${r}`).join('\n')}

### Validations
${analysis.businessLogic.validations.map((v) => `- ${v}`).join('\n')}

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
