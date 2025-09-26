import { PackageUsage, PackageDecision } from '../types.js';
import { getPackageStrategy } from '../config/package-mappings.js';

export class PackageDecisionMaker {
  async makeDecisions(packages: PackageUsage[]): Promise<PackageDecision[]> {
    const decisions: PackageDecision[] = [];

    for (const pkg of packages) {
      const decision = await this.analyzePackage(pkg);
      decisions.push(decision);
    }

    return this.optimizeDecisions(decisions);
  }

  private async analyzePackage(pkg: PackageUsage): Promise<PackageDecision> {
    const strategy = getPackageStrategy(pkg.packageName);
    const baseDecision: PackageDecision = {
      packageName: pkg.packageName,
      action: strategy.action,
      reason: strategy.reason,
      replacement: strategy.replacement,
    };

    // Refine decision based on actual usage
    if (pkg.complexity === 'trivial' && strategy.action !== 'preserve') {
      baseDecision.action = 'eliminate';
      baseDecision.reason = 'Package not actually used in the code';
    } else if (pkg.complexity === 'simple' && strategy.action === 'preserve') {
      baseDecision.action = 'inline';
      baseDecision.reason = 'Only simple utilities used - can be inlined';
    }

    // Check for cascading dependencies
    if (this.hasCascadingDependencies(pkg)) {
      baseDecision.reason += ' (has cascading dependencies)';
    }

    return baseDecision;
  }

  private hasCascadingDependencies(pkg: PackageUsage): boolean {
    // List of packages known to have heavy dependencies
    const heavyPackages = [
      'built_value',
      'built_collection',
      'over_react',
      'w_transport',
    ];

    return heavyPackages.includes(pkg.packageName);
  }

  private optimizeDecisions(decisions: PackageDecision[]): PackageDecision[] {
    // Group related packages
    const groups = this.groupRelatedPackages(decisions);

    // Optimize each group
    for (const group of groups) {
      this.optimizeGroup(group);
    }

    return decisions;
  }

  private groupRelatedPackages(decisions: PackageDecision[]): PackageDecision[][] {
    const groups: PackageDecision[][] = [];
    const processed = new Set<string>();

    for (const decision of decisions) {
      if (processed.has(decision.packageName)) continue;

      const group = this.findRelatedPackages(decision, decisions);
      groups.push(group);
      group.forEach(d => processed.add(d.packageName));
    }

    return groups;
  }

  private findRelatedPackages(
    decision: PackageDecision,
    allDecisions: PackageDecision[]
  ): PackageDecision[] {
    const related: PackageDecision[] = [decision];
    const prefixes = ['built_', 'over_react', 'w_'];

    for (const prefix of prefixes) {
      if (decision.packageName.startsWith(prefix)) {
        const otherRelated = allDecisions.filter(
          d => d.packageName.startsWith(prefix) && d.packageName !== decision.packageName
        );
        related.push(...otherRelated);
        break;
      }
    }

    return related;
  }

  private optimizeGroup(group: PackageDecision[]): void {
    // If all packages in a group are being eliminated, ensure consistency
    const allEliminated = group.every(d => d.action === 'eliminate');
    if (allEliminated) {
      group.forEach(d => {
        d.reason = 'Entire package family eliminated';
      });
    }

    // If some packages are being replaced, ensure replacements are compatible
    const hasReplacement = group.some(d => d.action === 'replace');
    if (hasReplacement) {
      this.ensureCompatibleReplacements(group);
    }
  }

  private ensureCompatibleReplacements(group: PackageDecision[]): void {
    // Check for known compatible replacements
    const compatibilityMap: Record<string, string[]> = {
      'react': ['react-dom', 'react-redux'],
      '@reduxjs/toolkit': ['react-redux'],
    };

    for (const decision of group) {
      if (decision.replacement) {
        const compatibleWith = compatibilityMap[decision.replacement] || [];

        for (const other of group) {
          if (other.replacement && !compatibleWith.includes(other.replacement)) {
            // Check if replacements are compatible
            console.warn(
              `Warning: ${decision.packageName} -> ${decision.replacement} may not be compatible with ${other.packageName} -> ${other.replacement}`
            );
          }
        }
      }
    }
  }

  generateDecisionSummary(decisions: PackageDecision[]): string {
    const summary = {
      total: decisions.length,
      eliminate: decisions.filter(d => d.action === 'eliminate').length,
      inline: decisions.filter(d => d.action === 'inline').length,
      replace: decisions.filter(d => d.action === 'replace').length,
      preserve: decisions.filter(d => d.action === 'preserve').length,
    };

    return `
Package Decision Summary:
- Total packages: ${summary.total}
- Eliminated: ${summary.eliminate} (${Math.round((summary.eliminate / summary.total) * 100)}%)
- Inlined: ${summary.inline} (${Math.round((summary.inline / summary.total) * 100)}%)
- Replaced: ${summary.replace} (${Math.round((summary.replace / summary.total) * 100)}%)
- Preserved: ${summary.preserve} (${Math.round((summary.preserve / summary.total) * 100)}%)

Estimated dependency reduction: ${summary.eliminate + summary.inline} packages
    `.trim();
  }
}