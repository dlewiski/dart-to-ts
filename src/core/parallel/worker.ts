// Deno Worker script - replaces Node.js worker_threads approach

import {
  type AnalysisOptions,
  type ChunkAnalysisResult,
  type ClaudeOptions,
  type CodeChunk,
} from '../../types/index.ts';
import { analyzeCode } from '../../claude-cli.ts';
import { analysisPrompts } from '../../prompts.ts';

/**
 * Message received from the main thread containing work to process
 */
interface WorkerMessage {
  chunk: CodeChunk;
  options: AnalysisOptions;
}

/**
 * Result sent back to main thread after processing
 */
interface WorkerResult {
  success: boolean;
  analysis?: ChunkAnalysisResult;
  error?: string;
  chunkCategory: string;
}

/**
 * Analyze a single chunk of code using Claude API
 * Implements the core analysis logic from the main analyzer
 *
 * @param chunk The code chunk to analyze
 * @param options Analysis options
 * @returns Promise resolving to analysis result or null
 */
async function analyzeChunk(
  chunk: CodeChunk,
  options: AnalysisOptions,
): Promise<ChunkAnalysisResult | null> {
  try {
    // Combine all file contents for analysis
    const code = chunk.files.map((f) => f.content).join('\n\n');

    // Convert AnalysisOptions to ClaudeOptions for the API call
    const claudeOptions: ClaudeOptions = {
      model: options.model || 'sonnet',
      verbose: options.verbose || false,
      timeout: options.timeout || 600000,
    };

    // Select appropriate prompt based on chunk category
    let prompt: string;
    switch (chunk.category) {
      case 'entry':
        prompt = analysisPrompts.appFunctionality(code);
        break;
      case 'state':
        prompt = analysisPrompts.stateStructure(code);
        break;
      case 'components':
        prompt = analysisPrompts.componentFunctionality(code);
        break;
      case 'services':
        prompt = analysisPrompts.serviceLayer(code);
        break;
      case 'models':
        prompt = analysisPrompts.businessLogic(code);
        break;
      default:
        // Generic analysis for unknown categories
        prompt =
          `Analyze this ${chunk.category} code from a Flutter application.
${chunk.context ? `Context: ${chunk.context}\n` : ''}

Please identify:
1. The main purpose and functionality
2. Key patterns and architectural decisions
3. Dependencies and external services used
4. Business logic and data flow

Code to analyze:
\`\`\`dart
${code}
\`\`\``;
    }

    // Call Claude API for analysis
    const result = await analyzeCode(
      code,
      prompt,
      undefined,
      claudeOptions,
    );

    // Validate result type
    if (result && typeof result === 'object' && result !== null) {
      return result as ChunkAnalysisResult;
    }

    return null;
  } catch (error) {
    console.error(`Error analyzing chunk ${chunk.category}:`, error);
    return null;
  }
}

/**
 * Main worker message handler for Deno
 * Listens for messages from the main thread and processes them
 */
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { chunk, options } = event.data;

  try {
    const analysis = await analyzeChunk(chunk, options);

    const response: WorkerResult = analysis
      ? {
        success: true,
        analysis: analysis,
        chunkCategory: chunk.category,
      }
      : {
        success: false,
        error: 'Analysis returned null',
        chunkCategory: chunk.category,
      };

    self.postMessage(response);
  } catch (error) {
    const response: WorkerResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      chunkCategory: chunk.category,
    };

    self.postMessage(response);
  }
});

/**
 * Handle uncaught exceptions gracefully in Deno worker
 */
self.addEventListener('error', (error) => {
  console.error('Worker uncaught exception:', error);
  const response: WorkerResult = {
    success: false,
    error: error.message || 'Unknown error',
    chunkCategory: 'unknown',
  };

  self.postMessage(response);
});

/**
 * Handle unhandled promise rejections in Deno worker
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('Worker unhandled rejection:', event.reason);
  const response: WorkerResult = {
    success: false,
    error: event.reason instanceof Error
      ? event.reason.message
      : String(event.reason),
    chunkCategory: 'unknown',
  };

  self.postMessage(response);
});
