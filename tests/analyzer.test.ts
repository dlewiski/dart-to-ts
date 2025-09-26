import { describe, it, expect, beforeEach } from 'vitest';
import { PackageUsageAnalyzer } from '../src/analyzer/package-usage';
import { TechDebtDetector } from '../src/analyzer/debt-detector';
import { SimplificationAnalyzer } from '../src/analyzer/simplification';
import { DartFile, PackageUsage } from '../src/types';

describe('PackageUsageAnalyzer', () => {
  let analyzer: PackageUsageAnalyzer;

  beforeEach(() => {
    analyzer = new PackageUsageAnalyzer();
  });

  it('should identify package imports', () => {
    const files: DartFile[] = [
      {
        path: 'lib/main.dart',
        content: `
          import 'package:over_react/over_react.dart';
          import 'package:w_flux/w_flux.dart';
          import 'dart:async';
        `,
        imports: [],
        exports: [],
        parts: [],
      },
    ];

    const usage = analyzer.analyze(files);

    expect(usage).toHaveLength(2);
    expect(usage.map(u => u.packageName)).toContain('over_react');
    expect(usage.map(u => u.packageName)).toContain('w_flux');
  });

  it('should categorize package complexity', () => {
    const files: DartFile[] = [
      {
        path: 'lib/simple.dart',
        content: `
          import 'package:logging/logging.dart' show Logger;

          final logger = Logger('MyApp');
        `,
        imports: [],
        exports: [],
        parts: [],
      },
    ];

    const usage = analyzer.analyze(files);
    const loggingUsage = usage.find(u => u.packageName === 'logging');

    expect(loggingUsage?.complexity).toBe('simple');
  });
});

describe('TechDebtDetector', () => {
  let detector: TechDebtDetector;

  beforeEach(() => {
    detector = new TechDebtDetector();
  });

  it('should detect TODO comments', () => {
    const files: DartFile[] = [
      {
        path: 'lib/todo.dart',
        content: `
          // TODO: Fix this later
          // FIXME: This is broken
          void doSomething() {
            // Regular comment
          }
        `,
        imports: [],
        exports: [],
        parts: [],
      },
    ];

    const patterns = detector.detect(files);
    const todoPattern = patterns.find(p => p.pattern === 'todo-comments');

    expect(todoPattern).toBeDefined();
    expect(todoPattern?.occurrences).toBe(2);
  });

  it('should calculate tech debt score', () => {
    const patterns = [
      { pattern: 'critical-issue', severity: 'critical' as const, occurrences: 2, description: '', fix: '' },
      { pattern: 'high-issue', severity: 'high' as const, occurrences: 3, description: '', fix: '' },
      { pattern: 'low-issue', severity: 'low' as const, occurrences: 10, description: '', fix: '' },
    ];

    const score = detector.calculateTechDebtScore(patterns);

    // critical: 2 * 10 = 20
    // high: 3 * 5 = 15
    // low: 10 * 1 = 10
    // total = 45
    expect(score).toBe(45);
  });
});

describe('SimplificationAnalyzer', () => {
  let analyzer: SimplificationAnalyzer;

  beforeEach(() => {
    analyzer = new SimplificationAnalyzer();
  });

  it('should identify simplification opportunities', () => {
    const files: DartFile[] = [];
    const packageUsage: PackageUsage[] = [
      {
        packageName: 'w_common',
        imports: ['package:w_common/disposable.dart'],
        actuallyUsed: {
          functions: [],
          classes: ['Disposable'],
          constants: [],
          types: [],
        },
        linesOfCode: 100,
        complexity: 'simple',
      },
    ];

    const opportunities = analyzer.analyzeSimplificationOpportunities(files, packageUsage);

    expect(opportunities.size).toBeGreaterThan(0);
    expect(opportunities.has('w_common')).toBe(true);
  });

  it('should suggest modern alternatives', () => {
    const usage: PackageUsage = {
      packageName: 'built_value',
      imports: [],
      actuallyUsed: { functions: [], classes: [], constants: [], types: [] },
      linesOfCode: 0,
      complexity: 'simple',
    };

    const suggestions = analyzer.suggestModernAlternatives(usage);

    expect(suggestions).toContain('Use TypeScript interfaces and classes');
  });
});