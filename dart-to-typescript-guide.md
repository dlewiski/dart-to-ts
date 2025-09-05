# Dart to TypeScript Converter - Implementation Guide

## Phase-Based Approach for React 18 + Redux Toolkit Applications

## Executive Summary

A phase-based tool that converts Dart applications to React 18 + TypeScript applications using functional understanding and modern patterns. The system leverages both Claude (for complex understanding and architecture decisions) and Ollama/Qwen 2.5 Coder (for parallel code generation) to produce production-ready React applications with Redux Toolkit state management, emphasizing RTK Query for data fetching.

### Status

- **Phase 1**: ✅ Complete - Functional understanding via Claude CLI
- **Phase 2**: 🚧 To Implement - TypeScript/React architecture planning
- **Phase 3**: 📝 To Implement - React component & Redux Toolkit generation
- **Phase 4**: 📝 To Implement - Validation, testing & optimization

### Key Improvements (v2)

- Enhanced Dart-to-TypeScript type mappings
- React 18 concurrent features and Suspense boundaries
- RTK Query prioritization over manual async thunks
- Comprehensive dependency resolution
- Auto-fix capabilities for common TypeScript errors

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: UNDERSTAND                       │
│                     (✅ IMPLEMENTED)                         │
├───────────────────────────────────────────────────────────────┤
│  Scanner → Extractor → Claude Analysis → Functional Model    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 2: ARCHITECT                          │
│                    (TO IMPLEMENT)                            │
├───────────────────────────────────────────────────────────────┤
│  Functional Model → React Architecture → Redux Design        │
│                    → Dependency Mapping                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   PHASE 3: GENERATE                          │
│                    (TO IMPLEMENT)                            │
├───────────────────────────────────────────────────────────────┤
│  Claude (Complex) + Ollama (Parallel) → React Components     │
│                                       → Redux Slices         │
│                                       → Services & Utils     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 4: VALIDATE                           │
│                    (TO IMPLEMENT)                            │
├───────────────────────────────────────────────────────────────┤
│  TypeScript Validation → Auto-fix → Slim Test Generation     │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack (Fixed)

- **Framework**: React 18 (with concurrent features)
- **Build Tool**: Vite 5.x (optimized for fast HMR)
- **State Management**: Redux Toolkit (RTK) with RTK Query
- **Component Library**: Custom Material UI-based (placeholders)
- **Testing**: Vitest (slim, focused tests only)
- **Language**: TypeScript 5.x with strict mode
- **LLMs**: Claude (primary) + Ollama/Qwen 2.5 Coder (parallel generation)
- **Styling**: Tailwind CSS (optional) or CSS Modules
- **Routing**: React Router v6

---

## Enhanced Type Mappings: Dart to TypeScript

### Core Type Conversions

| Dart Type   | TypeScript Type               | Notes                                    |
| ----------- | ----------------------------- | ---------------------------------------- |
| `int`       | `number`                      | TypeScript doesn't distinguish int/float |
| `double`    | `number`                      | Use branded types if distinction needed  |
| `num`       | `number`                      | Base numeric type                        |
| `String`    | `string`                      | Direct mapping                           |
| `bool`      | `boolean`                     | Direct mapping                           |
| `List<T>`   | `T[]` or `Array<T>`           | Prefer `T[]` for simple arrays           |
| `Map<K, V>` | `Map<K, V>` or `Record<K, V>` | Use `Record` for object-like maps        |
| `Set<T>`    | `Set<T>`                      | Direct mapping                           |
| `Future<T>` | `Promise<T>`                  | Async operation result                   |
| `Stream<T>` | `Observable<T>`               | Requires RxJS                            |
| `dynamic`   | `any`                         | Avoid when possible                      |
| `void`      | `void`                        | Direct mapping                           |
| `null`      | `null`                        | Direct mapping                           |
| `T?`        | `T \| null \| undefined`      | Nullable types                           |
| `Never`     | `never`                       | Unreachable code                         |

### Advanced Pattern Mappings

```typescript
// Dart: Future<String> fetchData() async { ... }
// TypeScript:
async function fetchData(): Promise<string> { ... }

// Dart: Stream<int> countStream() async* { ... }
// TypeScript (with RxJS):
function countStream(): Observable<number> { ... }

// Dart: class with named constructors
// TypeScript: static factory methods
class User {
  private constructor(public name: string) {}
  
  static fromJson(json: any): User {
    return new User(json.name);
  }
}

// Dart: Extension methods
// TypeScript: Module augmentation or utility functions
```

---

# PHASE 2: TypeScript/React Architecture Planning

## Implementation Tasks for Claude Code

### Task 2.1: Create React Architecture Planner

```typescript
// src/architect/react-architect.ts
import { FunctionalAnalysis } from '../types/index.ts';
import { executeClaude } from '../claude-cli.ts';

export interface ReactArchitecture {
  // Fixed technology choices
  framework: 'react';
  version: '18';
  buildTool: 'vite';
  stateManagement: 'redux-toolkit';

  // Variable architecture decisions
  projectStructure: ProjectStructure;
  componentHierarchy: ComponentHierarchy;
  reduxStructure: ReduxStructure;
  routingStrategy: RoutingStrategy;
  dependencies: DependencyMap;
  dataFetching: 'rtk-query' | 'axios' | 'fetch';
}

export interface ProjectStructure {
  src: {
    components: ComponentFolder[];
    features: FeatureFolder[]; // Feature-based organization
    store: StoreStructure;
    services: string[];
    utils: string[];
    types: string[];
    assets: string[];
  };
}

export interface ComponentHierarchy {
  pages: PageComponent[];
  layouts: LayoutComponent[];
  features: FeatureComponent[];
  shared: SharedComponent[];
}

export class ReactArchitect {
  constructor(private analysis: FunctionalAnalysis) {}

  async planArchitecture(): Promise<ReactArchitecture> {
    const architecture: ReactArchitecture = {
      framework: 'react',
      version: '18',
      buildTool: 'vite',
      stateManagement: 'redux-toolkit',
      projectStructure: await this.designProjectStructure(),
      componentHierarchy: await this.planComponentHierarchy(),
      reduxStructure: await this.designReduxStructure(),
      routingStrategy: await this.determineRoutingStrategy(),
      dependencies: await this.mapDependencies(),
      dataFetching: await this.selectDataFetchingStrategy(),
    };

    return architecture;
  }

  private async designProjectStructure(): Promise<ProjectStructure> {
    // Analyze the Dart project structure and map to React conventions
    const prompt = `
Based on this Dart application analysis, design a React 18 project structure:

${JSON.stringify(this.analysis, null, 2)}

Use feature-based organization with this structure:
- src/components (shared UI components)
- src/features (feature modules with local components/hooks/utils)
- src/store (Redux store and slices)
- src/services (API services)
- src/types (TypeScript types)

Return JSON with the complete folder structure.
`;

    const response = await executeClaude(prompt, {
      model: 'sonnet',
      outputFormat: 'json',
    });

    return JSON.parse(response.result);
  }

  private async designReduxStructure(): Promise<ReduxStructure> {
    const stateShape = this.analysis.stateManagement?.stateShape || {};

    const prompt = `
Design Redux Toolkit structure for this state shape:

Current State: ${JSON.stringify(stateShape)}
Key Actions: ${JSON.stringify(this.analysis.stateManagement?.keyActions)}

Design:
1. Slice organization (by feature or domain)
2. Normalized vs denormalized state
3. RTK Query endpoints if applicable
4. Middleware requirements

Return JSON with slice definitions and structure.
`;

    const response = await executeClaude(prompt, {
      model: 'sonnet',
      outputFormat: 'json',
    });

    return JSON.parse(response.result);
  }

  private async planComponentHierarchy(): Promise<ComponentHierarchy> {
    // Map Dart UI components to React component hierarchy
    const prompt = `
Plan React component hierarchy based on these UI features:

Features: ${JSON.stringify(this.analysis.coreFeatures)}
Workflows: ${JSON.stringify(this.analysis.userWorkflows)}

Categorize into:
1. Pages (route-level components)
2. Layouts (wrapper components)
3. Features (business logic components)
4. Shared (reusable UI components)

Return JSON with component hierarchy.
`;

    const response = await executeClaude(prompt, {
      model: 'sonnet',
      outputFormat: 'json',
    });

    return JSON.parse(response.result);
  }
}
```

### Task 2.2: Dependency Mapper with Fixed Mappings

```typescript
// src/architect/dependency-mapper.ts
export class DependencyMapper {
  // Comprehensive mappings for common Dart packages to React/TypeScript
  private readonly fixedMappings = {
    // React ecosystem (fixed choices)
    'over_react': {
      npm: [
        'react@18',
        'react-dom@18',
        '@types/react@18',
        '@types/react-dom@18',
      ],
      notes: 'Core React 18 dependencies with TypeScript support',
    },
    'flutter': {
      npm: ['react@18', 'react-dom@18'],
      notes: 'Flutter maps to React for web',
    },

    // Redux ecosystem (using RTK)
    'built_redux': {
      npm: ['@reduxjs/toolkit', 'react-redux'],
      notes: 'Redux Toolkit for state management',
    },
    'redux': {
      npm: ['@reduxjs/toolkit', 'react-redux'],
      notes: 'Modern Redux with RTK',
    },
    'provider': {
      npm: ['react-redux', '@reduxjs/toolkit'],
      notes: 'Provider pattern via Redux',
    },
    'riverpod': {
      npm: ['@reduxjs/toolkit', 'react-redux'],
      notes: 'State management via RTK',
    },

    // Data handling
    'built_value': {
      npm: ['immer'],
      notes: 'Immer for immutable state updates (built into RTK)',
    },
    'built_collection': {
      npm: [], // RTK handles this
      notes: "Use RTK's built-in Immer",
    },
    'freezed': {
      npm: ['immer', 'typescript'],
      notes: 'TypeScript interfaces with Immer',
    },
    'json_serializable': {
      npm: ['class-transformer', 'class-validator'],
      notes: 'JSON serialization',
    },

    // HTTP/API
    'http': {
      npm: ['axios'],
      notes: 'Axios for HTTP requests',
    },
    'dio': {
      npm: ['axios', 'axios-retry'],
      notes: 'Axios with retry logic',
    },
    'graphql': {
      npm: ['@apollo/client', 'graphql'],
      notes: 'Apollo Client for GraphQL',
    },

    // Async/Streams
    'rxdart': {
      npm: ['rxjs'],
      notes: 'RxJS for reactive programming',
    },
    'async': {
      npm: [], // Built into JS/TS
      notes: 'Native async/await support',
    },

    // Routing
    'route': {
      npm: ['react-router-dom@6'],
      notes: 'React Router v6 for navigation',
    },
    'go_router': {
      npm: ['react-router-dom@6'],
      notes: 'React Router v6',
    },
    'auto_route': {
      npm: ['react-router-dom@6', '@tanstack/react-router'],
      notes: 'Advanced routing',
    },

    // UI Components
    'material': {
      npm: [
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',
        '@emotion/styled',
      ],
      notes: 'Material-UI components',
    },
    'cupertino_icons': {
      npm: ['@mui/icons-material'],
      notes: 'Icon library',
    },

    // Forms
    'reactive_forms': {
      npm: ['react-hook-form', 'zod'],
      notes: 'Form handling with validation',
    },

    // Storage
    'shared_preferences': {
      npm: ['localforage'],
      notes: 'Local storage abstraction',
    },
    'hive': {
      npm: ['localforage', 'idb'],
      notes: 'IndexedDB storage',
    },
    'sqflite': {
      npm: ['sql.js', 'localforage'],
      notes: 'SQLite in browser',
    },

    // Testing (slim approach)
    'test': {
      npm: ['vitest', '@testing-library/react', '@testing-library/user-event'],
      notes: 'Vitest for fast, focused testing',
    },
    'mockito': {
      npm: ['vitest', '@vitest/ui'],
      notes: 'Mocking with Vitest',
    },
  };

  async mapDependencies(dartDeps: string[]): Promise<PackageJson> {
    const packageJson: PackageJson = {
      name: 'converted-app',
      version: '1.0.0',
      type: 'module',
      scripts: {
        'dev': 'vite',
        'build': 'tsc && vite build',
        'preview': 'vite preview',
        'test': 'vitest run',
        'test:watch': 'vitest',
        'lint': 'eslint . --ext ts,tsx',
        'type-check': 'tsc --noEmit',
      },
      dependencies: {
        // Core React 18 dependencies (always included)
        'react': '^18.2.0',
        'react-dom': '^18.2.0',

        // Redux Toolkit (always included)
        '@reduxjs/toolkit': '^2.0.0',
        'react-redux': '^9.0.0',

        // Routing (always included)
        'react-router-dom': '^6.20.0',

        // HTTP client
        'axios': '^1.6.0',

        // Component library placeholder
        '@company/ui-components': 'latest', // Placeholder for custom MUI library
      },
      devDependencies: {
        // TypeScript
        'typescript': '^5.3.0',
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@types/node': '^20.0.0',

        // Vite
        'vite': '^5.0.0',
        '@vitejs/plugin-react': '^4.2.0',

        // Testing (slim setup)
        'vitest': '^1.0.0',
        '@testing-library/react': '^14.0.0',
        '@testing-library/user-event': '^14.0.0',
        '@vitest/ui': '^1.0.0',

        // Linting
        'eslint': '^8.50.0',
        'eslint-plugin-react': '^7.33.0',
        'eslint-plugin-react-hooks': '^4.6.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0',
      },
    };

    // Add any additional mapped dependencies
    for (const dartPkg of dartDeps) {
      if (this.fixedMappings[dartPkg]) {
        const mapping = this.fixedMappings[dartPkg];
        mapping.npm.forEach((pkg) => {
          const [name, version] = pkg.split('@').filter(Boolean);
          if (!packageJson.dependencies[name]) {
            packageJson.dependencies[name] = version || 'latest';
          }
        });
      }
    }

    return packageJson;
  }
}
```

### Task 2.3: Create Configuration Files

```typescript
// src/architect/config-generator.ts
export class ConfigGenerator {
  generateViteConfig(): string {
    return `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@store': path.resolve(__dirname, './src/store'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
  },
});
`;
  }

  generateTsConfig(): object {
    return {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,

        // React 18
        jsx: 'react-jsx',

        // Module resolution
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,

        // Type checking
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,

        // Path aliases
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '@components/*': ['src/components/*'],
          '@features/*': ['src/features/*'],
          '@store/*': ['src/store/*'],
          '@services/*': ['src/services/*'],
          '@types/*': ['src/types/*'],
          '@utils/*': ['src/utils/*'],
        },
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    };
  }

  generateVitestConfig(): string {
    return `
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Slim test configuration - no coverage by default
    coverage: {
      enabled: false, // Enable only when needed
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
`;
  }
}
```

---

# PHASE 3: Code Generation

## Parallel LLM Strategy: Claude + Ollama

### Task 3.1: LLM Orchestrator for Parallel Generation

```typescript
// src/generators/llm-orchestrator.ts
import { executeClaude } from '../claude-cli.ts';
import { OllamaClient } from '../ollama/ollama-client.ts';

export class LLMOrchestrator {
  private ollama: OllamaClient;
  private taskQueue: GenerationTask[] = [];

  constructor() {
    this.ollama = new OllamaClient('qwen2.5-coder:7b');
  }

  /**
   * Distribute generation tasks between Claude and Ollama
   * Claude: Complex logic, architecture decisions, business rules
   * Ollama: Parallel component generation, boilerplate, utilities
   */
  async orchestrateGeneration(
    architecture: ReactArchitecture,
    analysis: FunctionalAnalysis,
  ): Promise<GeneratedCode> {
    // Phase 1: Use Claude for critical architectural components
    const criticalTasks = await this.generateCriticalWithClaude(
      architecture,
      analysis,
    );

    // Phase 2: Use Ollama in parallel for simpler components
    const parallelTasks = this.prepareParallelTasks(architecture);
    const parallelResults = await this.executeParallelWithOllama(parallelTasks);

    // Phase 3: Combine and refine
    return this.combineResults(criticalTasks, parallelResults);
  }

  private async generateCriticalWithClaude(
    architecture: ReactArchitecture,
    analysis: FunctionalAnalysis,
  ): Promise<CriticalComponents> {
    console.log('🧠 Using Claude for critical components...');

    const tasks = [
      this.generateReduxStore(analysis),
      this.generateCoreBusinessLogic(analysis),
      this.generateComplexComponents(analysis),
      this.generateAPIServices(analysis),
    ];

    const results = await Promise.all(tasks);

    return {
      store: results[0],
      businessLogic: results[1],
      complexComponents: results[2],
      services: results[3],
    };
  }

  private async executeParallelWithOllama(
    tasks: ParallelTask[],
  ): Promise<GeneratedComponent[]> {
    console.log(`🚀 Running ${tasks.length} parallel tasks with Ollama...`);

    // Batch tasks for optimal parallelization
    const batchSize = 4; // Adjust based on system resources
    const results: GeneratedComponent[] = [];

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchPromises = batch.map((task) =>
        this.ollama.generateComponent(task)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      console.log(
        `  Completed batch ${Math.floor(i / batchSize) + 1}/${
          Math.ceil(tasks.length / batchSize)
        }`,
      );
    }

    return results;
  }
}
```

### Task 3.2: Ollama Client Implementation

```typescript
// src/ollama/ollama-client.ts
export class OllamaClient {
  private model: string;
  private baseUrl: string;

  constructor(model: string = 'qwen2.5-coder:7b') {
    this.model = model;
    this.baseUrl = 'http://localhost:11434/api';
  }

  async generateComponent(task: ComponentTask): Promise<GeneratedComponent> {
    const prompt = this.buildComponentPrompt(task);

    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.2, // Lower for consistent code
          top_p: 0.9,
          max_tokens: 4096,
        },
      }),
    });

    const result = await response.json();

    return {
      name: task.componentName,
      code: result.response,
      path: task.outputPath,
    };
  }

  private buildComponentPrompt(task: ComponentTask): string {
    return `
Generate a React 18 component with TypeScript.

Component: ${task.componentName}
Type: ${task.componentType}
Props: ${JSON.stringify(task.props)}
Features: ${task.features.join(', ')}

Requirements:
1. Use React 18 with functional components and hooks
2. TypeScript with strict types
3. Follow React best practices
4. Use our component library placeholders: import { Button, TextField } from '@company/ui-components'

Template:
import React from 'react';
import { ${task.imports.join(', ')} } from '@company/ui-components';

interface ${task.componentName}Props {
  // Define props
}

export const ${task.componentName}: React.FC<${task.componentName}Props> = (props) => {
  // Component implementation
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

Generate the complete component implementation.
`;
  }

  async generateUtility(task: UtilityTask): Promise<GeneratedUtility> {
    const prompt = `
Generate a TypeScript utility function.

Function: ${task.name}
Purpose: ${task.purpose}
Input: ${JSON.stringify(task.input)}
Output: ${JSON.stringify(task.output)}

Requirements:
1. Pure function with no side effects
2. Proper TypeScript types
3. JSDoc comments
4. Error handling

Generate the implementation.
`;

    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
      }),
    });

    const result = await response.json();

    return {
      name: task.name,
      code: result.response,
      path: `src/utils/${task.name}.ts`,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/tags`);
      const data = await response.json();
      return data.models?.some((m: any) => m.name === this.model) ?? false;
    } catch {
      return false;
    }
  }
}
```

### Task 3.3: React Component Generator

```typescript
// src/generators/react-component-generator.ts
export class ReactComponentGenerator {
  constructor(
    private orchestrator: LLMOrchestrator,
    private architecture: ReactArchitecture,
  ) {}

  async generateComponents(
    componentSpecs: ComponentSpec[],
  ): Promise<GeneratedComponent[]> {
    // Categorize components by complexity
    const { complex, simple } = this.categorizeComponents(componentSpecs);

    // Generate complex components with Claude
    const complexPromises = complex.map((spec) =>
      this.generateComplexComponent(spec)
    );

    // Generate simple components with Ollama in parallel
    const simplePromises = simple.map((spec) =>
      this.generateSimpleComponent(spec)
    );

    const [complexResults, simpleResults] = await Promise.all([
      Promise.all(complexPromises),
      Promise.all(simplePromises),
    ]);

    return [...complexResults, ...simpleResults];
  }

  private async generateComplexComponent(
    spec: ComponentSpec,
  ): Promise<GeneratedComponent> {
    const prompt = `
Generate a complex React 18 component with business logic.

Specification:
${JSON.stringify(spec, null, 2)}

Requirements:
1. React 18 with hooks (useState, useEffect, useMemo, useCallback)
2. Redux integration with useSelector and useDispatch
3. TypeScript with strict types
4. Error boundaries where appropriate
5. Performance optimizations (React.memo, useMemo)
6. Accessibility (ARIA labels, keyboard navigation)

Use our component library: @company/ui-components (Material UI based)

Generate complete implementation with:
- Component code
- TypeScript interfaces
- Redux connections
- Event handlers
`;

    const response = await executeClaude(prompt, {
      model: 'opus', // Use Opus for complex components
      outputFormat: 'text',
    });

    return {
      name: spec.name,
      code: response.result as string,
      path: `src/features/${spec.feature}/${spec.name}.tsx`,
    };
  }

  private categorizeComponents(
    specs: ComponentSpec[],
  ): { complex: ComponentSpec[]; simple: ComponentSpec[] } {
    const complex: ComponentSpec[] = [];
    const simple: ComponentSpec[] = [];

    specs.forEach((spec) => {
      if (
        spec.hasBusinessLogic ||
        spec.hasComplexState ||
        spec.connectsToRedux ||
        spec.hasAsyncOperations
      ) {
        complex.push(spec);
      } else {
        simple.push(spec);
      }
    });

    return { complex, simple };
  }
}
```

### Task 3.4: Redux Store Generator

```typescript
// src/generators/redux-generator.ts
export class ReduxGenerator {
  async generateStore(
    stateSpec: StateSpec,
    analysis: FunctionalAnalysis,
  ): Promise<GeneratedStore> {
    console.log('🏪 Generating Redux store with RTK...');

    // Generate store configuration
    const storeConfig = await this.generateStoreConfig(stateSpec);

    // Generate slices based on features
    const slices = await this.generateSlices(stateSpec);

    // Generate RTK Query APIs if needed
    const apis = await this.generateRTKQueryAPIs(analysis);

    return {
      store: storeConfig,
      slices,
      apis,
      types: this.generateStoreTypes(stateSpec),
    };
  }

  private async generateSlices(spec: StateSpec): Promise<ReduxSlice[]> {
    const slices: ReduxSlice[] = [];

    for (const [sliceName, sliceSpec] of Object.entries(spec.slices)) {
      const prompt = `
Generate a Redux Toolkit slice for React 18.

Slice: ${sliceName}
State Shape: ${JSON.stringify(sliceSpec.state)}
Actions: ${JSON.stringify(sliceSpec.actions)}

Requirements:
1. Use createSlice from @reduxjs/toolkit
2. Immer for immutable updates
3. TypeScript with PayloadAction types
4. Async thunks for API calls
5. Selectors with type safety

Template:
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@store/store';

// Types
interface ${sliceName}State {
  // Define state shape
}

// Initial state
const initialState: ${sliceName}State = {
  // Initial values
};

// Async thunks
export const fetch${sliceName} = createAsyncThunk(
  '${sliceName}/fetch',
  async () => {
    // API call
  }
);

// Slice
export const ${sliceName}Slice = createSlice({
  name: '${sliceName}',
  initialState,
  reducers: {
    // Synchronous actions
  },
  extraReducers: (builder) => {
    // Async action handlers
  },
});

// Actions
export const { /* actions */ } = ${sliceName}Slice.actions;

// Selectors
export const select${sliceName} = (state: RootState) => state.${sliceName};

export default ${sliceName}Slice.reducer;

Generate the complete slice implementation.
`;

      const response = await executeClaude(prompt, {
        model: 'sonnet',
        outputFormat: 'text',
      });

      slices.push({
        name: sliceName,
        code: response.result as string,
        path: `src/store/slices/${sliceName}Slice.ts`,
      });
    }

    return slices;
  }

  private generateStoreConfig(spec: StateSpec): string {
    return `
import { configureStore } from '@reduxjs/toolkit';
${
      spec.slices.map((s) => `import ${s}Reducer from './slices/${s}Slice';`)
        .join('\n')
    }

export const store = configureStore({
  reducer: {
${spec.slices.map((s) => `    ${s}: ${s}Reducer,`).join('\n')}
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
  }
}
```

---

# PHASE 4: Validation & Testing

## Slim Testing Strategy

### Task 4.1: Test Generator (Focused & Minimal)

```typescript
// src/generators/test-generator.ts
export class SlimTestGenerator {
  /**
   * Generate only critical tests - no bloat
   * Focus on: business logic, critical user flows, data transformations
   * Skip: simple UI, getters/setters, trivial functions
   */
  async generateTests(
    component: GeneratedComponent,
    spec: ComponentSpec,
  ): Promise<GeneratedTest | null> {
    // Only generate tests for components with business logic
    if (!spec.hasBusinessLogic && !spec.criticalPath) {
      return null;
    }

    const prompt = `
Generate a MINIMAL Vitest test for this React component.

Component: ${spec.name}
Critical Features: ${spec.criticalFeatures.join(', ')}

Requirements:
1. Test ONLY critical business logic
2. NO testing of UI rendering details
3. NO complex mocking - use simple stubs
4. Focus on user outcomes, not implementation
5. Maximum 3-4 test cases

Template:
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ${spec.name} } from './${spec.name}';

describe('${spec.name}', () => {
  it('should handle critical business logic', () => {
    // Test core functionality only
  });
});

Generate only essential tests. Skip if trivial.
`;

    const response = await this.ollama.generate(prompt);

    return {
      code: response,
      path: `src/features/${spec.feature}/${spec.name}.test.tsx`,
    };
  }

  async generateIntegrationTest(
    workflow: UserWorkflow,
  ): Promise<GeneratedTest> {
    // Only test critical user workflows
    const prompt = `
Generate a minimal integration test for this user workflow:

Workflow: ${workflow.name}
Steps: ${workflow.steps.join(' -> ')}

Test only the happy path and one critical error case.
Keep it simple - no complex setup or mocking.
`;

    const response = await executeClaude(prompt, {
      model: 'sonnet',
      outputFormat: 'text',
    });

    return {
      code: response.result as string,
      path: `src/test/integration/${workflow.name}.test.tsx`,
    };
  }
}
```

### Task 4.2: TypeScript Validator

```typescript
// src/validators/ts-validator.ts
export class TypeScriptValidator {
  async validateProject(projectPath: string): Promise<ValidationResult> {
    console.log('🔍 Validating TypeScript project...');

    // Run TypeScript compiler
    const tscResult = await this.runTypeScriptCompiler(projectPath);

    // Auto-fix simple issues
    if (!tscResult.success) {
      console.log('🔧 Attempting auto-fixes...');
      await this.autoFixCommonIssues(tscResult.errors);
    }

    return {
      success: tscResult.success,
      errors: tscResult.errors,
      warnings: tscResult.warnings,
    };
  }

  private async runTypeScriptCompiler(
    projectPath: string,
  ): Promise<CompilerResult> {
    const cmd = new Deno.Command('npx', {
      args: ['tsc', '--noEmit', '--pretty'],
      cwd: projectPath,
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await cmd.output();

    return {
      success: code === 0,
      errors: this.parseTypeScriptErrors(stderr),
      warnings: this.parseTypeScriptWarnings(stdout),
    };
  }

  private async autoFixCommonIssues(errors: TSError[]): Promise<void> {
    for (const error of errors) {
      if (error.code === 'TS2307') { // Cannot find module
        await this.fixMissingImport(error);
      } else if (error.code === 'TS7006') { // Parameter implicitly has 'any'
        await this.addTypeAnnotation(error);
      }
      // Add more auto-fix patterns as needed
    }
  }
}
```

---

# Implementation Plan for Claude Code

## Phase 2 Implementation (Current Focus)

```bash
# Task 2.1: Architecture Planning
claude: "Implement the ReactArchitect class in src/architect/react-architect.ts following the specification. Focus on creating a planArchitecture() method that designs the React 18 project structure based on the functional analysis from Phase 1."

# Task 2.2: Dependency Mapping  
claude: "Create the DependencyMapper class in src/architect/dependency-mapper.ts with fixed mappings for React 18, Redux Toolkit, and Vite. Generate a complete package.json with our standard dependencies."

# Task 2.3: Configuration Generation
claude: "Implement ConfigGenerator in src/architect/config-generator.ts to create vite.config.ts, tsconfig.json, and vitest.config.ts files optimized for React 18 development."
```

## Phase 3 Implementation

```bash
# Task 3.1: LLM Orchestration
claude: "Create the LLMOrchestrator class that distributes work between Claude (complex logic) and Ollama (parallel simple components). Implement task distribution logic."

# Task 3.2: Ollama Integration
claude: "Implement OllamaClient in src/ollama/ollama-client.ts for parallel component generation using Qwen 2.5 Coder. Include connection testing and fallback to Claude if Ollama is unavailable."

# Task 3.3: Component Generation
claude: "Build ReactComponentGenerator that uses Claude for complex components and Ollama for simple ones. Use our @company/ui-components library for UI elements."

# Task 3.4: Redux Generation
claude: "Create ReduxGenerator for RTK slice generation. Focus on modern patterns with createSlice and RTK Query for data fetching."
```

## Phase 4 Implementation

```bash
# Task 4.1: Slim Testing
claude: "Implement SlimTestGenerator that creates minimal, focused tests only for critical business logic. Avoid UI testing and complex mocking."

# Task 4.2: Validation
claude: "Build TypeScriptValidator with auto-fix capabilities for common TS errors. Focus on making the generated code compile without manual intervention."
```

## Key Design Decisions

### Technology Stack (Fixed)

- **React 18** with functional components and hooks
- **Vite** for fast development and building
- **Redux Toolkit** for state management (not plain Redux)
- **TypeScript 5.x** with strict mode
- **Vitest** for testing (fast, minimal config)
- **Custom MUI components** (@company/ui-components)

### LLM Strategy

- **Claude**: Architecture decisions, complex components, business logic
- **Ollama/Qwen 2.5**: Parallel generation of simple components, utilities, boilerplate
- **Fallback**: If Ollama unavailable, use Claude for everything

### Testing Philosophy

- **Minimal**: Only test critical business logic
- **No UI testing**: Skip render tests, focus on logic
- **No complex mocking**: Use simple stubs
- **Fast**: Tests should run in seconds, not minutes

### Project Structure

```
src/
├── components/       # Shared UI components
├── features/        # Feature modules
│   ├── feature1/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
├── store/           # Redux store
│   ├── store.ts
│   └── slices/
├── services/        # API services
├── types/          # TypeScript types
├── utils/          # Utilities
└── test/           # Test setup
```

## Success Metrics

1. **Generated code compiles** without manual fixes
2. **Tests run in <10 seconds** for typical project
3. **Redux state management** works out of the box
4. **Component library** integration is seamless
5. **Parallel generation** reduces time by 40%+

## Next Steps

1. Start with Phase 2 implementation using Claude Code
2. Test with a sample Dart project
3. Iterate on generation templates based on results
4. Add Ollama integration for parallelization
5. Create minimal test suite
6. Validate full pipeline end-to-end
