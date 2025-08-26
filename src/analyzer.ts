import { CodeChunk } from './extractor';
import { analyzeCode, executeClaude, ClaudeOptions } from './claude-cli';
import { analysisPrompts } from './prompts';
import { 
  ResponseCache, 
  ProgressIndicator, 
  cleanJsonResponse,
  formatUsageInfo,
  extractUsageInfo
} from './utils/claude-utils';

export interface StateShape {
  [key: string]: string | StateShape | StateShape[];
}

export interface FunctionalAnalysis {
  appPurpose: string;
  coreFeatures: string[];
  userWorkflows: Array<{
    name: string;
    steps: string[];
  }>;
  dataFlow: {
    sources: string[];
    transformations: string[];
    destinations: string[];
  };
  stateManagement: {
    pattern: string;
    stateShape: StateShape;
    keyActions: string[];
    selectors: string[];
  };
  businessLogic: {
    rules: string[];
    validations: string[];
    calculations: string[];
  };
  dependencies: {
    dart: string[];
    tsEquivalents: Record<string, string>;
  };
}

export interface AnalysisOptions {
  useCache?: boolean;
  verbose?: boolean;
  model?: 'sonnet' | 'opus' | 'haiku';
}

// Initialize cache
const cache = new ResponseCache('.claude-cache', 120); // 2 hour cache

/**
 * Analyze Dart code functionality using Claude CLI
 */
export async function analyzeFunctionality(
  chunks: CodeChunk[], 
  options: AnalysisOptions = {}
): Promise<FunctionalAnalysis> {
  const { 
    useCache = true, 
    verbose = false, 
    model = 'sonnet' 
  } = options;
  
  console.log(`\n🧠 Analyzing ${chunks.length} code chunks using Claude (model: ${model})...\n`);
  
  const progress = new ProgressIndicator(chunks.length);
  const analysis: Partial<FunctionalAnalysis> = {};
  
  // Process each chunk type
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    progress.update(i + 1, `Analyzing ${chunk.category}...`);
    
    try {
      let result: any;
      
      // Check cache first
      const cacheKey = `${chunk.category}_${model}`;
      if (useCache) {
        result = cache.get(chunk.files[0]?.content || '', { category: cacheKey });
      }
      
      if (!result) {
        // Analyze based on category
        result = await analyzeChunkByCategory(chunk, { model, verbose });
        
        // Cache the result
        if (useCache && result) {
          cache.set(chunk.files[0]?.content || '', result, { category: cacheKey });
        }
      }
      
      // Merge results into analysis
      mergeAnalysisResults(analysis, result, chunk.category);
      
    } catch (error) {
      console.error(`\n⚠️  Error analyzing ${chunk.category}:`, error);
      // Log detailed error information for debugging
      if (verbose) {
        console.error('Error details:', {
          category: chunk.category,
          filesCount: chunk.files.length,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
      // Add fallback data for this chunk category
      mergeAnalysisResults(analysis, getDefaultResultForCategory(chunk.category), chunk.category);
    }
  }
  
  progress.complete('Analysis complete!');
  
  // Fill in any missing fields with defaults
  return fillAnalysisDefaults(analysis);
}

/**
 * Get default result for a failed chunk analysis
 */
function getDefaultResultForCategory(category: string): any {
  switch (category) {
    case 'entry':
      return {
        appPurpose: 'Analysis failed - manual review required',
        initialization: []
      };
    case 'state':
      return {
        middleware: ['Redux'],
        stateShape: {},
        keyActions: [],
        selectors: []
      };
    case 'components':
      return {
        userFeatures: [],
        interactions: []
      };
    case 'services':
      return {
        dataSource: [],
        operations: [],
        dataFormat: null
      };
    case 'dependencies':
      return {
        coreDependencies: [],
        tsEquivalents: {}
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
  options: ClaudeOptions
): Promise<any> {
  const code = chunk.files.map(f => f.content).join('\n\n');
  
  switch (chunk.category) {
    case 'entry':
      const entryPrompt = analysisPrompts.appFunctionality(code);
      return await analyzeCode(code, entryPrompt, undefined, options);
    
    case 'state':
      const statePrompt = analysisPrompts.stateStructure(code);
      return await analyzeCode(code, statePrompt, undefined, options);
    
    case 'components':
      const componentPrompt = analysisPrompts.componentFunctionality(code);
      return await analyzeCode(code, componentPrompt, undefined, options);
    
    case 'services':
      const servicePrompt = analysisPrompts.serviceLayer(code);
      return await analyzeCode(code, servicePrompt, undefined, options);
    
    case 'dependencies':
      const depPrompt = analysisPrompts.dependencies(code);
      return await analyzeCode(code, depPrompt, undefined, options);
    
    default:
      return null;
  }
}

/**
 * Merge analysis results from different chunks
 */
function mergeAnalysisResults(
  analysis: Partial<FunctionalAnalysis>,
  result: any,
  category: string
): void {
  if (!result) return;
  
  switch (category) {
    case 'entry':
      if (result.appPurpose) {
        analysis.appPurpose = result.appPurpose;
      }
      if (result.initialization) {
        analysis.coreFeatures = result.initialization;
      }
      break;
    
    case 'state':
      analysis.stateManagement = {
        pattern: result.middleware?.join(', ') || 'Redux',
        stateShape: result.stateShape || {},
        keyActions: result.keyActions || [],
        selectors: result.selectors || []
      };
      break;
    
    case 'components':
      if (result.userFeatures) {
        analysis.coreFeatures = [...(analysis.coreFeatures || []), ...result.userFeatures];
      }
      if (result.interactions) {
        analysis.userWorkflows = [{
          name: 'User Interactions',
          steps: result.interactions
        }];
      }
      break;
    
    case 'services':
      analysis.dataFlow = {
        sources: result.dataSource || [],
        transformations: result.operations || [],
        destinations: result.dataFormat ? ['API responses'] : []
      };
      break;
    
    case 'dependencies':
      analysis.dependencies = {
        dart: result.coreDependencies || [],
        tsEquivalents: result.tsEquivalents || {}
      };
      break;
  }
}

/**
 * Fill in default values for missing analysis fields
 */
function fillAnalysisDefaults(
  partial: Partial<FunctionalAnalysis>
): FunctionalAnalysis {
  return {
    appPurpose: partial.appPurpose || 'Application purpose not determined',
    coreFeatures: partial.coreFeatures || [],
    userWorkflows: partial.userWorkflows || [],
    dataFlow: partial.dataFlow || {
      sources: [],
      transformations: [],
      destinations: []
    },
    stateManagement: partial.stateManagement || {
      pattern: 'Unknown',
      stateShape: {},
      keyActions: [],
      selectors: []
    },
    businessLogic: partial.businessLogic || {
      rules: [],
      validations: [],
      calculations: []
    },
    dependencies: partial.dependencies || {
      dart: [],
      tsEquivalents: {}
    }
  };
}

/**
 * Perform a comprehensive analysis using all chunks at once
 */
export async function comprehensiveAnalysis(
  chunks: CodeChunk[],
  options: AnalysisOptions = {}
): Promise<FunctionalAnalysis> {
  const { model = 'opus', verbose = false } = options;
  
  console.log(`\n🚀 Running comprehensive analysis with Claude (${model})...\n`);
  
  // Prepare chunks for analysis
  const chunkData = chunks.map(chunk => ({
    category: chunk.category,
    code: chunk.files.map(f => f.content).join('\n').substring(0, 3000) // Limit each chunk
  }));
  
  const prompt = analysisPrompts.comprehensiveAnalysis(chunkData);
  
  try {
    const result = await executeClaude(prompt, {
      model,
      verbose,
      outputFormat: 'json'
    });
    
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
      typeof result.result === 'string' ? result.result : JSON.stringify(result.result)
    );
    
    // Transform comprehensive result to FunctionalAnalysis format
    return transformComprehensiveResult(cleaned);
    
  } catch (error) {
    console.error('Comprehensive analysis failed:', error);
    throw error;
  }
}

/**
 * Transform comprehensive analysis result to FunctionalAnalysis format
 */
function transformComprehensiveResult(result: any): FunctionalAnalysis {
  return {
    appPurpose: result.summary?.appPurpose || 'Unknown',
    coreFeatures: result.features?.map((f: any) => f.description) || [],
    userWorkflows: result.features?.map((f: any) => ({
      name: f.name,
      steps: f.userSteps || []
    })) || [],
    dataFlow: result.dataFlow || {
      sources: [],
      transformations: [],
      destinations: []
    },
    stateManagement: {
      pattern: result.architecture?.pattern || 'Unknown',
      stateShape: {},
      keyActions: [],
      selectors: []
    },
    businessLogic: {
      rules: [],
      validations: [],
      calculations: []
    },
    dependencies: result.dependencies || {
      dart: [],
      tsEquivalents: {}
    }
  };
}