#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Analyzer } from '../src/analyzer/index.js';
import { ignoredPaths } from '../src/config/settings.js';
const program = new Command();
program
    .name('analyze')
    .description('Analyze Dart project for package usage and tech debt')
    .version('1.0.0')
    .argument('<path>', 'Path to Dart project')
    .option('-o, --output <path>', 'Output path for analysis', './decisions')
    .option('-v, --verbose', 'Verbose output')
    .option('--no-tech-debt', 'Skip tech debt analysis')
    .option('--no-packages', 'Skip package analysis')
    .action(async (projectPath, options) => {
    const spinner = ora('Analyzing Dart project...').start();
    try {
        // Validate project path
        if (!await fs.pathExists(projectPath)) {
            throw new Error(`Project path does not exist: ${projectPath}`);
        }
        // Find all Dart files
        spinner.text = 'Scanning for Dart files...';
        const dartFiles = await glob('**/*.dart', {
            cwd: projectPath,
            ignore: ignoredPaths,
        });
        if (dartFiles.length === 0) {
            throw new Error('No Dart files found in the specified directory');
        }
        spinner.text = `Found ${dartFiles.length} Dart files`;
        // Read Dart files
        spinner.text = 'Reading Dart files...';
        const files = await Promise.all(dartFiles.map(async (filePath) => {
            const fullPath = path.join(projectPath, filePath);
            const content = await fs.readFile(fullPath, 'utf-8');
            return {
                path: filePath,
                content,
                imports: extractImports(content),
                exports: extractExports(content),
                parts: extractParts(content),
                libraryName: extractLibraryName(content),
            };
        }));
        // Analyze the project
        spinner.text = 'Analyzing project structure...';
        const analyzer = new Analyzer();
        const analysis = await analyzer.analyze(files);
        // Generate summary
        const summary = {
            projectPath,
            totalFiles: analysis.totalFiles,
            packages: options.packages ? analysis.packages : undefined,
            techDebt: options.techDebt ? analysis.techDebt : undefined,
            recommendations: analysis.recommendations,
            estimatedSavings: analysis.estimatedSavings,
            timestamp: new Date().toISOString(),
        };
        // Save analysis results
        spinner.text = 'Saving analysis results...';
        await fs.ensureDir(options.output);
        // Save main analysis
        await fs.writeJSON(path.join(options.output, 'analysis.json'), summary, { spaces: 2 });
        // Save detailed package analysis
        if (options.packages && analysis.packages.length > 0) {
            await fs.writeJSON(path.join(options.output, 'packages.json'), analysis.packages, { spaces: 2 });
        }
        // Save tech debt analysis
        if (options.techDebt && analysis.techDebt.length > 0) {
            await fs.writeJSON(path.join(options.output, 'tech-debt.json'), analysis.techDebt, { spaces: 2 });
        }
        spinner.succeed(chalk.green('Analysis complete!'));
        // Print summary
        printAnalysisSummary(summary, options.verbose);
        // Print recommendations
        if (analysis.recommendations.length > 0) {
            console.log(chalk.cyan('\n📝 Recommendations:'));
            analysis.recommendations.forEach((rec) => {
                console.log(chalk.white(`   ${rec}`));
            });
        }
        console.log(chalk.green(`\n✅ Results saved to ${options.output}`));
        console.log(chalk.gray('   - analysis.json: Main analysis summary'));
        if (options.packages) {
            console.log(chalk.gray('   - packages.json: Detailed package usage'));
        }
        if (options.techDebt) {
            console.log(chalk.gray('   - tech-debt.json: Technical debt patterns'));
        }
    }
    catch (error) {
        spinner.fail(chalk.red('Analysis failed'));
        console.error(chalk.red('\n❌ Error:'), error);
        process.exit(1);
    }
});
function extractImports(content) {
    const imports = [];
    const importRegex = /import\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }
    return imports;
}
function extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
    }
    return exports;
}
function extractParts(content) {
    const parts = [];
    const partRegex = /part\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = partRegex.exec(content)) !== null) {
        parts.push(match[1]);
    }
    return parts;
}
function extractLibraryName(content) {
    const libraryMatch = content.match(/library\s+(\w+);/);
    return libraryMatch ? libraryMatch[1] : undefined;
}
function printAnalysisSummary(summary, _verbose) {
    console.log('\n' + chalk.cyan('═'.repeat(60)));
    console.log(chalk.cyan.bold('📊 Project Analysis Summary'));
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.white('\nProject:'), chalk.blue(summary.projectPath));
    console.log(chalk.white('Files:'), chalk.blue(summary.totalFiles));
    if (summary.packages) {
        console.log(chalk.white('\nPackage Analysis:'));
        const packagesByAction = summary.packages.reduce((acc, pkg) => {
            const complexity = pkg.complexity;
            acc[complexity] = (acc[complexity] || 0) + 1;
            return acc;
        }, {});
        console.log(chalk.white('  Total packages:'), summary.packages.length);
        console.log(chalk.red('  Trivial (unused):'), packagesByAction.trivial || 0);
        console.log(chalk.yellow('  Simple:'), packagesByAction.simple || 0);
        console.log(chalk.blue('  Moderate:'), packagesByAction.moderate || 0);
        console.log(chalk.green('  Complex:'), packagesByAction.complex || 0);
    }
    if (summary.techDebt) {
        console.log(chalk.white('\nTechnical Debt:'));
        const debtBySeverity = summary.techDebt.reduce((acc, debt) => {
            acc[debt.severity] = (acc[debt.severity] || 0) + debt.occurrences;
            return acc;
        }, {});
        console.log(chalk.white('  Patterns found:'), summary.techDebt.length);
        if (debtBySeverity.critical) {
            console.log(chalk.red('  Critical:'), debtBySeverity.critical);
        }
        if (debtBySeverity.high) {
            console.log(chalk.magenta('  High:'), debtBySeverity.high);
        }
        if (debtBySeverity.medium) {
            console.log(chalk.yellow('  Medium:'), debtBySeverity.medium);
        }
        if (debtBySeverity.low) {
            console.log(chalk.gray('  Low:'), debtBySeverity.low);
        }
    }
    console.log(chalk.white('\nEstimated Savings:'));
    console.log(chalk.green('  Dependencies:'), summary.estimatedSavings.dependencies, 'packages');
    console.log(chalk.green('  Code reduction:'), summary.estimatedSavings.linesOfCode, 'lines');
    console.log(chalk.green('  Complexity:'), summary.estimatedSavings.complexity, 'points');
}
program.parse();
//# sourceMappingURL=analyze.js.map