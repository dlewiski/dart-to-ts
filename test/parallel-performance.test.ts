/**
 * Performance comparison test for parallel vs sequential processing
 * Measures actual time improvements and resource usage
 */

import { ParallelAnalyzer } from '../src/core/parallel/ParallelAnalyzer.ts';
import { analyzeFunctionality } from '../src/analyzer.ts';
import { createRealisticChunks } from './helpers/test-fixtures.ts';
import { timing } from './helpers/test-runner.ts';

interface PerformanceResult {
  config: string;
  chunks: number;
  workers: number;
  sequentialTime: number;
  parallelTime: number;
  speedup: string;
  sequentialMem: string;
  parallelMem: string;
  memoryRatio: string;
}

async function runPerformanceTests() {
  console.log('⚡ Parallel Processing Performance Tests\n');
  console.log('='.repeat(50) + '\n');

  // Test configurations
  const testConfigs = [
    { chunks: 2, workers: 2, name: 'Small (2 chunks)' },
    { chunks: 5, workers: 3, name: 'Medium (5 chunks)' },
    { chunks: 10, workers: 4, name: 'Large (10 chunks)' },
  ];

  const results: PerformanceResult[] = [];

  for (const config of testConfigs) {
    console.log(`\n📊 Testing: ${config.name}`);
    console.log('-'.repeat(40));

    // Use realistic chunks for better performance testing
    const allChunks = createRealisticChunks();
    const chunks = allChunks.slice(0, config.chunks);

    // Test 1: Sequential processing (baseline)
    console.log('Running sequential analysis...');
    const sequentialMemStart = Deno.memoryUsage().heapUsed;

    const { duration: sequentialTime } = await timing.measure(async () => {
      try {
        await analyzeFunctionality(chunks, {
          useCache: false,
          timeout: 30000,
          verbose: false,
        });
      } catch (_error) {
        // Expected in test environment
      }
    });

    const sequentialMemUsed =
      (Deno.memoryUsage().heapUsed - sequentialMemStart) / 1024 / 1024;

    // Test 2: Parallel processing
    console.log(`Running parallel analysis (${config.workers} workers)...`);
    const parallelMemStart = Deno.memoryUsage().heapUsed;

    const parallelAnalyzer = new ParallelAnalyzer({
      maxWorkers: config.workers,
      timeout: 30000,
      verbose: false,
    });

    const { duration: parallelTime } = await timing.measure(async () => {
      try {
        await parallelAnalyzer.analyzeFunctionality(chunks);
      } catch (_error) {
        // Expected in test environment
      }
    });

    const parallelMemUsed =
      (Deno.memoryUsage().heapUsed - parallelMemStart) / 1024 / 1024;

    await parallelAnalyzer.shutdown();

    // Calculate improvements
    const speedup = sequentialTime / parallelTime;
    const memoryRatio = parallelMemUsed / sequentialMemUsed;

    // Store results
    const result: PerformanceResult = {
      config: config.name,
      chunks: config.chunks,
      workers: config.workers,
      sequentialTime,
      parallelTime,
      speedup: speedup.toFixed(2),
      sequentialMem: sequentialMemUsed.toFixed(1),
      parallelMem: parallelMemUsed.toFixed(1),
      memoryRatio: memoryRatio.toFixed(2),
    };

    results.push(result);

    // Display results
    console.log('\nResults:');
    console.log(
      `  Sequential: ${sequentialTime}ms (${sequentialMemUsed.toFixed(1)}MB)`
    );
    console.log(
      `  Parallel:   ${parallelTime}ms (${parallelMemUsed.toFixed(1)}MB)`
    );
    console.log(`  Speedup:    ${speedup.toFixed(2)}x`);
    console.log(`  Memory:     ${memoryRatio.toFixed(2)}x`);

    if (speedup > 1) {
      console.log(
        `  ✅ Parallel is ${((speedup - 1) * 100).toFixed(0)}% faster`
      );
    } else {
      console.log(`  ⚠️  No speedup achieved`);
    }
  }

  // Summary table
  console.log('\n' + '='.repeat(50));
  console.log('\n📈 Performance Summary:\n');
  console.table(
    results.map((r) => ({
      Test: r.config,
      'Sequential (ms)': r.sequentialTime,
      'Parallel (ms)': r.parallelTime,
      Speedup: `${r.speedup}x`,
      'Memory Ratio': `${r.memoryRatio}x`,
    }))
  );

  // Overall assessment
  const avgSpeedup =
    results.reduce((sum, r) => sum + parseFloat(r.speedup), 0) / results.length;
  console.log('\n🎯 Overall Performance:');

  if (avgSpeedup > 1.5) {
    console.log(`  ✅ Excellent! Average speedup: ${avgSpeedup.toFixed(2)}x`);
  } else if (avgSpeedup > 1.2) {
    console.log(`  ✅ Good! Average speedup: ${avgSpeedup.toFixed(2)}x`);
  } else if (avgSpeedup > 1.0) {
    console.log(`  ⚠️  Modest improvement: ${avgSpeedup.toFixed(2)}x`);
  } else {
    console.log(`  ❌ No improvement: ${avgSpeedup.toFixed(2)}x`);
  }

  console.log('\n' + '='.repeat(50) + '\n');
}

// Run if executed directly
if (import.meta.main) {
  runPerformanceTests().catch((error) => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}

export { runPerformanceTests };