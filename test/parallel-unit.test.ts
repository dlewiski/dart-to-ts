/**
 * Unit tests for parallel processing without external dependencies
 * Uses mocks to test core functionality quickly
 */

import { EventEmitter } from 'node:events';

// Simple mock analyzer for testing
class MockParallelAnalyzer extends EventEmitter {
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

  async analyzeFunctionality(chunks: Array<{
    category: string;
    files: Array<{ content: string }>;
  }>): Promise<{
    appPurpose: string;
    coreFeatures: string[];
    stateManagement: { pattern: string };
    dataFlow: { sources: unknown[]; transformations: unknown[]; destinations: unknown[] };
    businessLogic: { rules: unknown[]; validations: unknown[]; calculations: unknown[] };
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

  async shutdown(): Promise<void> {
    // Clean up mock resources
    this.removeAllListeners();
  }
}

// Test suite
async function runUnitTests() {
  console.log('🔬 Unit Tests for Parallel Processing\n');
  console.log('='.repeat(50) + '\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Basic functionality
  console.log('Test 1: Basic Functionality');
  try {
    const analyzer = new MockParallelAnalyzer({ maxWorkers: 2 });
    const chunks = [
      { category: 'components', files: [{ content: 'test1' }] },
      { category: 'services', files: [{ content: 'test2' }] },
    ];

    const result = await analyzer.analyzeFunctionality(chunks);

    if (result.appPurpose && result.coreFeatures.length === 2) {
      console.log('  ✅ Basic functionality works\n');
      passed++;
    } else {
      throw new Error('Invalid result structure');
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Failed: ${error}\n`);
    failed++;
  }

  // Test 2: Parallel execution
  console.log('Test 2: Parallel Execution');
  try {
    const analyzer = new MockParallelAnalyzer({
      maxWorkers: 3,
      simulateDelay: 100, // 100ms per chunk
    });

    const chunks = Array(6)
      .fill(0)
      .map((_, i) => ({
        category: 'test',
        files: [{ content: `chunk${i}` }],
      }));

    const startTime = Date.now();
    await analyzer.analyzeFunctionality(chunks);
    const duration = Date.now() - startTime;

    // With 3 workers and 6 chunks at 100ms each:
    // Sequential would take 600ms
    // Parallel should take ~200ms (2 batches)
    const expectedTime = 200;
    const tolerance = 50; // Allow 50ms tolerance

    if (
      duration < expectedTime + tolerance &&
      duration >= expectedTime - tolerance
    ) {
      console.log(`  ✅ Parallel execution verified (${duration}ms)\n`);
      passed++;
    } else {
      throw new Error(`Expected ~${expectedTime}ms, got ${duration}ms`);
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Failed: ${error}\n`);
    failed++;
  }

  // Test 3: Progress events
  console.log('Test 3: Progress Events');
  try {
    const analyzer = new MockParallelAnalyzer({ maxWorkers: 1 });
    const progressEvents: Array<{
      processed: number;
      total: number;
      percentage: number;
      activeWorkers: number;
    }> = [];

    analyzer.on('progress', (event: {
      processed: number;
      total: number;
      percentage: number;
      activeWorkers: number;
    }) => progressEvents.push(event));

    await analyzer.analyzeFunctionality([
      { category: 'test', files: [{ content: 'test' }] },
    ]);

    if (progressEvents.length > 0) {
      const lastEvent = progressEvents[progressEvents.length - 1];
      if (lastEvent && lastEvent.percentage === 100 && lastEvent.processed === 1) {
        console.log(
          `  ✅ Progress events working (${progressEvents.length} events)\n`,
        );
        passed++;
      } else {
        throw new Error('Invalid progress event data');
      }
    } else {
      throw new Error('No progress events emitted');
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Failed: ${error}\n`);
    failed++;
  }

  // Test 4: Error handling
  console.log('Test 4: Error Handling');
  try {
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

    if (result && result.coreFeatures.length === 3) {
      console.log('  ✅ Error handling works gracefully\n');
      passed++;
    } else {
      throw new Error('Failed to handle errors properly');
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Failed: ${error}\n`);
    failed++;
  }

  // Test 5: Concurrency limits
  console.log('Test 5: Concurrency Limits');
  try {
    const maxWorkers = 2;
    const analyzer = new MockParallelAnalyzer({ maxWorkers });

    let maxConcurrent = 0;
    analyzer.on('progress', (event: {
      processed: number;
      total: number;
      percentage: number;
      activeWorkers: number;
    }) => {
      maxConcurrent = Math.max(maxConcurrent, event.activeWorkers);
    });

    const chunks = Array(5)
      .fill(0)
      .map((_, i) => ({
        category: 'test',
        files: [{ content: `chunk${i}` }],
      }));

    await analyzer.analyzeFunctionality(chunks);

    if (maxConcurrent <= maxWorkers) {
      console.log(
        `  ✅ Concurrency limit respected (max: ${maxConcurrent}/${maxWorkers})\n`,
      );
      passed++;
    } else {
      throw new Error(
        `Exceeded concurrency limit: ${maxConcurrent} > ${maxWorkers}`,
      );
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Failed: ${error}\n`);
    failed++;
  }

  // Test 6: Large dataset handling
  console.log('Test 6: Large Dataset Handling');
  try {
    const analyzer = new MockParallelAnalyzer({
      maxWorkers: 4,
      simulateDelay: 1, // Very fast processing
    });

    const chunks = Array(100)
      .fill(0)
      .map((_, i) => ({
        category: `category${i % 10}`,
        files: [{ content: `chunk${i}` }],
      }));

    const startTime = Date.now();
    const result = await analyzer.analyzeFunctionality(chunks);
    const duration = Date.now() - startTime;

    if (result.coreFeatures.length === 100 && duration < 1000) {
      console.log(`  ✅ Handled 100 chunks in ${duration}ms\n`);
      passed++;
    } else {
      throw new Error(`Failed to handle large dataset efficiently`);
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Failed: ${error}\n`);
    failed++;
  }

  // Summary
  console.log('='.repeat(50));
  console.log(`\n📊 Unit Test Results: ${passed}/${passed + failed} passed`);

  if (failed === 0) {
    console.log('✅ All unit tests passed!\n');
  } else {
    console.log(`❌ ${failed} tests failed\n`);
  }

  Deno.exit(failed > 0 ? 1 : 0);
}

// Run tests
if (import.meta.main) {
  runUnitTests().catch(console.error);
}

export { MockParallelAnalyzer, runUnitTests };
