// Worker thread for parallel chunk processing
import { parentPort } from 'worker_threads';
import { CodeChunk, ChunkAnalysisResult } from '../../types';

interface WorkerMessage {
  chunk: CodeChunk;
  options: any;
}

interface WorkerResult {
  success: boolean;
  result?: ChunkAnalysisResult;
  error?: string;
  chunkCategory: string;
}

// Helper function to analyze a chunk (imported from analyzer.ts logic)
async function analyzeChunk(chunk: CodeChunk, options: any): Promise<ChunkAnalysisResult | null> {
  // This would normally call analyzeChunkByCategory but we need to avoid circular deps
  // For now, return a simple mock result for testing
  return {
    appPurpose: `Analysis of ${chunk.category}`,
    initialization: [`Processed ${chunk.files.length} files`],
  };
}

parentPort?.on('message', async (message: WorkerMessage) => {
  const { chunk, options } = message;
  
  try {
    const result = await analyzeChunk(chunk, options);
    
    const response: WorkerResult = {
      success: true,
      result: result || undefined,
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