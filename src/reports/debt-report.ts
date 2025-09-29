import { TechDebtPattern, ConversionResult } from '../types.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export class TechDebtReporter {
  async generateReport(
    patterns: TechDebtPattern[],
    results: Map<string, ConversionResult>,
    outputPath: string
  ): Promise<void> {
    const report = this.buildReport(patterns, results);

    // Save JSON report
    await fs.writeJSON(path.join(outputPath, 'tech-debt-report.json'), report, { spaces: 2 });

    // Save markdown report
    const markdown = this.generateMarkdown(report);
    await fs.writeFile(path.join(outputPath, 'tech-debt-report.md'), markdown);

    // Print summary to console
    this.printSummary(report);
  }

  private buildReport(patterns: TechDebtPattern[], results: Map<string, ConversionResult>) {
    const totalFiles = results.size;
    const successfulConversions = Array.from(results.values()).filter(r => r.success).length;
    const totalDebtReduction = Array.from(results.values()).reduce(
      (sum, r) => sum + r.metrics.techDebtReduction,
      0
    );

    const severityCounts = patterns.reduce(
      (acc, p) => {
        acc[p.severity] = (acc[p.severity] || 0) + p.occurrences;
        return acc;
      },
      {} as Record<string, number>
    );

    const topPatterns = patterns.sort((a, b) => b.occurrences - a.occurrences).slice(0, 10);

    return {
      summary: {
        totalFiles,
        successfulConversions,
        conversionRate: (successfulConversions / totalFiles) * 100,
        totalDebtReduction,
        patternsFound: patterns.length,
        totalOccurrences: patterns.reduce((sum, p) => sum + p.occurrences, 0),
      },
      severityCounts,
      topPatterns,
      patterns,
      timestamp: new Date().toISOString(),
    };
  }

  private generateMarkdown(report: any): string {
    return `# Technical Debt Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Summary

- **Files Processed**: ${report.summary.totalFiles}
- **Successful Conversions**: ${report.summary.successfulConversions} (${report.summary.conversionRate.toFixed(1)}%)
- **Tech Debt Reduction Score**: ${report.summary.totalDebtReduction}
- **Patterns Found**: ${report.summary.patternsFound}
- **Total Occurrences**: ${report.summary.totalOccurrences}

## Severity Breakdown

| Severity | Occurrences |
|----------|------------|
| Critical | ${report.severityCounts.critical || 0} |
| High     | ${report.severityCounts.high || 0} |
| Medium   | ${report.severityCounts.medium || 0} |
| Low      | ${report.severityCounts.low || 0} |

## Top 10 Technical Debt Patterns

${report.topPatterns
  .map(
    (p: TechDebtPattern, i: number) => `
### ${i + 1}. ${p.pattern}

- **Severity**: ${p.severity}
- **Occurrences**: ${p.occurrences}
- **Description**: ${p.description}
- **Recommended Fix**: ${p.fix}
`
  )
  .join('\n')}

## Recommendations

1. **Address Critical Issues First**: Focus on patterns marked as critical severity
2. **Automate Fixes**: Many patterns can be fixed with automated tools
3. **Establish Coding Standards**: Prevent new debt from accumulating
4. **Regular Reviews**: Schedule periodic tech debt assessments
5. **Incremental Improvement**: Fix issues as you touch the code

## Next Steps

1. Review and prioritize the identified patterns
2. Create tickets for high-severity issues
3. Update linting rules to catch these patterns
4. Consider automated refactoring tools
5. Track debt reduction progress over time
`;
  }

  private printSummary(report: any) {
    console.log('\n' + chalk.cyan('═'.repeat(60)));
    console.log(chalk.cyan.bold('📊 Technical Debt Report Summary'));
    console.log(chalk.cyan('═'.repeat(60)));

    console.log(chalk.white('\nConversion Results:'));
    console.log(
      chalk.green(
        `  ✅ Successful: ${report.summary.successfulConversions}/${report.summary.totalFiles}`
      )
    );
    console.log(chalk.yellow(`  📈 Conversion Rate: ${report.summary.conversionRate.toFixed(1)}%`));
    console.log(chalk.blue(`  🎯 Debt Reduction: ${report.summary.totalDebtReduction} points`));

    console.log(chalk.white('\nTechnical Debt Found:'));

    if (report.severityCounts.critical) {
      console.log(chalk.red(`  🚨 Critical: ${report.severityCounts.critical} issues`));
    }
    if (report.severityCounts.high) {
      console.log(chalk.magenta(`  ⚠️  High: ${report.severityCounts.high} issues`));
    }
    if (report.severityCounts.medium) {
      console.log(chalk.yellow(`  ⚡ Medium: ${report.severityCounts.medium} issues`));
    }
    if (report.severityCounts.low) {
      console.log(chalk.gray(`  💡 Low: ${report.severityCounts.low} issues`));
    }

    console.log(chalk.white('\nTop Issues to Address:'));
    report.topPatterns.slice(0, 3).forEach((p: TechDebtPattern, i: number) => {
      const severityColor =
        {
          critical: chalk.red,
          high: chalk.magenta,
          medium: chalk.yellow,
          low: chalk.gray,
        }[p.severity] || chalk.white;

      console.log(severityColor(`  ${i + 1}. ${p.pattern} (${p.occurrences} occurrences)`));
    });

    console.log('\n' + chalk.cyan('═'.repeat(60)));
    console.log(chalk.green('✨ Full report saved to tech-debt-report.md'));
    console.log(chalk.cyan('═'.repeat(60)) + '\n');
  }

  async generateComparisonReport(
    before: TechDebtPattern[],
    after: TechDebtPattern[],
    outputPath: string
  ): Promise<void> {
    const beforeScore = this.calculateTotalScore(before);
    const afterScore = this.calculateTotalScore(after);
    const improvement = ((beforeScore - afterScore) / beforeScore) * 100;

    const report = {
      before: {
        patterns: before.length,
        totalScore: beforeScore,
        occurrences: before.reduce((sum, p) => sum + p.occurrences, 0),
      },
      after: {
        patterns: after.length,
        totalScore: afterScore,
        occurrences: after.reduce((sum, p) => sum + p.occurrences, 0),
      },
      improvement: {
        scoreReduction: beforeScore - afterScore,
        percentageImprovement: improvement,
        patternsEliminated: before.length - after.length,
      },
      timestamp: new Date().toISOString(),
    };

    await fs.writeJSON(path.join(outputPath, 'debt-comparison.json'), report, { spaces: 2 });

    console.log(chalk.green('\n📊 Technical Debt Improvement:'));
    console.log(chalk.white(`  Before: ${beforeScore} points`));
    console.log(chalk.white(`  After: ${afterScore} points`));
    console.log(chalk.green(`  Improvement: ${improvement.toFixed(1)}%`));
  }

  private calculateTotalScore(patterns: TechDebtPattern[]): number {
    const weights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1,
    };

    return patterns.reduce((score, pattern) => {
      return score + weights[pattern.severity] * pattern.occurrences;
    }, 0);
  }
}
