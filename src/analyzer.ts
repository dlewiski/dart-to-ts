import { analyzeCode, executeClaude } from './claude-cli.ts';
import { analysisPrompts } from './prompts.ts';
import {
  cleanJsonResponse,
  extractUsageInfo,
  formatUsageInfo,
  ProgressIndicator,
  ResponseCache,
} from './utils/claude-utils.ts';
import {
  type AnalysisOptions,
  type ChunkAnalysisResult,
  type ClaudeOptions,
  type CodeChunk,
  type ComprehensiveAnalysisResult,
  type FunctionalAnalysis,
} from './types/index.ts';

// Initialize cache
const cache = new ResponseCache('.claude-cache', 120); // 2 hour cache

/**
 * Extract and validate analysis configuration from options
 */
interface AnalysisConfig {
  useCache: boolean;
  verbose: boolean;
  model: 'sonnet' | 'opus';
  timeout: number | undefined;
}

function extractAnalysisConfig(options: AnalysisOptions): AnalysisConfig {
  return {
    useCache: options.useCache ?? true,
    verbose: options.verbose ?? false,
    model: options.model ?? 'sonnet',
    timeout: options.timeout ?? undefined,
  };
}

/**
 * Process a chunk with caching logic
 */
async function processChunkWithCaching(
  chunk: CodeChunk,
  config: AnalysisConfig,
): Promise<ChunkAnalysisResult | null> {
  const cacheKey = `${chunk.category}_${config.model}`;
  const chunkContent = chunk.files[0]?.content || '';

  // Try to get from cache first
  if (config.useCache) {
    const cachedResult = await cache.get<ChunkAnalysisResult>(chunkContent, {
      category: cacheKey,
    });
    if (cachedResult) {
      return cachedResult;
    }
  }

  // Analyze the chunk
  const claudeOptions: ClaudeOptions = {
    model: config.model,
    verbose: config.verbose,
  };
  if (config.timeout !== undefined) {
    claudeOptions.timeout = config.timeout;
  }

  const result = await analyzeChunkByCategory(chunk, claudeOptions);

  // Cache the result
  if (config.useCache && result) {
    await cache.set(chunkContent, result, { category: cacheKey });
  }

  return result;
}

/**
 * Handle errors during chunk analysis
 */
function handleChunkAnalysisError(
  error: unknown,
  chunk: CodeChunk,
  verbose: boolean,
  analysis: Partial<FunctionalAnalysis>,
): void {
  console.error(`\n⚠️  Error analyzing ${chunk.category}:`, error);

  if (verbose) {
    const errorDetails = {
      category: chunk.category,
      filesCount: chunk.files.length,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    console.error('Error details:', errorDetails);
  }

  // Add fallback data for this chunk category
  const fallbackResult = getDefaultResultForCategory(chunk.category);
  mergeAnalysisResults(analysis, fallbackResult, chunk.category);
}

/**
 * Merge strategies for different chunk types
 */
function mergeEntryResults(
  analysis: Partial<FunctionalAnalysis>,
  result: ChunkAnalysisResult,
): void {
  if (result.appPurpose) {
    analysis.appPurpose = result.appPurpose;
  }
  if (result.initialization) {
    analysis.coreFeatures = result.initialization;
  }
}

function mergeStateResults(
  analysis: Partial<FunctionalAnalysis>,
  result: ChunkAnalysisResult,
): void {
  analysis.stateManagement = {
    pattern: result.middleware?.join(', ') || 'Redux',
    stateShape: result.stateShape || {},
    keyActions: result.keyActions || [],
    selectors: result.selectors || [],
  };
}

function mergeComponentResults(
  analysis: Partial<FunctionalAnalysis>,
  result: ChunkAnalysisResult,
): void {
  if (result.userFeatures) {
    analysis.coreFeatures = [
      ...(analysis.coreFeatures || []),
      ...result.userFeatures,
    ];
  }
  if (result.interactions) {
    analysis.userWorkflows = [{
      name: 'User Interactions',
      steps: result.interactions,
    }];
  }
}

function mergeServiceResults(
  analysis: Partial<FunctionalAnalysis>,
  result: ChunkAnalysisResult,
): void {
  analysis.dataFlow = {
    sources: result.dataSource || [],
    transformations: result.operations || [],
    destinations: result.dataFormat ? ['API responses'] : [],
  };
}

function mergeDependencyResults(
  analysis: Partial<FunctionalAnalysis>,
  result: ChunkAnalysisResult,
): void {
  analysis.dependencies = {
    dart: result.coreDependencies || [],
    tsEquivalents: result.tsEquivalents || {},
  };
}

/**
 * Analyze Dart code functionality using Claude CLI
 */
export async function analyzeFunctionality(
  chunks: CodeChunk[],
  options: AnalysisOptions = {},
): Promise<FunctionalAnalysis> {
  const analysisConfig = extractAnalysisConfig(options);

  console.log(
    `\n🧠 Analyzing ${chunks.length} code chunks using Claude (model: ${analysisConfig.model})...\n`,
  );

  const progress = new ProgressIndicator(chunks.length);
  const analysis: Partial<FunctionalAnalysis> = {};

  // Process each chunk type
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const currentChunk = chunks[chunkIndex]!;
    await progress.update(
      chunkIndex + 1,
      `Analyzing ${currentChunk.category}...`,
    );

    try {
      const analysisResult = await processChunkWithCaching(
        currentChunk,
        analysisConfig,
      );

      mergeAnalysisResults(analysis, analysisResult, currentChunk.category);
    } catch (error) {
      handleChunkAnalysisError(
        error,
        currentChunk,
        analysisConfig.verbose,
        analysis,
      );
    }
  }

  progress.complete('Analysis complete!');
  return fillAnalysisDefaults(analysis);
}

/**
 * Get default result for a failed chunk analysis
 */
function getDefaultResultForCategory(category: string): ChunkAnalysisResult {
  switch (category) {
    case 'entry':
      return {
        appPurpose: 'Analysis failed - manual review required',
        initialization: [],
      };
    case 'state':
      return {
        middleware: ['Redux'],
        stateShape: {},
        keyActions: [],
        selectors: [],
      };
    case 'components':
      return {
        userFeatures: [],
        interactions: [],
      };
    case 'services':
      return {
        dataSource: [],
        operations: [],
        dataFormat: null,
      };
    case 'dependencies':
      return {
        coreDependencies: [],
        tsEquivalents: {},
      };
    default:
      return {};
  }
}

/**
 * Analyze a specific chunk based on its category
 */
async function analyzeChunkByCategory(
  chunk: CodeChunk,
  options: ClaudeOptions,
): Promise<ChunkAnalysisResult | null> {
  const code = chunk.files.map((f) => f.content).join('\n\n');

  switch (chunk.category) {
    case 'entry': {
      const entryPrompt = analysisPrompts.appFunctionality(code);
      return (await analyzeCode(
        code,
        entryPrompt,
        undefined,
        options,
      )) as ChunkAnalysisResult;
    }

    case 'state': {
      const statePrompt = analysisPrompts.stateStructure(code);
      return (await analyzeCode(
        code,
        statePrompt,
        undefined,
        options,
      )) as ChunkAnalysisResult;
    }

    case 'components': {
      const componentPrompt = analysisPrompts.componentFunctionality(code);
      return (await analyzeCode(
        code,
        componentPrompt,
        undefined,
        options,
      )) as ChunkAnalysisResult;
    }

    case 'services': {
      const servicePrompt = analysisPrompts.serviceLayer(code);
      return (await analyzeCode(
        code,
        servicePrompt,
        undefined,
        options,
      )) as ChunkAnalysisResult;
    }

    case 'dependencies': {
      const depPrompt = analysisPrompts.dependencies(code);
      return (await analyzeCode(
        code,
        depPrompt,
        undefined,
        options,
      )) as ChunkAnalysisResult;
    }

    default:
      return null;
  }
}

/**
 * Merge analysis results from different chunks using strategy pattern
 */
function mergeAnalysisResults(
  analysis: Partial<FunctionalAnalysis>,
  result: ChunkAnalysisResult | null,
  category: string,
): void {
  if (!result) {
    return;
  }

  const mergeStrategies: Record<
    string,
    (analysis: Partial<FunctionalAnalysis>, result: ChunkAnalysisResult) => void
  > = {
    entry: mergeEntryResults,
    state: mergeStateResults,
    components: mergeComponentResults,
    services: mergeServiceResults,
    dependencies: mergeDependencyResults,
  };

  const mergeStrategy = mergeStrategies[category];
  if (mergeStrategy) {
    mergeStrategy(analysis, result);
  }
}

/**
 * Fill in default values for missing analysis fields
 */
function fillAnalysisDefaults(
  partial: Partial<FunctionalAnalysis>,
): FunctionalAnalysis {
  return {
    appPurpose: partial.appPurpose || 'Application purpose not determined',
    coreFeatures: partial.coreFeatures || [],
    userWorkflows: partial.userWorkflows || [],
    dataFlow: partial.dataFlow || {
      sources: [],
      transformations: [],
      destinations: [],
    },
    stateManagement: partial.stateManagement || {
      pattern: 'Unknown',
      stateShape: {},
      keyActions: [],
      selectors: [],
    },
    businessLogic: partial.businessLogic || {
      rules: [],
      validations: [],
      calculations: [],
    },
    dependencies: partial.dependencies || {
      dart: [],
      tsEquivalents: {},
    },
  };
}

/**
 * Perform a comprehensive analysis using all chunks at once
 */
export async function comprehensiveAnalysis(
  chunks: CodeChunk[],
  options: AnalysisOptions = {},
): Promise<FunctionalAnalysis> {
  const { model = 'opus', verbose = false, timeout } = options;

  console.log(
    `\n🚀 Running comprehensive analysis with Claude (${model})...\n`,
  );

  // Prepare chunks for analysis
  const chunkData = chunks.map((chunk) => ({
    category: chunk.category,
    code: chunk.files
      .map((f) => f.content)
      .join('\n')
      .substring(0, 3000), // Limit each chunk
  }));

  const prompt = analysisPrompts.comprehensiveAnalysis(chunkData);

  try {
    const options: ClaudeOptions = {
      model,
      verbose,
      outputFormat: 'json',
    };
    if (timeout !== undefined) {
      options.timeout = timeout;
    }
    const result = await executeClaude(prompt, options);

    if (result.error) {
      throw new Error(result.error);
    }

    // Extract and display usage info if available
    if (result.raw) {
      const usage = extractUsageInfo(JSON.parse(result.raw));
      if (verbose && usage.cost) {
        console.log(`\n💰 Analysis cost: ${formatUsageInfo(usage)}\n`);
      }
    }

    const cleaned = cleanJsonResponse(
      typeof result.result === 'string'
        ? result.result
        : JSON.stringify(result.result),
    );

    // Transform comprehensive result to FunctionalAnalysis format
    return transformComprehensiveResult(cleaned as ComprehensiveAnalysisResult);
  } catch (error) {
    console.error('Comprehensive analysis failed:', error);
    throw error;
  }
}

/**
 * Transform comprehensive analysis result to FunctionalAnalysis format
 */
function transformComprehensiveResult(
  result: ComprehensiveAnalysisResult,
): FunctionalAnalysis {
  return {
    appPurpose: result.summary?.appPurpose || 'Unknown',
    coreFeatures: result.features?.map((f) => f.description) || [],
    userWorkflows: result.features?.map((f) => ({
      name: f.name,
      steps: f.userSteps || [],
    })) || [],
    dataFlow: result.dataFlow
      ? {
        sources: result.dataFlow.sources || [],
        transformations: result.dataFlow.processing || [],
        destinations: result.dataFlow.storage ? [result.dataFlow.storage] : [],
      }
      : {
        sources: [],
        transformations: [],
        destinations: [],
      },
    stateManagement: {
      pattern: result.architecture?.pattern || 'Unknown',
      stateShape: {},
      keyActions: [],
      selectors: [],
    },
    businessLogic: {
      rules: [],
      validations: [],
      calculations: [],
    },
    dependencies: result.dependencies
      ? {
        dart: result.dependencies.critical || [],
        tsEquivalents: {}, // We don't have tsEquivalents in the comprehensive result
      }
      : {
        dart: [],
        tsEquivalents: {},
      },
  };
}
