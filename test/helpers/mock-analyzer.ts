/**
 * Mock analyzer for unit testing without external dependencies
 */

import { type CodeChunk } from '../../src/types/index.ts';

// Deno-compatible EventEmitter implementation
export class DenoEventEmitter extends EventTarget {
  emit(eventName: string, data?: unknown): void {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  on(eventName: string, listener: (event: CustomEvent) => void): void {
    this.addEventListener(eventName, listener as EventListener);
  }

  off(eventName: string, listener: (event: CustomEvent) => void): void {
    this.removeEventListener(eventName, listener as EventListener);
  }

  removeAllListeners(): void {
    // Note: EventTarget doesn't provide a direct way to remove all listeners
    // This is a simplified implementation for testing
  }
}

/**
 * Mock parallel analyzer for testing
 */
export class MockParallelAnalyzer extends DenoEventEmitter {
  private processedChunks = 0;
  private totalChunks = 0;
  private activeWorkers = 0;
  private maxWorkers: number;
  private simulateErrors: boolean;
  private simulateDelay: number;
  private throwOnError: boolean;

  constructor(options: {
    maxWorkers?: number;
    simulateErrors?: boolean;
    simulateDelay?: number;
    throwOnError?: boolean;
  } = {}) {
    super();
    this.maxWorkers = options.maxWorkers || 4;
    this.simulateErrors = options.simulateErrors || false;
    this.simulateDelay = options.simulateDelay || 10; // ms
    this.throwOnError = options.throwOnError || false;
  }

  async analyzeFunctionality(chunks: CodeChunk[]): Promise<{
    appPurpose: string;
    coreFeatures: string[];
    stateManagement: { pattern: string };
    dataFlow: {
      sources: unknown[];
      transformations: unknown[];
      destinations: unknown[];
    };
    businessLogic: {
      rules: unknown[];
      validations: unknown[];
      calculations: unknown[];
    };
    dependencies: { dart: unknown[]; tsEquivalents: Record<string, unknown> };
  }> {
    this.totalChunks = chunks.length;
    this.processedChunks = 0;

    // Simulate parallel processing
    const batchSize = Math.min(this.maxWorkers, chunks.length);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));

      // Process batch "in parallel"
      await Promise.all(
        batch.map(async (chunk) => {
          this.activeWorkers++;
          this.emitProgress();

          // Simulate processing time
          await new Promise((resolve) =>
            setTimeout(resolve, this.simulateDelay)
          );

          // Simulate error for testing
          if (
            this.simulateErrors &&
            chunk.files[0]?.content === 'TRIGGER_ERROR'
          ) {
            if (this.throwOnError) {
              throw new Error('Simulated processing error');
            }
            // Handle error but continue
          }

          this.processedChunks++;
          this.activeWorkers--;
          this.emitProgress();
        }),
      );
    }

    return {
      appPurpose: 'Mock analysis complete',
      coreFeatures: chunks.map((c) => `Analyzed ${c.category}`),
      stateManagement: { pattern: 'Mock' },
      dataFlow: { sources: [], transformations: [], destinations: [] },
      businessLogic: { rules: [], validations: [], calculations: [] },
      dependencies: { dart: [], tsEquivalents: {} },
    };
  }

  private emitProgress(): void {
    const percentage = this.totalChunks > 0
      ? (this.processedChunks / this.totalChunks) * 100
      : 0;

    this.emit('progress', {
      processed: this.processedChunks,
      total: this.totalChunks,
      percentage,
      activeWorkers: this.activeWorkers,
    });
  }

  getActiveWorkers(): number {
    return this.activeWorkers;
  }

  getProcessedCount(): number {
    return this.processedChunks;
  }

  shutdown(): void {
    // Clean up mock resources
    this.activeWorkers = 0;
    this.processedChunks = 0;
    this.totalChunks = 0;
    this.removeAllListeners();
  }
}

/**
 * Create a simple test worker for mechanism testing
 */
export function createTestWorkerCode(): string {
  return `
    self.addEventListener('message', (event) => {
      const { data } = event;
      
      // Simulate some processing
      setTimeout(() => {
        self.postMessage({
          success: true,
          result: \`Processed: \${data.message}\`,
          timestamp: Date.now()
        });
      }, 100);
    });
  `;
}

/**
 * Creates a test worker with Deno permissions
 */
export function createTestWorker(
  workerCode: string = createTestWorkerCode(),
): { worker: Worker; url: string } {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);

  const worker = new Worker(workerUrl, {
    type: 'module',
    // @ts-ignore - Deno-specific option
    deno: {
      permissions: {
        read: false,
        write: false,
        net: false,
        run: false,
      },
    },
  });

  return { worker, url: workerUrl };
}

/**
 * Cleanup worker resources
 */
export function cleanupWorker(worker: Worker, url: string): void {
  worker.terminate();
  URL.revokeObjectURL(url);
}
