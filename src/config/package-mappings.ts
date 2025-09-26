export interface PackageStrategy {
  action: 'eliminate' | 'inline' | 'replace' | 'preserve';
  replacement?: string;
  reason: string;
  extractPatterns?: string[];
}

export const packageStrategies: Record<string, any> = {
  // Packages to eliminate completely (build tools, dev dependencies)
  eliminate: {
    'dart_dev': true,
    'dart_dev_workiva': true,
    'over_react_format': true,
    'dependency_validator': true,
    'workiva_analysis_options': true,
    'w_common_tools': true,
    'build_runner': true,
    'build_web_compilers': true,
    'built_value_generator': true,
    'over_react_test': true,
    'test_html_builder': true,
    'dart_to_js_script_rewriter': true,
  },

  // Packages to inline (extract only what's used)
  inline: {
    'w_common': {
      extractPatterns: ['Disposable', 'DisposableManager', 'JsonSerializable']
    },
    'w_flux': {
      extractPatterns: ['Store', 'Actions', 'FluxComponent']
    },
    'fluri': {
      extractPatterns: ['Fluri', 'FluriQuery']
    },
    'w_module': {
      extractPatterns: ['Module', 'LifecycleModule']
    },
    'w_service': {
      extractPatterns: ['ServiceManager', 'ServiceClient']
    }
  },

  // Direct replacements with modern alternatives
  replace: {
    'over_react': {
      replacement: 'react',
      reason: 'Use native React with TypeScript'
    },
    'over_react_redux': {
      replacement: 'react-redux',
      reason: 'Use standard React Redux bindings'
    },
    'redux': {
      replacement: '@reduxjs/toolkit',
      reason: 'Modern Redux with TypeScript support'
    },
    'built_value': {
      replacement: null,
      reason: 'Use plain TypeScript interfaces and classes'
    },
    'built_collection': {
      replacement: null,
      reason: 'Use native JavaScript arrays and maps'
    },
    'w_transport': {
      replacement: 'axios',
      reason: 'Modern HTTP client with TypeScript support'
    },
    'uuid': {
      replacement: 'uuid',
      reason: 'Standard UUID library for JavaScript'
    },
    'logging': {
      replacement: 'pino',
      reason: 'Fast and modern logging library'
    },
    'meta': {
      replacement: null,
      reason: 'Use TypeScript decorators and metadata'
    },
    'quiver': {
      replacement: null,
      reason: 'Use native JavaScript utilities or lodash'
    }
  },

  // Complex packages that need careful handling
  preserve: {
    'unify_ui': {
      reason: 'Internal UI library - needs custom mapping'
    },
    'opentelemetry': {
      reason: 'Keep observability tooling'
    }
  }
};

export function getPackageStrategy(packageName: string): PackageStrategy {
  // Check for exact match in elimination list
  if ((packageStrategies.eliminate as any)[packageName]) {
    return {
      action: 'eliminate',
      reason: 'Development/build tool not needed in TypeScript'
    };
  }

  // Check for inline packages
  if ((packageStrategies.inline as any)[packageName]) {
    const config = (packageStrategies.inline as any)[packageName];
    return {
      action: 'inline',
      reason: 'Extract only used functions to reduce dependencies',
      extractPatterns: config.extractPatterns || []
    };
  }

  // Check for replaceable packages
  if ((packageStrategies.replace as any)[packageName]) {
    const config = (packageStrategies.replace as any)[packageName];
    return {
      action: 'replace',
      replacement: config.replacement,
      reason: config.reason
    };
  }

  // Check for packages to preserve
  if ((packageStrategies.preserve as any)[packageName]) {
    const config = (packageStrategies.preserve as any)[packageName];
    return {
      action: 'preserve',
      reason: config.reason
    };
  }

  // Default strategy for unknown packages
  return {
    action: 'preserve',
    reason: 'Unknown package - needs manual review'
  };
}

export const dartToTsTypeMap: Record<string, string> = {
  'int': 'number',
  'double': 'number',
  'num': 'number',
  'bool': 'boolean',
  'String': 'string',
  'List': 'Array',
  'Map': 'Map',
  'Set': 'Set',
  'dynamic': 'any',
  'void': 'void',
  'Null': 'null',
  'Future': 'Promise',
  'Stream': 'Observable',
  'DateTime': 'Date',
  'Duration': 'number',
  'Uri': 'URL',
  'RegExp': 'RegExp',
  'Symbol': 'symbol',
  'Type': 'any',
  'Function': 'Function',
  'Object': 'object',
  'Iterable': 'Iterable',
};

export const dartPatternReplacements = [
  // Async/await patterns
  { from: /Future<(.+?)>/g, to: 'Promise<$1>' },
  { from: /Stream<(.+?)>/g, to: 'Observable<$1>' },

  // Collection patterns
  { from: /List<(.+?)>/g, to: 'Array<$1>' },
  { from: /Map<(.+?),\s*(.+?)>/g, to: 'Map<$1, $2>' },

  // Null safety
  { from: /(\w+)\?/g, to: '$1 | null' },
  { from: /(\w+)!/g, to: '$1' },

  // String interpolation
  { from: /'\$(\w+)'/g, to: '`${$1}`' },
  { from: /"\$(\w+)"/g, to: '`${$1}`' },
  { from: /'\${(.+?)}'/g, to: '`${$1}`' },
  { from: /"\${(.+?)}"/g, to: '`${$1}`' },

  // Factory constructors
  { from: /factory\s+(\w+)\.(\w+)\(/g, to: 'static $2(' },

  // Named parameters
  { from: /\{(\w+):\s*(.+?)\}/g, to: '{ $1 = $2 }' },
];

export const techDebtPatterns = [
  {
    name: 'excessive-nesting',
    pattern: /(\{[^}]*){5,}/g,
    severity: 'high' as const,
    description: 'Deeply nested code blocks',
    fix: 'Refactor into smaller functions'
  },
  {
    name: 'todo-comments',
    pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)/gi,
    severity: 'medium' as const,
    description: 'Unresolved TODO comments',
    fix: 'Address or remove TODO comments'
  },
  {
    name: 'console-logs',
    pattern: /console\.(log|error|warn|debug)/g,
    severity: 'low' as const,
    description: 'Console logging statements',
    fix: 'Use proper logging library'
  },
  {
    name: 'any-type',
    pattern: /:\s*any\b/g,
    severity: 'medium' as const,
    description: 'Use of any type',
    fix: 'Use specific types instead of any'
  },
  {
    name: 'magic-numbers',
    pattern: /\b\d{2,}\b(?![\d.])/g,
    severity: 'low' as const,
    description: 'Magic numbers in code',
    fix: 'Extract to named constants'
  },
  {
    name: 'long-functions',
    pattern: /function[^}]{1000,}/g,
    severity: 'high' as const,
    description: 'Functions over 50 lines',
    fix: 'Break down into smaller functions'
  }
];