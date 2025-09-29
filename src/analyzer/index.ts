export { PackageUsageAnalyzer } from './package-usage.js';
export { TechDebtDetector } from './debt-detector.js';
export { SimplificationAnalyzer } from './simplification.js';

import { PackageUsageAnalyzer } from './package-usage.js';
import { TechDebtDetector } from './debt-detector.js';
import { SimplificationAnalyzer } from './simplification.js';
import { AnalysisResult, DartFile, PackageUsage } from '../types.js';

export class Analyzer {
  private packageAnalyzer = new PackageUsageAnalyzer();
  private debtDetector = new TechDebtDetector();
  private simplificationAnalyzer = new SimplificationAnalyzer();

  async analyze(files: DartFile[]): Promise<AnalysisResult> {
    // Analyze package usage
    const packages = this.packageAnalyzer.analyze(files);

    // Detect technical debt
    const techDebt = this.debtDetector.detect(files);

    // Identify simplification opportunities
    const simplifications = this.simplificationAnalyzer.analyzeSimplificationOpportunities(
      files,
      packages
    );

    // Generate recommendations
    const recommendations = [
      ...this.debtDetector.generateRecommendations(techDebt),
      ...this.generatePackageRecommendations(packages),
      ...this.generateSimplificationRecommendations(simplifications),
    ];

    // Calculate estimated savings
    const estimatedSavings = this.calculateSavings(packages, techDebt, simplifications);

    return {
      projectPath: files[0]?.path.split('/').slice(0, -1).join('/') || '',
      totalFiles: files.length,
      packages,
      techDebt,
      recommendations,
      estimatedSavings,
    };
  }

  private generatePackageRecommendations(packages: PackageUsage[]): string[] {
    const recommendations: string[] = [];

    const trivialPackages = packages.filter(p => p.complexity === 'trivial');
    if (trivialPackages.length > 0) {
      recommendations.push(
        `🗑️ ${trivialPackages.length} packages can be eliminated (not actually used)`
      );
    }

    const simplePackages = packages.filter(p => p.complexity === 'simple');
    if (simplePackages.length > 0) {
      recommendations.push(
        `📦 ${simplePackages.length} packages can be inlined (only using simple utilities)`
      );
    }

    return recommendations;
  }

  private generateSimplificationRecommendations(simplifications: Map<string, any>): string[] {
    const recommendations: string[] = [];

    if (simplifications.size > 0) {
      const totalUtilities = Array.from(simplifications.values()).reduce(
        (sum, utils) => sum + utils.length,
        0
      );

      recommendations.push(
        `🔧 ${totalUtilities} utilities can be extracted and inlined from ${simplifications.size} packages`
      );
    }

    return recommendations;
  }

  private calculateSavings(
    packages: PackageUsage[],
    techDebt: any[],
    _simplifications: Map<string, any>
  ) {
    const eliminatable = packages.filter(p => p.complexity === 'trivial').length;
    const inlinable = packages.filter(p => p.complexity === 'simple').length;

    return {
      dependencies: eliminatable + inlinable,
      linesOfCode: techDebt.reduce((sum, d) => sum + d.occurrences * 10, 0), // Rough estimate
      complexity: packages.reduce((sum, p) => {
        const weights: Record<string, number> = { trivial: 1, simple: 2, moderate: 5, complex: 10 };
        return sum + weights[p.complexity];
      }, 0),
    };
  }
}
