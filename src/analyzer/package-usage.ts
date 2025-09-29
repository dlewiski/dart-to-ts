import { DartFile, PackageUsage } from '../types.js';

export class PackageUsageAnalyzer {
  analyze(files: DartFile[]): PackageUsage[] {
    const usageMap = new Map<string, PackageUsage>();

    for (const file of files) {
      this.analyzeFile(file, usageMap);
    }

    return Array.from(usageMap.values());
  }

  private analyzeFile(file: DartFile, usageMap: Map<string, PackageUsage>) {
    const imports = this.extractImports(file.content);

    for (const imp of imports) {
      const packageName = this.getPackageName(imp);
      if (!packageName) continue;

      if (!usageMap.has(packageName)) {
        usageMap.set(packageName, {
          packageName,
          imports: [],
          actuallyUsed: {
            functions: [],
            classes: [],
            constants: [],
            types: [],
          },
          linesOfCode: 0,
          complexity: 'simple',
        });
      }

      const usage = usageMap.get(packageName)!;
      if (!usage.imports.includes(imp)) {
        usage.imports.push(imp);
      }

      // Analyze what's actually used from this import
      this.analyzeUsageInFile(file, imp, usage);
    }
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+['"]([^'"]+)['"]/g;
    const packageImportRegex = /import\s+['"]package:([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    content.replace(packageImportRegex, (_, path) => {
      imports.push(`package:${path}`);
      return '';
    });

    return imports;
  }

  private getPackageName(importPath: string): string | null {
    if (importPath.startsWith('package:')) {
      const parts = importPath.substring(8).split('/');
      return parts[0];
    }

    if (importPath.startsWith('dart:')) {
      return null; // Dart SDK imports
    }

    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return null; // Relative imports
    }

    return null;
  }

  private analyzeUsageInFile(file: DartFile, importPath: string, usage: PackageUsage) {
    const content = file.content;

    // Extract imported symbols
    const showRegex = new RegExp(
      `import\\s+['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s+show\\s+([^;]+);`
    );
    const showMatch = content.match(showRegex);

    if (showMatch) {
      const symbols = showMatch[1].split(',').map(s => s.trim());
      this.categorizeSymbols(symbols, content, usage);
    } else {
      // If no 'show' clause, try to detect usage patterns
      this.detectUsagePatterns(content, usage);
    }

    // Calculate complexity based on usage
    usage.complexity = this.calculateComplexity(usage);
  }

  private categorizeSymbols(symbols: string[], content: string, usage: PackageUsage) {
    for (const symbol of symbols) {
      // Check if it's a class (capitalized)
      if (/^[A-Z]/.test(symbol)) {
        // Check if it's used as a type or instantiated
        if (
          new RegExp(`\\b${symbol}\\s*<`).test(content) ||
          new RegExp(`:\\s*${symbol}\\b`).test(content)
        ) {
          if (!usage.actuallyUsed.types.includes(symbol)) {
            usage.actuallyUsed.types.push(symbol);
          }
        } else if (
          new RegExp(`new\\s+${symbol}\\b`).test(content) ||
          new RegExp(`${symbol}\\(`).test(content)
        ) {
          if (!usage.actuallyUsed.classes.includes(symbol)) {
            usage.actuallyUsed.classes.push(symbol);
          }
        }
      } else if (/^[A-Z_]+$/.test(symbol)) {
        // All caps - likely a constant
        if (!usage.actuallyUsed.constants.includes(symbol)) {
          usage.actuallyUsed.constants.push(symbol);
        }
      } else {
        // Lowercase - likely a function
        if (new RegExp(`${symbol}\\s*\\(`).test(content)) {
          if (!usage.actuallyUsed.functions.includes(symbol)) {
            usage.actuallyUsed.functions.push(symbol);
          }
        }
      }
    }
  }

  private detectUsagePatterns(content: string, usage: PackageUsage) {
    // Look for common patterns from known packages
    const patterns: Record<string, string[]> = {
      over_react: ['Dom.', 'uiFunction', 'uiForwardRef', 'Props', 'State'],
      built_value: ['Built', 'Builder', 'Serializer'],
      w_common: ['Disposable', 'DisposableManager'],
    };

    if (patterns[usage.packageName]) {
      for (const pattern of patterns[usage.packageName]) {
        if (content.includes(pattern)) {
          usage.actuallyUsed.classes.push(pattern);
        }
      }
    }
  }

  private calculateComplexity(usage: PackageUsage): PackageUsage['complexity'] {
    const totalUsed =
      usage.actuallyUsed.functions.length +
      usage.actuallyUsed.classes.length +
      usage.actuallyUsed.constants.length +
      usage.actuallyUsed.types.length;

    if (totalUsed === 0) return 'trivial';
    if (totalUsed <= 3) return 'simple';
    if (totalUsed <= 10) return 'moderate';
    return 'complex';
  }

  getUnusedImports(files: DartFile[]): Map<string, string[]> {
    const unusedByFile = new Map<string, string[]>();

    for (const file of files) {
      const imports = this.extractImports(file.content);
      const unused: string[] = [];

      for (const imp of imports) {
        const packageName = this.getPackageName(imp);
        if (!packageName) continue;

        // Check if any symbols from this import are used
        const showRegex = new RegExp(
          `import\\s+['"]${imp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s+show\\s+([^;]+);`
        );
        const showMatch = file.content.match(showRegex);

        if (showMatch) {
          const symbols = showMatch[1].split(',').map(s => s.trim());
          const isUsed = symbols.some(symbol => {
            // Check if symbol appears in the file (excluding the import line)
            const importLine = file.content.match(new RegExp(`.*import.*${imp}.*`))?.[0] || '';
            const contentWithoutImport = file.content.replace(importLine, '');
            return new RegExp(`\\b${symbol}\\b`).test(contentWithoutImport);
          });

          if (!isUsed) {
            unused.push(imp);
          }
        }
      }

      if (unused.length > 0) {
        unusedByFile.set(file.path, unused);
      }
    }

    return unusedByFile;
  }
}
