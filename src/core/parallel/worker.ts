// Deno Worker script - replaces Node.js worker_threads approach

import {
  type AnalysisOptions,
  type ChunkAnalysisResult,
  type CodeChunk,
} from '../../types/index.ts';

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
 * Analyze a single chunk of code
 * This would normally call analyzeChunkByCategory from the main analyzer
 * but we avoid circular dependencies by implementing core logic here.
 *
 * @param chunk The code chunk to analyze
 * @param options Analysis options
 * @returns Promise resolving to analysis result or null
 */
async function analyzeChunk(
  chunk: CodeChunk,
  _options: AnalysisOptions,
): Promise<ChunkAnalysisResult | null> {
  try {
    // For now, return a mock result for testing
    // In production, this would contain actual analysis logic
    const result: ChunkAnalysisResult = {
      appPurpose: `Analysis of ${chunk.category} chunk`,
      initialization: [
        `Processed ${chunk.files.length} files in ${chunk.category}`,
      ],
    };

    // Simulate processing time based on chunk size
    const processingTime = Math.min(100, chunk.files.length * 10);
    await new Promise((resolve) => setTimeout(resolve, processingTime));

    return result;
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

    const response: WorkerResult = {
      success: true,
      analysis: analysis || undefined,
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
    error: event.reason instanceof Error ? event.reason.message : String(event.reason),
    chunkCategory: 'unknown',
  };

  self.postMessage(response);
});
