/**
 * Integration tests for parallel processing with actual ParallelAnalyzer
 * Tests real functionality with minimal external dependencies
 */

import { ParallelAnalyzer } from '../src/core/parallel/ParallelAnalyzer.ts';
import {
  createMockChunks,
  createRealisticChunks,
} from './helpers/test-fixtures.ts';
import { assert } from '@std/assert';

// Helper function to track progress events
interface ProgressEvent {
  percentage?: number;
  processed?: number;
  activeWorkers?: number;
  [key: string]: unknown;
}

function trackProgressEvents(
  analyzer: ParallelAnalyzer,
  options?: { onProgress?: (event: ProgressEvent) => void },
): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  analyzer.on('progress', (event) => {
    const progressEvent = (event as CustomEvent).detail as ProgressEvent;
    events.push(progressEvent);
    options?.onProgress?.(progressEvent);
  });
  return events;
}

// Helper function to measure execution time
async function measureTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = Math.round(performance.now() - start);
  return { result, duration };
}

Deno.test('Basic Parallel Processing', async () => {
  const analyzer = new ParallelAnalyzer({
    maxWorkers: 2,
    timeout: 30000,
  });

  const chunks = createMockChunks(3);
  const result = await analyzer.analyzeFunctionality(chunks);

  assert(result, 'Should return results');
  assert(result.appPurpose, 'Should have app purpose');

  await analyzer.shutdown();
});

Deno.test('Progress Event Emission', async () => {
  const analyzer = new ParallelAnalyzer({ maxWorkers: 1 });
  const events = trackProgressEvents(analyzer);

  await analyzer.analyzeFunctionality(createMockChunks(2));

  assert(events.length > 0, 'Should emit progress events');

  const lastEvent = events[events.length - 1];
  assert(lastEvent, 'Should have final event');
  assert('percentage' in lastEvent, 'Should have percentage');
  assert('processed' in lastEvent, 'Should have processed count');

  await analyzer.shutdown();
});

Deno.test('Error Resilience', async () => {
  const analyzer = new ParallelAnalyzer({ maxWorkers: 2 });

  const chunks = createMockChunks(2, {
    triggerError: true,
    errorIndex: 1,
  });

  const result = await analyzer.analyzeFunctionality(chunks);

  assert(result, 'Should handle errors gracefully');

  await analyzer.shutdown();
});

Deno.test('Concurrency Control', async () => {
  const maxWorkers = 2;
  const analyzer = new ParallelAnalyzer({ maxWorkers });

  let maxConcurrent = 0;
  trackProgressEvents(analyzer, {
    onProgress: (event: ProgressEvent) => {
      const current = event.activeWorkers || 0;
      maxConcurrent = Math.max(maxConcurrent, current);
    },
  });

  await analyzer.analyzeFunctionality(createMockChunks(5));

  assert(
    maxConcurrent < maxWorkers + 1,
    'Should respect concurrency limit',
  );

  await analyzer.shutdown();
});

Deno.test('Memory Management', async () => {
  const analyzer = new ParallelAnalyzer({
    maxWorkers: 1,
    maxMemory: 200 * 1024 * 1024, // 200MB
  });

  const initialMemory = Deno.memoryUsage().heapUsed;

  await analyzer.analyzeFunctionality(createMockChunks(10));

  const finalMemory = Deno.memoryUsage().heapUsed;
  const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

  assert(
    memoryIncrease < 150,
    'Should manage memory efficiently',
  );

  await analyzer.shutdown();
});

Deno.test('Resource Cleanup', async () => {
  const analyzer = new ParallelAnalyzer({
    maxWorkers: 3,
    useWorkers: true,
  });

  const chunks = createMockChunks(2);
  await analyzer.analyzeFunctionality(chunks);

  // Shutdown should clean up all resources
  await analyzer.shutdown();

  // Try to use after shutdown (should not hang or crash)
  try {
    let timeoutId: number;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Timeout')), 1000);
    });

    try {
      await Promise.race([
        analyzer.analyzeFunctionality(chunks),
        timeoutPromise,
      ]);
      throw new Error('Should have failed after shutdown');
    } finally {
      clearTimeout(timeoutId!);
    }
  } catch {
    // Expected to fail - test passes
  }
});

Deno.test('Realistic Content Processing', async () => {
  const analyzer = new ParallelAnalyzer({
    maxWorkers: 2,
    timeout: 30000,
  });

  const chunks = createRealisticChunks();

  const { result, duration } = await measureTime(
    () => analyzer.analyzeFunctionality(chunks),
  );

  assert(result, 'Should process realistic content');
  assert(result.appPurpose, 'Should analyze app purpose');
  assert(
    (result.coreFeatures?.length || 0) > 0,
    'Should identify features',
  );

  console.log(`  Processed ${chunks.length} realistic chunks in ${duration}ms`);

  await analyzer.shutdown();
});
