import { parentPort } from 'worker_threads';
import {
  type CodeChunk,
  type ChunkAnalysisResult,
  type AnalysisOptions,
} from '../../types';

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
  _options: AnalysisOptions
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
 * Main worker message handler
 * Listens for messages from the main thread and processes them
 */
parentPort?.on('message', async (message: WorkerMessage) => {
  const { chunk, options } = message;

  try {
    const analysis = await analyzeChunk(chunk, options);

    const response: WorkerResult = {
      success: true,
      analysis: analysis || undefined,
      chunkCategory: chunk.category,
    };

    parentPort?.postMessage(response);
  } catch (error) {
    const response: WorkerResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      chunkCategory: chunk.category,
    };

    parentPort?.postMessage(response);
  }
});

/**
 * Handle uncaught exceptions gracefully
 */
process.on('uncaughtException', (error) => {
  console.error('Worker uncaught exception:', error);
  const response: WorkerResult = {
    success: false,
    error: error.message,
    chunkCategory: 'unknown',
  };

  parentPort?.postMessage(response);
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Worker unhandled rejection at:', promise, 'reason:', reason);
  const response: WorkerResult = {
    success: false,
    error: reason instanceof Error ? reason.message : String(reason),
    chunkCategory: 'unknown',
  };

  parentPort?.postMessage(response);
  process.exit(1);
});
