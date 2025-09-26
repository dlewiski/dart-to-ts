#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
const program = new Command();
program
    .name('report')
    .description('Generate reports from conversion results')
    .version('1.0.0')
    .option('-d, --decisions <path>', 'Path to decisions directory', './decisions')
    .option('-f, --format <type>', 'Output format (json|markdown|html)', 'markdown')
    .option('--compare <before>', 'Compare with previous analysis')
    .action(async (options) => {
    try {
        console.log(chalk.cyan('📊 Generating reports...'));
        // Load analysis data
        const analysisPath = path.join(options.decisions, 'analysis.json');
        const packagesPath = path.join(options.decisions, 'packages.json');
        const techDebtPath = path.join(options.decisions, 'tech-debt.json');
        const decisionsPath = path.join(options.decisions, 'conversion-decisions.json');
        if (!await fs.pathExists(analysisPath)) {
            throw new Error(`Analysis file not found at ${analysisPath}. Run 'analyze' first.`);
        }
        const analysis = await fs.readJSON(analysisPath);
        const packages = await fs.pathExists(packagesPath) ? await fs.readJSON(packagesPath) : [];
        const techDebt = await fs.pathExists(techDebtPath) ? await fs.readJSON(techDebtPath) : [];
        const decisions = await fs.pathExists(decisionsPath) ? await fs.readJSON(decisionsPath) : [];
        // Generate consolidated report
        const report = generateConsolidatedReport(analysis, packages, techDebt, decisions);
        // Output based on format
        switch (options.format) {
            case 'json':
                await outputJSON(report, options.decisions);
                break;
            case 'html':
                await outputHTML(report, options.decisions);
                break;
            case 'markdown':
            default:
                await outputMarkdown(report, options.decisions);
                break;
        }
        // Handle comparison if requested
        if (options.compare) {
            await generateComparisonReport(options.compare, options.decisions);
        }
        console.log(chalk.green('✅ Reports generated successfully!'));
        console.log(chalk.gray(`   Output directory: ${options.decisions}`));
    }
    catch (error) {
        console.error(chalk.red('❌ Error generating reports:'), error);
        process.exit(1);
    }
});
function generateConsolidatedReport(analysis, packages, techDebt, decisions) {
    return {
        summary: {
            project: analysis.projectPath,
            timestamp: analysis.timestamp,
            files: analysis.totalFiles,
            packages: packages.length,
            techDebtPatterns: techDebt.length,
            decisions: decisions.length,
        },
        metrics: {
            packageComplexity: calculatePackageComplexity(packages),
            techDebtScore: calculateTechDebtScore(techDebt),
            dependencyReduction: calculateDependencyReduction(decisions),
            modernizationScore: calculateModernizationScore(decisions),
        },
        details: {
            topPackages: getTopPackages(packages),
            criticalDebts: getCriticalDebts(techDebt),
            majorDecisions: getMajorDecisions(decisions),
        },
        recommendations: analysis.recommendations || [],
        estimatedSavings: analysis.estimatedSavings || {},
    };
}
function calculatePackageComplexity(packages) {
    return packages.reduce((acc, pkg) => {
        acc[pkg.complexity] = (acc[pkg.complexity] || 0) + 1;
        return acc;
    }, {});
}
function calculateTechDebtScore(techDebt) {
    const weights = { critical: 10, high: 5, medium: 2, low: 1 };
    return techDebt.reduce((score, debt) => {
        return score + (weights[debt.severity] || 0) * debt.occurrences;
    }, 0);
}
function calculateDependencyReduction(decisions) {
    const eliminated = decisions.filter(d => d.action === 'eliminate').length;
    const inlined = decisions.filter(d => d.action === 'inline').length;
    return eliminated + inlined;
}
function calculateModernizationScore(decisions) {
    const replaced = decisions.filter(d => d.action === 'replace').length;
    const total = decisions.length;
    return total > 0 ? Math.round((replaced / total) * 100) : 0;
}
function getTopPackages(packages) {
    return packages
        .sort((a, b) => {
        const complexityOrder = { complex: 0, moderate: 1, simple: 2, trivial: 3 };
        return complexityOrder[a.complexity] - complexityOrder[b.complexity];
    })
        .slice(0, 5);
}
function getCriticalDebts(techDebt) {
    return techDebt
        .filter(debt => debt.severity === 'critical' || debt.severity === 'high')
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 5);
}
function getMajorDecisions(decisions) {
    return decisions
        .filter(d => d.action === 'replace' || d.action === 'eliminate')
        .slice(0, 10);
}
async function outputJSON(report, outputDir) {
    const outputPath = path.join(outputDir, 'consolidated-report.json');
    await fs.writeJSON(outputPath, report, { spaces: 2 });
    console.log(chalk.green(`✓ JSON report saved to ${outputPath}`));
}
async function outputMarkdown(report, outputDir) {
    const markdown = `# Dart to TypeScript Conversion Report

Generated: ${new Date(report.summary.timestamp).toLocaleString()}

## Executive Summary

- **Project**: ${report.summary.project}
- **Files Analyzed**: ${report.summary.files}
- **Packages Found**: ${report.summary.packages}
- **Tech Debt Patterns**: ${report.summary.techDebtPatterns}
- **Migration Decisions**: ${report.summary.decisions}

## Key Metrics

### Package Complexity
${Object.entries(report.metrics.packageComplexity)
        .map(([level, count]) => `- **${level}**: ${count}`)
        .join('\n')}

### Technical Debt
- **Total Score**: ${report.metrics.techDebtScore}
- **Critical Issues**: ${report.details.criticalDebts.length}

### Modernization Impact
- **Dependencies Reduced**: ${report.metrics.dependencyReduction}
- **Modernization Score**: ${report.metrics.modernizationScore}%

## Top Packages Requiring Attention

${report.details.topPackages.map((pkg, i) => `${i + 1}. **${pkg.packageName}** (${pkg.complexity})
   - Imports: ${pkg.imports.length}
   - Used: ${Object.values(pkg.actuallyUsed).flat().length} items`).join('\n\n')}

## Critical Technical Debt

${report.details.criticalDebts.map((debt, i) => `${i + 1}. **${debt.pattern}** (${debt.severity})
   - Occurrences: ${debt.occurrences}
   - Fix: ${debt.fix}`).join('\n\n')}

## Major Migration Decisions

${report.details.majorDecisions.map((decision) => `- **${decision.packageName}**: ${decision.action}
  - Reason: ${decision.reason}`).join('\n')}

## Recommendations

${report.recommendations.map((rec) => `- ${rec}`).join('\n')}

## Estimated Savings

- **Dependencies**: ${report.estimatedSavings.dependencies || 0} packages
- **Lines of Code**: ${report.estimatedSavings.linesOfCode || 0}
- **Complexity Points**: ${report.estimatedSavings.complexity || 0}

## Next Steps

1. Review the package migration decisions
2. Address critical technical debt
3. Install replacement packages
4. Test the converted TypeScript code
5. Update documentation

---

*This report was generated automatically by the Dart to TypeScript converter.*
`;
    const outputPath = path.join(outputDir, 'consolidated-report.md');
    await fs.writeFile(outputPath, markdown);
    console.log(chalk.green(`✓ Markdown report saved to ${outputPath}`));
}
async function outputHTML(report, outputDir) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dart to TypeScript Conversion Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    .metric { background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .metric-value { font-size: 2em; font-weight: bold; color: #3498db; }
    .critical { color: #e74c3c; }
    .high { color: #e67e22; }
    .medium { color: #f39c12; }
    .low { color: #95a5a6; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background: #3498db; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .recommendations { background: #ecf0f1; padding: 20px; border-radius: 5px; }
    .recommendations li { margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Dart to TypeScript Conversion Report</h1>

  <div class="metric">
    <h2>Summary</h2>
    <p>Generated: ${new Date(report.summary.timestamp).toLocaleString()}</p>
    <p>Project: <strong>${report.summary.project}</strong></p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
      <div>
        <div class="metric-value">${report.summary.files}</div>
        <div>Files Analyzed</div>
      </div>
      <div>
        <div class="metric-value">${report.summary.packages}</div>
        <div>Packages Found</div>
      </div>
      <div>
        <div class="metric-value">${report.metrics.techDebtScore}</div>
        <div>Tech Debt Score</div>
      </div>
      <div>
        <div class="metric-value">${report.metrics.dependencyReduction}</div>
        <div>Dependencies Reduced</div>
      </div>
    </div>
  </div>

  <h2>Package Complexity</h2>
  <table>
    <tr>
      <th>Complexity Level</th>
      <th>Count</th>
    </tr>
    ${Object.entries(report.metrics.packageComplexity)
        .map(([level, count]) => `<tr><td>${level}</td><td>${count}</td></tr>`)
        .join('')}
  </table>

  <h2>Critical Technical Debt</h2>
  <table>
    <tr>
      <th>Pattern</th>
      <th>Severity</th>
      <th>Occurrences</th>
      <th>Fix</th>
    </tr>
    ${report.details.criticalDebts
        .map((debt) => `<tr>
        <td>${debt.pattern}</td>
        <td class="${debt.severity}">${debt.severity}</td>
        <td>${debt.occurrences}</td>
        <td>${debt.fix}</td>
      </tr>`)
        .join('')}
  </table>

  <div class="recommendations">
    <h2>Recommendations</h2>
    <ul>
      ${report.recommendations.map((rec) => `<li>${rec}</li>`).join('')}
    </ul>
  </div>

  <h2>Estimated Savings</h2>
  <div class="metric">
    <p><strong>Dependencies:</strong> ${report.estimatedSavings.dependencies || 0} packages</p>
    <p><strong>Lines of Code:</strong> ${report.estimatedSavings.linesOfCode || 0}</p>
    <p><strong>Complexity Points:</strong> ${report.estimatedSavings.complexity || 0}</p>
  </div>
</body>
</html>`;
    const outputPath = path.join(outputDir, 'consolidated-report.html');
    await fs.writeFile(outputPath, html);
    console.log(chalk.green(`✓ HTML report saved to ${outputPath}`));
}
async function generateComparisonReport(beforePath, outputDir) {
    try {
        const before = await fs.readJSON(beforePath);
        const afterPath = path.join(outputDir, 'analysis.json');
        const after = await fs.readJSON(afterPath);
        const comparison = {
            before: {
                files: before.totalFiles,
                packages: before.packages?.length || 0,
                techDebt: before.techDebt?.length || 0,
            },
            after: {
                files: after.totalFiles,
                packages: after.packages?.length || 0,
                techDebt: after.techDebt?.length || 0,
            },
            improvement: {
                packages: (before.packages?.length || 0) - (after.packages?.length || 0),
                techDebt: (before.techDebt?.length || 0) - (after.techDebt?.length || 0),
            },
        };
        await fs.writeJSON(path.join(outputDir, 'comparison-report.json'), comparison, { spaces: 2 });
        console.log(chalk.green('\n📊 Comparison Report:'));
        console.log(chalk.white(`  Packages reduced: ${comparison.improvement.packages}`));
        console.log(chalk.white(`  Tech debt patterns reduced: ${comparison.improvement.techDebt}`));
    }
    catch (error) {
        console.error(chalk.yellow('⚠️  Could not generate comparison report:'), error);
    }
}
program.parse();
//# sourceMappingURL=report.js.map