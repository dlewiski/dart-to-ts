import { DartFile, PackageUsage, ExtractedUtility } from '../types.js';
import { getPackageStrategy } from '../config/package-mappings.js';

export class SimplificationAnalyzer {
  analyzeSimplificationOpportunities(
    files: DartFile[],
    packageUsage: PackageUsage[]
  ): Map<string, ExtractedUtility[]> {
    const opportunities = new Map<string, ExtractedUtility[]>();

    for (const usage of packageUsage) {
      const strategy = getPackageStrategy(usage.packageName);

      if (strategy.action === 'inline' && usage.complexity !== 'complex') {
        const utilities = this.identifyExtractableUtilities(usage, files);
        if (utilities.length > 0) {
          opportunities.set(usage.packageName, utilities);
        }
      }
    }

    return opportunities;
  }

  private identifyExtractableUtilities(
    usage: PackageUsage,
    files: DartFile[]
  ): ExtractedUtility[] {
    const utilities: ExtractedUtility[] = [];

    // Extract simple functions
    for (const func of usage.actuallyUsed.functions) {
      if (this.isSimpleFunction(func, files)) {
        utilities.push({
          name: func,
          type: 'function',
          code: this.generateTypeScriptFunction(func),
          dependencies: [],
        });
      }
    }

    // Extract simple classes
    for (const cls of usage.actuallyUsed.classes) {
      if (this.isSimpleClass(cls, files)) {
        utilities.push({
          name: cls,
          type: 'class',
          code: this.generateTypeScriptClass(cls),
          dependencies: [],
        });
      }
    }

    // Extract constants
    for (const constant of usage.actuallyUsed.constants) {
      utilities.push({
        name: constant,
        type: 'constant',
        code: `export const ${constant} = /* extracted value */;`,
        dependencies: [],
      });
    }

    return utilities;
  }

  private isSimpleFunction(funcName: string, files: DartFile[]): boolean {
    // Common simple utility functions that can be easily extracted
    const simplePatterns = [
      'dispose', 'validate', 'format', 'parse', 'convert',
      'isEmpty', 'isNotEmpty', 'contains', 'toString',
    ];

    return simplePatterns.some(pattern =>
      funcName.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private isSimpleClass(className: string, files: DartFile[]): boolean {
    // Common simple classes that can be extracted
    const simpleClasses = [
      'Disposable', 'Observable', 'Manager', 'Handler',
      'Validator', 'Formatter', 'Parser', 'Builder',
    ];

    return simpleClasses.some(pattern =>
      className.includes(pattern)
    );
  }

  private generateTypeScriptFunction(funcName: string): string {
    // Generate a TypeScript equivalent based on common patterns
    const templates: Record<string, string> = {
      dispose: `export function ${funcName}(resource: any): void {
  if (resource && typeof resource.dispose === 'function') {
    resource.dispose();
  }
}`,
      validate: `export function ${funcName}<T>(value: T, predicate: (val: T) => boolean): boolean {
  return predicate(value);
}`,
      format: `export function ${funcName}(value: any): string {
  return String(value);
}`,
      parse: `export function ${funcName}<T>(value: string): T {
  return JSON.parse(value) as T;
}`,
    };

    // Find matching template
    for (const [pattern, template] of Object.entries(templates)) {
      if (funcName.toLowerCase().includes(pattern)) {
        return template.replace(new RegExp(pattern, 'gi'), funcName);
      }
    }

    // Default template
    return `export function ${funcName}(...args: any[]): any {
  // TODO: Implement ${funcName}
  throw new Error('Not implemented');
}`;
  }

  private generateTypeScriptClass(className: string): string {
    // Generate TypeScript class based on common patterns
    if (className.includes('Disposable')) {
      return `export class ${className} {
  private disposed = false;
  private disposables: Array<() => void> = [];

  protected registerDisposable(dispose: () => void): void {
    this.disposables.push(dispose);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposables.forEach(d => d());
    this.disposables = [];
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }
}`;
    }

    if (className.includes('Manager')) {
      return `export class ${className}<T> {
  private items = new Map<string, T>();

  add(key: string, item: T): void {
    this.items.set(key, item);
  }

  get(key: string): T | undefined {
    return this.items.get(key);
  }

  remove(key: string): boolean {
    return this.items.delete(key);
  }

  clear(): void {
    this.items.clear();
  }

  get size(): number {
    return this.items.size;
  }
}`;
    }

    // Default class template
    return `export class ${className} {
  constructor() {
    // TODO: Implement constructor
  }

  // TODO: Implement methods
}`;
  }

  identifyRedundantCode(files: DartFile[]): Map<string, string[]> {
    const redundancies = new Map<string, string[]>();

    for (const file of files) {
      const issues: string[] = [];

      // Check for getter/setter that just return/set a field
      const trivialAccessors = file.content.match(
        /get\s+(\w+)\s*=>\s*_\1;|set\s+(\w+)\(.*?\)\s*{\s*_\2\s*=.*?;\s*}/g
      );
      if (trivialAccessors) {
        issues.push(`${trivialAccessors.length} trivial getters/setters can be replaced with public fields`);
      }

      // Check for unnecessary type annotations
      const obviousTypes = file.content.match(
        /String\s+\w+\s*=\s*['"]|int\s+\w+\s*=\s*\d+|bool\s+\w+\s*=\s*(true|false)/g
      );
      if (obviousTypes) {
        issues.push(`${obviousTypes.length} obvious type annotations can be inferred`);
      }

      // Check for verbose null checks
      const verboseNullChecks = file.content.match(
        /if\s*\(\s*\w+\s*!=\s*null\s*\)/g
      );
      if (verboseNullChecks) {
        issues.push(`${verboseNullChecks.length} verbose null checks can use null-aware operators`);
      }

      if (issues.length > 0) {
        redundancies.set(file.path, issues);
      }
    }

    return redundancies;
  }

  suggestModernAlternatives(usage: PackageUsage): string[] {
    const suggestions: string[] = [];

    const modernAlternatives: Record<string, string[]> = {
      'built_value': [
        'Use TypeScript interfaces and classes',
        'Leverage TypeScript\'s structural typing',
        'Use Object.freeze() for immutability',
      ],
      'built_collection': [
        'Use native JavaScript arrays and maps',
        'Consider Immutable.js if immutability is critical',
        'Use TypeScript ReadonlyArray<T> and ReadonlyMap<K, V>',
      ],
      'redux': [
        'Migrate to @reduxjs/toolkit',
        'Use createSlice for reducers',
        'Leverage RTK Query for data fetching',
      ],
      'w_transport': [
        'Replace with axios or fetch API',
        'Use interceptors for common headers',
        'Implement retry logic with axios-retry',
      ],
    };

    if (modernAlternatives[usage.packageName]) {
      suggestions.push(...modernAlternatives[usage.packageName]);
    }

    return suggestions;
  }
}