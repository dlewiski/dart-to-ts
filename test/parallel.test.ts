/**
 * Comprehensive parallel processing tests
 */

import { assert, assertEquals } from '@std/assert';
import { ParallelAnalyzer } from '../src/core/parallel/ParallelAnalyzer.ts';
import {
  createMockChunks,
  ERROR_CHUNK,
  MockAnalyzer,
  SIMPLE_CHUNKS,
} from './test-helpers.ts';

// Helper to track progress events
function trackProgress(analyzer: ParallelAnalyzer | MockAnalyzer) {
  const events: { percentage?: number; activeWorkers?: number }[] = [];
  analyzer.on('progress', (event) => {
    events.push((event as CustomEvent).detail);
  });
  return events;
}

// Helper to measure execution time
async function measureTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = Math.round(performance.now() - start);
  return { result, duration };
}

// Unit tests with mocks (fast)
Deno.test('Parallel Unit - Basic Processing', async () => {
  const analyzer = new MockAnalyzer({ maxWorkers: 2 });
  const result = await analyzer.analyzeFunctionality(SIMPLE_CHUNKS);

  assertEquals(result.appPurpose, 'Test analysis');
  assertEquals(result.coreFeatures, ['components', 'services']);
});

Deno.test('Parallel Unit - Progress Events', async () => {
  const analyzer = new MockAnalyzer({ maxWorkers: 1, simulateDelay: 50 });
  const events = trackProgress(analyzer);

  await analyzer.analyzeFunctionality(createMockChunks(3));

  assert(events.length > 0, 'Should emit progress events');
  assert(events.some((e) => e.percentage === 100), 'Should reach 100%');
});

Deno.test('Parallel Unit - Error Handling', async () => {
  const analyzer = new MockAnalyzer();
  const chunks = [SIMPLE_CHUNKS[0]!, ERROR_CHUNK];

  try {
    await analyzer.analyzeFunctionality(chunks);
    assert(false, 'Should throw error');
  } catch (error) {
    assert(error instanceof Error);
    assertEquals(error.message, 'Simulated error');
  }
});

Deno.test('Parallel Unit - Concurrency Control', async () => {
  const analyzer = new MockAnalyzer({ maxWorkers: 2, simulateDelay: 100 });
  const events = trackProgress(analyzer);

  await analyzer.analyzeFunctionality(createMockChunks(5));

  // Should never exceed max workers
  const maxActiveWorkers = Math.max(...events.map((e) => e.activeWorkers || 0));
  assert(
    maxActiveWorkers <= 2,
    `Max workers should be 2, got ${maxActiveWorkers}`,
  );
});

// Integration tests with real ParallelAnalyzer
Deno.test('Parallel Integration - Real Processing', async () => {
  const analyzer = new ParallelAnalyzer({ maxWorkers: 2, timeout: 30000 });

  try {
    const result = await analyzer.analyzeFunctionality(SIMPLE_CHUNKS);
    assert(result, 'Should return results');
    assert(result.appPurpose, 'Should have app purpose');
  } finally {
    await analyzer.shutdown();
  }
});

Deno.test('Parallel Integration - Concurrency Limits', async () => {
  const analyzer = new ParallelAnalyzer({ maxWorkers: 1, timeout: 30000 });
  const events = trackProgress(analyzer);

  try {
    await analyzer.analyzeFunctionality(createMockChunks(3));

    // With max workers = 1, active workers should never exceed 1
    const maxActive = Math.max(...events.map((e) => e.activeWorkers || 0));
    assert(maxActive <= 1, `Should not exceed 1 worker, got ${maxActive}`);
  } finally {
    await analyzer.shutdown();
  }
});

// Performance benchmark (lightweight)
Deno.test('Parallel Integration - Performance', async () => {
  const chunks = createMockChunks(5);

  // Test with different worker counts
  const configs = [
    { workers: 1, label: 'Sequential' },
    { workers: 3, label: 'Parallel' },
  ];

  const results: { workers: number; label: string; duration: number }[] = [];

  for (const config of configs) {
    const analyzer = new ParallelAnalyzer({
      maxWorkers: config.workers,
      timeout: 30000,
    });

    try {
      const { duration } = await measureTime(async () => {
        return await analyzer.analyzeFunctionality(chunks);
      });

      results.push({ ...config, duration });
    } finally {
      await analyzer.shutdown();
    }
  }

  // Just verify both configurations complete successfully
  assert(results.length === 2, 'Both configurations should complete');
  assert(
    results.every((r) => r.duration > 0),
    'All should have positive duration',
  );

  console.log('Performance results:', results);
});
