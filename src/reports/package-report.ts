import { PackageDecision, ConversionResult } from '../types.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export class PackageReporter {
  async generateReport(
    decisions: PackageDecision[],
    results: Map<string, ConversionResult>,
    outputPath: string
  ): Promise<void> {
    const report = this.buildReport(decisions, results);

    // Save JSON report
    await fs.writeJSON(path.join(outputPath, 'package-report.json'), report, { spaces: 2 });

    // Save markdown report
    const markdown = this.generateMarkdown(report);
    await fs.writeFile(path.join(outputPath, 'package-report.md'), markdown);

    // Save migration guide
    const migrationGuide = this.generateMigrationGuide(report);
    await fs.writeFile(path.join(outputPath, 'migration-guide.md'), migrationGuide);

    // Print summary
    this.printSummary(report);
  }

  private buildReport(decisions: PackageDecision[], results: Map<string, ConversionResult>) {
    const actionCounts = decisions.reduce(
      (acc, d) => {
        acc[d.action] = (acc[d.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalMetrics = Array.from(results.values()).reduce(
      (acc, r) => {
        acc.packagesEliminated += r.metrics.packagesEliminated;
        acc.packagesInlined += r.metrics.packagesInlined;
        acc.packagesReplaced += r.metrics.packagesReplaced;
        return acc;
      },
      { packagesEliminated: 0, packagesInlined: 0, packagesReplaced: 0 }
    );

    const groupedDecisions = this.groupDecisionsByAction(decisions);

    return {
      summary: {
        totalPackages: decisions.length,
        actionCounts,
        totalMetrics,
        dependencyReduction: actionCounts.eliminate + actionCounts.inline,
      },
      decisions: groupedDecisions,
      replacements: this.extractReplacements(decisions),
      inlineCandidates: this.extractInlineCandidates(decisions),
      timestamp: new Date().toISOString(),
    };
  }

  private groupDecisionsByAction(decisions: PackageDecision[]) {
    return {
      eliminate: decisions.filter(d => d.action === 'eliminate'),
      inline: decisions.filter(d => d.action === 'inline'),
      replace: decisions.filter(d => d.action === 'replace'),
      preserve: decisions.filter(d => d.action === 'preserve'),
    };
  }

  private extractReplacements(decisions: PackageDecision[]) {
    return decisions
      .filter(d => d.action === 'replace' && d.replacement)
      .map(d => ({
        from: d.packageName,
        to: d.replacement!,
        reason: d.reason,
      }));
  }

  private extractInlineCandidates(decisions: PackageDecision[]) {
    return decisions
      .filter(d => d.action === 'inline')
      .map(d => ({
        package: d.packageName,
        utilities: d.extractedUtilities?.map(u => u.name) || [],
        reason: d.reason,
      }));
  }

  private generateMarkdown(report: any): string {
    return `# Package Migration Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Summary

- **Total Packages Analyzed**: ${report.summary.totalPackages}
- **Dependencies Reduced**: ${report.summary.dependencyReduction} packages
- **Packages Eliminated**: ${report.summary.actionCounts.eliminate || 0}
- **Packages Inlined**: ${report.summary.actionCounts.inline || 0}
- **Packages Replaced**: ${report.summary.actionCounts.replace || 0}
- **Packages Preserved**: ${report.summary.actionCounts.preserve || 0}

## Package Decisions

### 🗑️ Eliminated Packages (${report.decisions.eliminate.length})

These packages are completely removed as they're not needed in TypeScript:

${report.decisions.eliminate.map((d: PackageDecision) => `- **${d.packageName}**: ${d.reason}`).join('\n')}

### 📦 Inlined Packages (${report.decisions.inline.length})

These packages have simple utilities that are extracted and inlined:

${report.inlineCandidates
  .map(
    (c: any) => `
- **${c.package}**
  - Reason: ${c.reason}
  - Utilities: ${c.utilities.join(', ') || 'To be determined'}
`
  )
  .join('\n')}

### 🔄 Replaced Packages (${report.decisions.replace.length})

These packages are replaced with modern alternatives:

| Original Package | Replacement | Reason |
|-----------------|-------------|---------|
${report.replacements.map((r: any) => `| ${r.from} | ${r.to || 'Native TypeScript'} | ${r.reason} |`).join('\n')}

### ✅ Preserved Packages (${report.decisions.preserve.length})

These packages are kept in the TypeScript version:

${report.decisions.preserve.map((d: PackageDecision) => `- **${d.packageName}**: ${d.reason}`).join('\n')}

## Dependency Reduction Impact

- **Before**: ${report.summary.totalPackages} packages
- **After**: ${report.summary.actionCounts.preserve || 0} packages + replacements
- **Reduction**: ${Math.round((report.summary.dependencyReduction / report.summary.totalPackages) * 100)}%

## Benefits

1. **Reduced Bundle Size**: Fewer dependencies mean smaller bundle sizes
2. **Improved Maintainability**: Less external code to maintain
3. **Better Type Safety**: Native TypeScript provides better type inference
4. **Faster Build Times**: Fewer packages to process during builds
5. **Reduced Security Risk**: Fewer third-party dependencies to audit
`;
  }

  private generateMigrationGuide(report: any): string {
    return `# Package Migration Guide

This guide helps you migrate from Dart packages to TypeScript equivalents.

## Step-by-Step Migration

### 1. Remove Eliminated Packages

Remove these packages from your package.json:

\`\`\`bash
${report.decisions.eliminate.map((d: PackageDecision) => `npm uninstall ${d.packageName}`).join('\n')}
\`\`\`

### 2. Install Replacements

Install modern alternatives:

\`\`\`bash
${report.replacements
  .filter((r: any) => r.to && !r.to.startsWith('Native'))
  .map((r: any) => `npm install ${r.to}`)
  .join('\n')}
\`\`\`

### 3. Update Imports

#### Eliminated Imports
Remove these import statements entirely:

\`\`\`typescript
${report.decisions.eliminate.map((d: PackageDecision) => `// Remove: import {...} from '${d.packageName}';`).join('\n')}
\`\`\`

#### Replaced Imports
Update these imports:

\`\`\`typescript
${report.replacements
  .map(
    (r: any) => `// Before: import {...} from '${r.from}';
// After:  import {...} from '${r.to}';`
  )
  .join('\n\n')}
\`\`\`

### 4. Use Inlined Utilities

For inlined packages, import from local utilities:

\`\`\`typescript
// Instead of: import { utility } from 'package-name';
// Use:        import { utility } from './utils';
\`\`\`

## Common Pattern Replacements

### Built Value → TypeScript Interfaces

Before (Dart):
\`\`\`dart
abstract class Person implements Built<Person, PersonBuilder> {
  String get name;
  int get age;
}
\`\`\`

After (TypeScript):
\`\`\`typescript
interface Person {
  readonly name: string;
  readonly age: number;
}
\`\`\`

### Over React → React

Before (Dart):
\`\`\`dart
import 'package:over_react/over_react.dart';

@Factory()
UiFactory<MyProps> MyComponent = _$MyComponent;
\`\`\`

After (TypeScript):
\`\`\`typescript
import React from 'react';

interface MyProps {
  // props here
}

const MyComponent: React.FC<MyProps> = (props) => {
  // component logic
};
\`\`\`

### W_Transport → Axios

Before (Dart):
\`\`\`dart
import 'package:w_transport/w_transport.dart';

final response = await HttpRequest.get(Uri.parse(url));
\`\`\`

After (TypeScript):
\`\`\`typescript
import axios from 'axios';

const response = await axios.get(url);
\`\`\`

## Testing After Migration

1. Run TypeScript compiler to check for type errors:
   \`\`\`bash
   npx tsc --noEmit
   \`\`\`

2. Update and run tests:
   \`\`\`bash
   npm test
   \`\`\`

3. Check bundle size:
   \`\`\`bash
   npm run build
   npx webpack-bundle-analyzer dist/stats.json
   \`\`\`

## Rollback Plan

If issues arise, you can partially rollback:

1. Keep a branch with the original Dart code
2. Migrate incrementally, one package at a time
3. Use feature flags to toggle between old and new implementations
4. Maintain compatibility layers during transition

## Support

For package-specific migration questions, consult:
- TypeScript documentation
- Package replacement documentation
- Migration examples in the \`examples/\` directory
`;
  }

  private printSummary(report: any) {
    console.log('\n' + chalk.blue('═'.repeat(60)));
    console.log(chalk.blue.bold('📦 Package Migration Report'));
    console.log(chalk.blue('═'.repeat(60)));

    console.log(chalk.white('\nPackage Actions:'));
    console.log(
      chalk.red(`  🗑️  Eliminate: ${report.summary.actionCounts.eliminate || 0} packages`)
    );
    console.log(chalk.yellow(`  📦 Inline: ${report.summary.actionCounts.inline || 0} packages`));
    console.log(chalk.cyan(`  🔄 Replace: ${report.summary.actionCounts.replace || 0} packages`));
    console.log(
      chalk.green(`  ✅ Preserve: ${report.summary.actionCounts.preserve || 0} packages`)
    );

    const reduction = Math.round(
      (report.summary.dependencyReduction / report.summary.totalPackages) * 100
    );
    console.log(chalk.white('\nDependency Reduction:'));
    console.log(chalk.green(`  📉 ${reduction}% reduction in dependencies`));
    console.log(chalk.green(`  🎯 ${report.summary.dependencyReduction} packages removed/inlined`));

    if (report.replacements.length > 0) {
      console.log(chalk.white('\nKey Replacements:'));
      report.replacements.slice(0, 3).forEach((r: any) => {
        console.log(chalk.cyan(`  ${r.from} → ${r.to || 'Native TypeScript'}`));
      });
    }

    console.log('\n' + chalk.blue('═'.repeat(60)));
    console.log(chalk.green('✨ Full reports saved to:'));
    console.log(chalk.white('   - package-report.md'));
    console.log(chalk.white('   - migration-guide.md'));
    console.log(chalk.blue('═'.repeat(60)) + '\n');
  }
}
