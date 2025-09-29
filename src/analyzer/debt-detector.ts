import { TechDebtPattern, DartFile } from '../types.js';
import { techDebtPatterns } from '../config/package-mappings.js';

export class TechDebtDetector {
  detect(files: DartFile[]): TechDebtPattern[] {
    const debtMap = new Map<string, TechDebtPattern>();

    for (const file of files) {
      this.analyzeFile(file, debtMap);
    }

    return Array.from(debtMap.values()).sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private analyzeFile(file: DartFile, debtMap: Map<string, TechDebtPattern>) {
    const content = file.content;

    // Check for predefined patterns
    for (const pattern of techDebtPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        const key = pattern.name;
        if (!debtMap.has(key)) {
          debtMap.set(key, {
            pattern: pattern.name,
            severity: pattern.severity,
            description: pattern.description,
            fix: pattern.fix,
            occurrences: 0,
          });
        }
        debtMap.get(key)!.occurrences += matches.length;
      }
    }

    // Check for Dart-specific debt patterns
    this.detectDartSpecificDebt(file, debtMap);
  }

  private detectDartSpecificDebt(file: DartFile, debtMap: Map<string, TechDebtPattern>) {
    const content = file.content;

    // Check for excessive widget nesting (Flutter)
    const widgetNesting = this.countNestingLevel(content, 'Widget');
    if (widgetNesting > 5) {
      this.addDebtPattern(debtMap, 'excessive-widget-nesting', {
        pattern: 'excessive-widget-nesting',
        severity: 'high',
        description: 'Deeply nested widget tree',
        fix: 'Extract widgets into separate components',
        occurrences: 1,
      });
    }

    // Check for synchronous I/O operations
    if (/File\(.*\)\.(readAsStringSync|writeAsStringSync|readAsBytesSync)/.test(content)) {
      this.addDebtPattern(debtMap, 'sync-io', {
        pattern: 'sync-io',
        severity: 'high',
        description: 'Synchronous I/O operations',
        fix: 'Use async/await for I/O operations',
        occurrences: 1,
      });
    }

    // Check for missing error handling
    const tryBlocks = (content.match(/\btry\s*{/g) || []).length;
    // const catchBlocks = (content.match(/\bcatch\s*\(/g) || []).length; // Not used yet
    const asyncFunctions = (content.match(/\basync\s+/g) || []).length;

    if (asyncFunctions > 0 && tryBlocks < asyncFunctions / 3) {
      this.addDebtPattern(debtMap, 'missing-error-handling', {
        pattern: 'missing-error-handling',
        severity: 'medium',
        description: 'Insufficient error handling for async operations',
        fix: 'Add try-catch blocks for async operations',
        occurrences: asyncFunctions - tryBlocks,
      });
    }

    // Check for large files
    const lines = content.split('\n').length;
    if (lines > 500) {
      this.addDebtPattern(debtMap, 'large-file', {
        pattern: 'large-file',
        severity: 'medium',
        description: `File has ${lines} lines`,
        fix: 'Split into smaller, focused modules',
        occurrences: 1,
      });
    }

    // Check for duplicate code patterns
    this.detectDuplication(content, debtMap);

    // Check for outdated patterns
    this.detectOutdatedPatterns(content, debtMap);
  }

  private countNestingLevel(content: string, pattern: string): number {
    let maxNesting = 0;
    let currentNesting = 0;
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes(pattern) && line.includes('{')) {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (line.includes('}')) {
        currentNesting = Math.max(0, currentNesting - 1);
      }
    }

    return maxNesting;
  }

  private detectDuplication(content: string, debtMap: Map<string, TechDebtPattern>) {
    const lines = content.split('\n');
    const chunks = new Map<string, number>();
    const chunkSize = 5;

    for (let i = 0; i <= lines.length - chunkSize; i++) {
      const chunk = lines
        .slice(i, i + chunkSize)
        .join('\n')
        .trim();
      if (chunk.length > 50) {
        // Ignore small chunks
        chunks.set(chunk, (chunks.get(chunk) || 0) + 1);
      }
    }

    const duplicates = Array.from(chunks.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      this.addDebtPattern(debtMap, 'code-duplication', {
        pattern: 'code-duplication',
        severity: 'medium',
        description: `Found ${duplicates.length} duplicate code blocks`,
        fix: 'Extract common code into reusable functions',
        occurrences: duplicates.length,
      });
    }
  }

  private detectOutdatedPatterns(content: string, debtMap: Map<string, TechDebtPattern>) {
    const outdatedPatterns = [
      {
        pattern: /\bnew\s+\w+\(/g,
        name: 'unnecessary-new',
        description: 'Unnecessary "new" keyword',
        fix: 'Remove "new" keyword (optional in Dart 2+)',
      },
      {
        pattern: /List<\w+>\(\)/g,
        name: 'old-list-syntax',
        description: 'Old List constructor syntax',
        fix: 'Use [] or <Type>[] instead',
      },
      {
        pattern: /typedef\s+\w+\s*=/g,
        name: 'old-typedef',
        description: 'Old typedef syntax',
        fix: 'Use modern function typedef syntax',
      },
    ];

    for (const { pattern, name, description, fix } of outdatedPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        this.addDebtPattern(debtMap, name, {
          pattern: name,
          severity: 'low',
          description,
          fix,
          occurrences: matches.length,
        });
      }
    }
  }

  private addDebtPattern(
    debtMap: Map<string, TechDebtPattern>,
    key: string,
    pattern: TechDebtPattern
  ) {
    if (debtMap.has(key)) {
      debtMap.get(key)!.occurrences += pattern.occurrences;
    } else {
      debtMap.set(key, pattern);
    }
  }

  calculateTechDebtScore(patterns: TechDebtPattern[]): number {
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

  generateRecommendations(patterns: TechDebtPattern[]): string[] {
    const recommendations: string[] = [];

    // Group by severity
    const bySeverity = patterns.reduce(
      (acc, pattern) => {
        if (!acc[pattern.severity]) acc[pattern.severity] = [];
        acc[pattern.severity].push(pattern);
        return acc;
      },
      {} as Record<string, TechDebtPattern[]>
    );

    if (bySeverity.critical?.length > 0) {
      recommendations.push('🚨 Critical issues found that need immediate attention');
    }

    if (bySeverity.high?.length > 0) {
      recommendations.push('⚠️ High-priority technical debt should be addressed soon');
    }

    const totalOccurrences = patterns.reduce((sum, p) => sum + p.occurrences, 0);
    if (totalOccurrences > 50) {
      recommendations.push(
        '📊 Consider a dedicated refactoring sprint to address accumulated debt'
      );
    }

    // Specific recommendations
    const hasLargeFiles = patterns.some(p => p.pattern === 'large-file');
    if (hasLargeFiles) {
      recommendations.push('📦 Break down large files into smaller, focused modules');
    }

    const hasDuplication = patterns.some(p => p.pattern === 'code-duplication');
    if (hasDuplication) {
      recommendations.push('♻️ Extract common code patterns into shared utilities');
    }

    return recommendations;
  }
}
