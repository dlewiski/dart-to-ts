/**
 * Simple, robust test for parallel processing functionality
 * Tests core features without external dependencies
 */

import { ParallelAnalyzer } from '../src/core/parallel/ParallelAnalyzer.ts';
import { type CodeChunk } from '../src/types/index.ts';

// Mock data for testing
function createMockChunks(count: number): CodeChunk[] {
  return Array.from({ length: count }, (_, i) => ({
    category: i % 2 === 0 ? 'components' : 'services',
    files: [
      {
        path: `file${i}.dart`,
        content: `class TestClass${i} { 
        void method() { 
          print('Test ${i}'); 
        } 
      }`,
      },
    ],
    context: `Test chunk ${i}`,
  }));
}

// Test runner
async function runRobustTests() {
  console.log('🧪 Running Robust Parallel Processing Tests\n');
  console.log('='.repeat(50) + '\n');

  const results = {
    passed: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Test 1: Basic Functionality
  await runTest(
    'Basic Parallel Processing',
    async () => {
      const analyzer = new ParallelAnalyzer({
        maxWorkers: 2,
        timeout: 30000,
      });

      const chunks = createMockChunks(3);
      const result = await analyzer.analyzeFunctionality(chunks);

      await analyzer.shutdown();

      // Verify we got results
      if (!result || !result.appPurpose) {
        throw new Error('No results returned');
      }

      return true;
    },
    results,
  );

  // Test 2: Progress Events
  await runTest(
    'Progress Event Emission',
    async () => {
      const analyzer = new ParallelAnalyzer({ maxWorkers: 1 });
      const events: Array<{
        processed: number;
        total: number;
        percentage: number;
        activeWorkers?: number;
      }> = [];

      analyzer.on('progress', (event: CustomEvent) => {
        const detail = event.detail as {
          processed: number;
          total: number;
          percentage: number;
          activeWorkers?: number;
        };
        events.push(detail);
      });

      const chunks = createMockChunks(2);
      await analyzer.analyzeFunctionality(chunks);
      await analyzer.shutdown();

      if (events.length === 0) {
        throw new Error('No progress events emitted');
      }

      // Verify event structure
      const lastEvent = events[events.length - 1];
      if (!lastEvent || !('percentage' in lastEvent) || !('processed' in lastEvent)) {
        throw new Error('Invalid progress event structure');
      }

      return true;
    },
    results,
  );

  // Test 3: Error Resilience
  await runTest(
    'Error Handling',
    async () => {
      const analyzer = new ParallelAnalyzer({ maxWorkers: 2 });

      // Mix valid and invalid chunks
      const chunks: CodeChunk[] = [
        {
          category: 'components',
          files: [{ path: 'valid.dart', content: 'class Valid {}' }],
          context: 'Valid chunk',
        },
        {
          category: 'services',
          files: [{ path: 'error.dart', content: 'TRIGGER_ERROR' }],
          context: 'Should handle gracefully',
        },
      ];

      const result = await analyzer.analyzeFunctionality(chunks);
      await analyzer.shutdown();

      // Should still return results despite error
      if (!result) {
        throw new Error('Failed to handle errors gracefully');
      }

      return true;
    },
    results,
  );

  // Test 4: Concurrency Control
  await runTest(
    'Concurrency Limits',
    async () => {
      const maxWorkers = 2;
      const analyzer = new ParallelAnalyzer({ maxWorkers });

      let maxConcurrent = 0;
      let currentConcurrent = 0;

      analyzer.on('progress', (event: CustomEvent) => {
        const detail = event.detail as {
          processed: number;
          total: number;
          percentage: number;
          activeWorkers?: number;
        };
        currentConcurrent = detail.activeWorkers || 0;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      });

      const chunks = createMockChunks(5);
      await analyzer.analyzeFunctionality(chunks);
      await analyzer.shutdown();

      // Verify concurrency never exceeded limit
      if (maxConcurrent > maxWorkers) {
        throw new Error(
          `Concurrency exceeded limit: ${maxConcurrent} > ${maxWorkers}`,
        );
      }

      return true;
    },
    results,
  );

  // Test 5: Memory Management
  await runTest(
    'Memory Limits',
    async () => {
      const analyzer = new ParallelAnalyzer({
        maxWorkers: 1,
        maxMemory: 200 * 1024 * 1024, // 200MB
      });

      const initialMemory = Deno.memoryUsage().heapUsed;

      // Process moderate amount of data
      const chunks = createMockChunks(10);
      await analyzer.analyzeFunctionality(chunks);

      const finalMemory = Deno.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      await analyzer.shutdown();

      // Memory increase should be reasonable
      if (memoryIncrease > 150) {
        throw new Error(
          `Excessive memory usage: ${memoryIncrease.toFixed(1)}MB`,
        );
      }

      return true;
    },
    results,
  );

  // Test 6: Shutdown Cleanup
  await runTest(
    'Resource Cleanup',
    async () => {
      const analyzer = new ParallelAnalyzer({
        maxWorkers: 3,
        useWorkers: true, // Enable actual workers
      });

      const chunks = createMockChunks(2);
      await analyzer.analyzeFunctionality(chunks);

      // Shutdown should clean up all resources
      await analyzer.shutdown();

      // Try to use after shutdown (should not hang or crash)
      try {
        await analyzer.analyzeFunctionality(chunks);
      } catch {
        // Expected to fail after shutdown
      }

      // For now, we just ensure shutdown completes without error
      return true;
    },
    results,
  );

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    results.errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Exit with appropriate code
  Deno.exit(results.failed > 0 ? 1 : 0);
}

// Helper function to run individual tests
async function runTest(
  name: string,
  testFn: () => Promise<boolean>,
  results: { passed: number; failed: number; errors: string[] },
) {
  await Deno.stdout.write(new TextEncoder().encode(`Testing: ${name}...`));

  try {
    const startTime = Date.now();
    await testFn();
    const duration = Date.now() - startTime;

    console.log(` ✅ (${duration}ms)`);
    results.passed++;
  } catch (error) {
    console.log(` ❌`);
    const errorMsg = `${name}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.log(`  Error: ${errorMsg}`);
    results.errors.push(errorMsg);
    results.failed++;
  }
}

// Run tests if executed directly
if (import.meta.main) {
  runRobustTests().catch((error) => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}

export { runRobustTests };
