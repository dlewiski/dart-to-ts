/**
 * Consolidated test helpers and utilities
 */

import { type CodeChunk } from '../src/types/index.ts';

// Simple test data
export const SIMPLE_CHUNKS: CodeChunk[] = [
  {
    category: 'components',
    files: [{
      path: 'component.dart',
      content: 'class TestComponent { void build() {} }',
    }],
    context: 'Test component',
  },
  {
    category: 'services',
    files: [{
      path: 'service.dart',
      content: 'class TestService { Future<String> getData() async {} }',
    }],
    context: 'Test service',
  },
];

export const ERROR_CHUNK: CodeChunk = {
  category: 'error',
  files: [{ path: 'error.dart', content: 'TRIGGER_ERROR' }],
  context: 'Error test chunk',
};

/**
 * Creates mock code chunks for testing
 */
export function createMockChunks(count: number, options: {
  triggerError?: boolean;
  errorIndex?: number;
} = {}): CodeChunk[] {
  const { triggerError = false, errorIndex = 1 } = options;

  return Array.from({ length: count }, (_, i) => ({
    category: i % 2 === 0 ? 'components' : 'services',
    files: [{
      path: `test_${i}.dart`,
      content: triggerError && i === errorIndex
        ? 'TRIGGER_ERROR'
        : `class Test${i} { void method() {} }`,
    }],
    context: `Test chunk ${i}`,
  }));
}

/**
 * Unified EventEmitter for tests
 */
export class TestEventEmitter extends EventTarget {
  emit(eventName: string, data?: unknown): void {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  on(eventName: string, listener: (event: CustomEvent) => void): void {
    this.addEventListener(eventName, listener as EventListener);
  }

  off(eventName: string, listener: (event: CustomEvent) => void): void {
    this.removeEventListener(eventName, listener as EventListener);
  }
}

/**
 * Mock analyzer for testing parallel processing
 */
export class MockAnalyzer extends TestEventEmitter {
  private processedChunks = 0;
  private totalChunks = 0;
  private activeWorkers = 0;
  private maxWorkers: number;
  private simulateDelay: number;

  constructor(options: { maxWorkers?: number; simulateDelay?: number } = {}) {
    super();
    this.maxWorkers = options.maxWorkers || 4;
    this.simulateDelay = options.simulateDelay || 10;
  }

  async analyzeFunctionality(chunks: CodeChunk[]) {
    this.totalChunks = chunks.length;
    this.processedChunks = 0;

    // Simulate parallel processing
    const batchSize = Math.min(this.maxWorkers, chunks.length);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));

      await Promise.all(batch.map(async (chunk) => {
        this.activeWorkers++;
        this.emitProgress();

        await new Promise((resolve) => setTimeout(resolve, this.simulateDelay));

        if (chunk.files[0]?.content === 'TRIGGER_ERROR') {
          throw new Error('Simulated error');
        }

        this.processedChunks++;
        this.activeWorkers--;
        this.emitProgress();
      }));
    }

    return {
      appPurpose: 'Test analysis',
      coreFeatures: chunks.map((c) => c.category),
      stateManagement: { pattern: 'Test' },
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
}

/**
 * Simple worker utilities
 */
export function createTestWorker(): { worker: Worker; url: string } {
  const workerCode = `
    self.addEventListener('message', (event) => {
      setTimeout(() => {
        self.postMessage({ 
          success: true, 
          result: \`Processed: \${event.data.message}\` 
        });
      }, 100);
    });
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { type: 'module' });

  return { worker, url };
}

export function cleanupWorker(worker: Worker, url: string): void {
  worker.terminate();
  URL.revokeObjectURL(url);
}
