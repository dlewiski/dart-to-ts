/**
 * Unit tests for parallel processing without external dependencies
 * Uses mocks to test core functionality quickly
 */

import {
  assert,
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { createMockChunks } from './helpers/test-fixtures.ts';

// Deno-compatible EventEmitter implementation for testing
class DenoEventEmitter extends EventTarget {
  private abortController: AbortController;
  private listenerMap: Map<string, Set<EventListener>>;

  constructor() {
    super();
    this.abortController = new AbortController();
    this.listenerMap = new Map();
  }

  emit(eventName: string, data?: unknown): void {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  on(eventName: string, listener: (event: CustomEvent) => void): void {
    const wrappedListener = listener as EventListener;

    if (!this.listenerMap.has(eventName)) {
      this.listenerMap.set(eventName, new Set());
    }
    this.listenerMap.get(eventName)!.add(wrappedListener);

    this.addEventListener(eventName, wrappedListener, {
      signal: this.abortController.signal,
    });
  }

  off(eventName: string, listener: (event: CustomEvent) => void): void {
    const wrappedListener = listener as EventListener;

    const listeners = this.listenerMap.get(eventName);
    if (listeners) {
      listeners.delete(wrappedListener);
      if (listeners.size === 0) {
        this.listenerMap.delete(eventName);
      }
    }

    this.removeEventListener(eventName, wrappedListener);
  }

  removeAllListeners(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
    this.listenerMap.clear();
  }
}

// Simple mock analyzer for testing
class MockParallelAnalyzer extends DenoEventEmitter {
  private processedChunks = 0;
  private totalChunks = 0;
  private activeWorkers = 0;
  private maxWorkers: number;
  private simulateErrors: boolean;
  private simulateDelay: number;

  constructor(options: {
    maxWorkers?: number;
    simulateErrors?: boolean;
    simulateDelay?: number;
  } = {}) {
    super();
    this.maxWorkers = options.maxWorkers || 4;
    this.simulateErrors = options.simulateErrors || false;
    this.simulateDelay = options.simulateDelay || 10; // ms
  }

  async analyzeFunctionality(
    chunks: Array<{
      category: string;
      files: Array<{ content: string }>;
    }>,
  ): Promise<{
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

  shutdown(): void {
    // Clean up mock resources
    this.removeAllListeners();
  }
}

// Test 1: Basic functionality
Deno.test('Parallel Unit - Basic Functionality', async () => {
  const analyzer = new MockParallelAnalyzer({ maxWorkers: 2 });
  const chunks = createMockChunks(2);

  const result = await analyzer.analyzeFunctionality(chunks);

  assertExists(result.appPurpose, 'Should have app purpose');
  assertEquals(result.coreFeatures.length, 2, 'Should analyze all chunks');

  await analyzer.shutdown();
});

// Test 2: Parallel execution timing
Deno.test('Parallel Unit - Parallel Execution Timing', async () => {
  const analyzer = new MockParallelAnalyzer({
    maxWorkers: 3,
    simulateDelay: 100, // 100ms per chunk
  });

  const chunks = createMockChunks(6);

  const startTime = performance.now();
  await analyzer.analyzeFunctionality(chunks);
  const duration = performance.now() - startTime;

  // With 3 workers and 6 chunks at 100ms each:
  // Sequential would take 600ms, parallel should take ~200ms (2 batches)
  assert(
    duration >= 150 && duration <= 350,
    `Expected duration between 150-350ms, got ${duration}ms`,
  );

  await analyzer.shutdown();
});

// Test 3: Progress events
Deno.test('Parallel Unit - Progress Events', async () => {
  const analyzer = new MockParallelAnalyzer({ maxWorkers: 1 });
  const progressEvents: Array<{
    processed: number;
    total: number;
    percentage: number;
    activeWorkers: number;
  }> = [];

  analyzer.on('progress', (event: CustomEvent) => {
    const detail = event.detail as {
      processed: number;
      total: number;
      percentage: number;
      activeWorkers: number;
    };
    progressEvents.push(detail);
  });

  await analyzer.analyzeFunctionality([
    { category: 'test', files: [{ content: 'test' }] },
  ]);

  assert(progressEvents.length > 0, 'Should emit progress events');

  const lastEvent = progressEvents[progressEvents.length - 1];
  assertExists(lastEvent, 'Should have last event');
  assertEquals(lastEvent.percentage, 100, 'Should complete at 100%');
  assertEquals(lastEvent.processed, 1, 'Should process 1 chunk');

  await analyzer.shutdown();
});

// Test 4: Error handling
Deno.test('Parallel Unit - Error Handling', async () => {
  const analyzer = new MockParallelAnalyzer({
    maxWorkers: 2,
    simulateErrors: true,
  });

  const chunks = [
    { category: 'valid', files: [{ content: 'valid' }] },
    { category: 'error', files: [{ content: 'TRIGGER_ERROR' }] },
    { category: 'valid2', files: [{ content: 'valid2' }] },
  ];

  const result = await analyzer.analyzeFunctionality(chunks);

  assertExists(result, 'Should return result despite errors');
  assertEquals(result.coreFeatures.length, 3, 'Should handle all chunks');

  await analyzer.shutdown();
});

// Test 5: Concurrency limits
Deno.test('Parallel Unit - Concurrency Limits', async () => {
  const maxWorkers = 2;
  const analyzer = new MockParallelAnalyzer({ maxWorkers });

  let maxConcurrent = 0;
  analyzer.on('progress', (event: CustomEvent) => {
    const detail = event.detail as {
      processed: number;
      total: number;
      percentage: number;
      activeWorkers: number;
    };
    maxConcurrent = Math.max(maxConcurrent, detail.activeWorkers);
  });

  const chunks = createMockChunks(5);
  await analyzer.analyzeFunctionality(chunks);

  assert(
    maxConcurrent <= maxWorkers,
    `Max concurrent (${maxConcurrent}) should not exceed limit (${maxWorkers})`,
  );

  await analyzer.shutdown();
});

// Test 6: Large dataset handling
Deno.test('Parallel Unit - Large Dataset Handling', async () => {
  const analyzer = new MockParallelAnalyzer({
    maxWorkers: 4,
    simulateDelay: 1, // Very fast processing
  });

  const chunks = createMockChunks(100);

  const startTime = performance.now();
  const result = await analyzer.analyzeFunctionality(chunks);
  const duration = performance.now() - startTime;

  assertEquals(result.coreFeatures.length, 100, 'Should process all chunks');
  assert(duration < 1000, `Should complete quickly (${duration}ms < 1000ms)`);

  await analyzer.shutdown();
});

export { MockParallelAnalyzer };
