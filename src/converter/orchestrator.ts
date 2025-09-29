import { DartFile, ConversionConfig, ConversionResult, PackageDecision } from '../types.js';
import { Inliner } from './inliner.js';
import { Modernizer } from './modernizer.js';
// import { Analyzer } from '../analyzer/index.js'; // TODO: Implement project-wide analysis
import { IntelligenceService } from '../intelligence/index.js';
import pLimit from 'p-limit';

export class ConversionOrchestrator {
  // private analyzer = new Analyzer(); // TODO: Implement project-wide analysis
  private inliner = new Inliner();
  private modernizer = new Modernizer();
  private intelligence?: IntelligenceService;

  constructor(config: ConversionConfig) {
    if (config.useLLM) {
      this.intelligence = new IntelligenceService();
    }
  }

  async convertProject(
    files: DartFile[],
    config: ConversionConfig
  ): Promise<Map<string, ConversionResult>> {
    // Analyze the project first
    // const analysis = await this.analyzer.analyze(files);

    // Create a concurrency limiter
    const limit = pLimit(config.maxConcurrency);

    // Convert files in parallel with concurrency limit
    const conversionPromises = files.map(file => limit(() => this.convertFile(file, config)));

    const results = await Promise.all(conversionPromises);

    // Create a map of results
    const resultMap = new Map<string, ConversionResult>();
    for (const result of results) {
      if (result) {
        resultMap.set(result.metrics.file, result);
      }
    }

    return resultMap;
  }

  async convertFile(
    file: DartFile,
    config: ConversionConfig,
    _analysis?: any
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    const metrics = {
      file: file.path,
      timeMs: 0,
      cost: 0,
      packagesEliminated: 0,
      packagesInlined: 0,
      packagesReplaced: 0,
      locOriginal: file.content.split('\n').length,
      locGenerated: 0,
      techDebtScore: 0,
      techDebtReduction: 0,
    };

    try {
      // Step 1: Basic Dart to TypeScript conversion
      let typescript = await this.basicConversion(file);

      // Step 2: Process imports and dependencies
      const { code, imports, decisions } = await this.processImports(typescript, file, config);
      typescript = code;

      // Step 3: Inline utilities if aggressive mode
      if (config.aggressive) {
        const inlined = await this.inliner.inline(typescript, decisions);
        typescript = inlined.code;
        metrics.packagesInlined = inlined.inlinedCount;
      }

      // Step 4: Modernize the code
      if (config.modernize) {
        const modernized = await this.modernizer.modernize(typescript);
        typescript = modernized.code;
        metrics.techDebtReduction = modernized.debtReduction;
      }

      // Step 5: Use LLM for final polish if enabled
      if (config.useLLM && this.intelligence) {
        const enhanced = await this.intelligence.enhanceCode(typescript, file.path);
        typescript = enhanced.content;
        metrics.cost = enhanced.usage?.totalTokens || 0;
      }

      metrics.locGenerated = typescript.split('\n').length;
      metrics.timeMs = Date.now() - startTime;

      // Count package actions
      for (const decision of decisions) {
        switch (decision.action) {
          case 'eliminate':
            metrics.packagesEliminated++;
            break;
          case 'replace':
            metrics.packagesReplaced++;
            break;
        }
      }

      return {
        success: true,
        typescript,
        imports,
        metrics,
        decisions,
      };
    } catch (error) {
      return {
        success: false,
        typescript: '',
        imports: [],
        metrics,
        decisions: [],
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private async basicConversion(file: DartFile): Promise<string> {
    let typescript = file.content;

    // Replace basic Dart syntax with TypeScript
    const replacements = [
      // Remove Dart-specific directives first
      { from: /^part\s+['"][^'"]+['"];?\s*$/gm, to: '' },
      { from: /^part of\s+['"][^'"]+['"];?\s*$/gm, to: '' },

      // Remove Dart decorators
      { from: /@Factory\(\)\s*/g, to: '' },
      { from: /@Props\(\)\s*/g, to: '' },
      { from: /@Component\(\)\s*/g, to: '' },
      { from: /@State\(\)\s*/g, to: '' },
      { from: /@override\s*/g, to: '' },

      // Types
      { from: /\bint\b/g, to: 'number' },
      { from: /\bdouble\b/g, to: 'number' },
      { from: /\bnum\b/g, to: 'number' },
      { from: /\bbool\b/g, to: 'boolean' },
      { from: /\bString\b/g, to: 'string' },
      { from: /\bvoid\b/g, to: 'void' },
      { from: /\bdynamic\b/g, to: 'any' },
      { from: /\bDateTime\b/g, to: 'Date' },

      // Collections - handle BuiltList/BuiltCollection properly
      { from: /BuiltList<(.+?)>/g, to: 'Array<$1>' },
      { from: /BuiltArray<(.+?)>/g, to: 'Array<$1>' },
      { from: /BuiltMap<(.+?),\s*(.+?)>/g, to: 'Map<$1, $2>' },
      { from: /BuiltSet<(.+?)>/g, to: 'Set<$1>' },
      { from: /List<(.+?)>/g, to: 'Array<$1>' },
      { from: /Map<(.+?),\s*(.+?)>/g, to: 'Map<$1, $2>' },
      { from: /Set<(.+?)>/g, to: 'Set<$1>' },

      // Built Value patterns
      { from: /\bBuilt<(\w+),\s*(\w+)Builder>/g, to: '$1' },
      { from: /\bimplements\s+Built<(\w+),\s*\w+Builder>/g, to: '' },

      // Remove factory constructors and private constructors
      { from: /^\s*factory\s+\w+\([^\)]*\)\s*=\s*[^;]+;?\s*$/gm, to: '' },
      { from: /^\s*\w+\._\(\);?\s*$/gm, to: '' },
      { from: /\bfactory\s+\w+\([^\)]*\)\s*=\s*[^;]+;?/g, to: '' },

      // Convert abstract class with Built to interface
      { from: /abstract\s+class\s+(\w+)\s+implements\s+\w+\s*{/g, to: 'interface $1 {' },
      { from: /abstract\s+class\s+(\w+)\s*{/g, to: 'interface $1 {' },

      // Convert getter syntax - must handle BuiltList/Array pattern first
      { from: /(Array|BuiltList)<([^>]+)>\s+get\s+(\w+);/g, to: 'readonly $3: Array<$2>;' },
      { from: /(\w+)\s+get\s+(\w+);/g, to: 'readonly $2: $1;' },
      { from: /(\w+)\s+get\s+(\w+)\s*=>/g, to: 'get $2(): $1 =>' },

      // Async
      { from: /Future<(.+?)>/g, to: 'Promise<$1>' },
      { from: /Stream<(.+?)>/g, to: 'Observable<$1>' },
      { from: /\basync\*/g, to: 'async function*' },
      // Fix async function syntax: remove 'async' keyword that appears after return type
      { from: /(\))\s+async\s+{/g, to: '$1 {' },

      // Functions
      { from: /\bfinal\b/g, to: 'const' },
      { from: /\bvar\b/g, to: 'let' },

      // Classes
      {
        from: /class\s+(\w+)\s+extends\s+(\w+)\s+with\s+(.+?)\s*{/g,
        to: 'class $1 extends $2 /* mixins: $3 */ {',
      },

      // Null safety - improved handling
      { from: /(\w+)\s*\|\s*null\s*\|\s*null/g, to: '$1 | null' }, // Fix double null
      { from: /(\w+)\?(?!\s*[:.])/g, to: '$1 | null' },
      { from: /(\w+)!(?!\s*[=:])/g, to: '$1' },

      // String interpolation - improved
      { from: /'([^']*)\$(\w+)([^']*)'/g, to: '`$1${$2}$3`' },
      { from: /"([^"]*)\$(\w+)([^"]*)"/g, to: '`$1${$2}$3`' },
      { from: /'([^']*)\$\{([^}]+)\}([^']*)'/g, to: '`$1${$2}$3`' },
      { from: /"([^"]*)\$\{([^}]+)\}([^"]*)"/g, to: '`$1${$2}$3`' },

      // Constructors
      { from: /(\w+)\(this\.(\w+)\)/g, to: 'constructor($2: any) { this.$2 = $2; }' },

      // Remove unnecessary keywords
      { from: /\bnew\s+/g, to: '' },
    ];

    for (const { from, to } of replacements) {
      typescript = typescript.replace(from, to);
    }

    return typescript;
  }

  private async processImports(
    typescript: string,
    _file: DartFile,
    config: ConversionConfig
  ): Promise<{ code: string; imports: string[]; decisions: PackageDecision[] }> {
    const imports: string[] = [];
    const decisions: PackageDecision[] = [];
    let code = typescript;

    // Process each import
    const importRegex = /import\s+['"]([^'"]+)['"]/g;
    const importMatches = [...typescript.matchAll(importRegex)];

    for (const match of importMatches) {
      const importPath = match[1];
      const decision = await this.processImportPath(importPath, config);

      decisions.push(decision);

      switch (decision.action) {
        case 'eliminate':
          // Remove the import entirely
          code = code.replace(match[0], '');
          break;

        case 'replace':
          // Replace with modern alternative
          if (decision.replacement) {
            const moduleName = decision.replacement.split('/').pop() || decision.replacement;
            const importName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
            const newImport = `import ${importName} from '${decision.replacement}'`;
            code = code.replace(match[0], newImport);
            imports.push(decision.replacement);
          } else {
            code = code.replace(match[0], '');
          }
          break;

        case 'inline':
          // Will be handled by inliner (remove import line entirely)
          code = code.replace(match[0], '');
          break;

        case 'preserve': {
          // Keep the import but convert to TypeScript style
          const tsImport = this.convertToTypeScriptImport(importPath);
          code = code.replace(match[0], tsImport);
          imports.push(this.extractModuleName(importPath));
          break;
        }
      }
    }

    // Clean up any leftover orphaned semicolons or broken imports
    code = code.replace(/;\s*;\s*;/g, ';'); // Triple semicolons
    code = code.replace(/;\s*;/g, ';'); // Double semicolons
    code = code.replace(/^import\s+`[^`]+`;?\s*$/gm, ''); // Remove malformed imports
    code = code.replace(/^\s*;\s*$/gm, ''); // Remove lines with only semicolons

    // Remove empty lines (more than 2 consecutive)
    code = code.replace(/\n\n\n+/g, '\n\n');

    return { code, imports, decisions };
  }

  private async processImportPath(
    importPath: string,
    _config: ConversionConfig
  ): Promise<PackageDecision> {
    // Handle dart: imports
    if (importPath.startsWith('dart:')) {
      return {
        packageName: importPath,
        action: 'eliminate',
        reason: 'Dart SDK import not needed in TypeScript',
      };
    }

    // Handle package: imports
    if (importPath.startsWith('package:')) {
      const packageName = importPath.split('/')[0].substring(8);
      const { getPackageStrategy } = await import('../config/package-mappings.js');
      const strategy = getPackageStrategy(packageName);

      return {
        packageName,
        action: strategy.action,
        reason: strategy.reason,
        replacement: strategy.replacement,
      };
    }

    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return {
        packageName: importPath,
        action: 'preserve',
        reason: 'Relative import',
      };
    }

    return {
      packageName: importPath,
      action: 'preserve',
      reason: 'Unknown import type',
    };
  }

  private convertToTypeScriptImport(importPath: string): string {
    // Convert Dart import to TypeScript import
    if (importPath.endsWith('.dart')) {
      importPath = importPath.slice(0, -5) + '.js';
    }

    return `import * from '${importPath}'`;
  }

  private extractModuleName(importPath: string): string {
    if (importPath.startsWith('package:')) {
      return importPath.split('/')[0].substring(8);
    }
    return importPath;
  }
}
