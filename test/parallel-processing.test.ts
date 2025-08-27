// Simple test file for parallel processing functionality
import { ParallelAnalyzer } from '../src/core/parallel/ParallelAnalyzer';
import { CodeChunk } from '../src/types';

async function runTests() {
  console.log('🧪 Testing Parallel Processing Features\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Basic parallel processing
  console.log('Test 1: Basic parallel processing');
  try {
    const analyzer = new ParallelAnalyzer({
      maxWorkers: 2,
      timeout: 5000,
    });

    const chunks: CodeChunk[] = [
      {
        category: 'components',
        files: [{ path: 'test1.dart', content: 'class Widget1 {}' }],
        context: 'Testing component analysis',
      },
      {
        category: 'services',
        files: [{ path: 'test2.dart', content: 'class Service1 {}' }],
        context: 'Testing service analysis',
      },
    ];

    const startTime = Date.now();
    const results = await analyzer.analyzeFunctionality(chunks);
    const duration = Date.now() - startTime;

    if (results && results.appPurpose) {
      console.log(`  ✅ Processed ${chunks.length} chunks in ${duration}ms`);
      passed++;
    } else {
      console.log('  ❌ Failed to get results');
      failed++;
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
    failed++;
  }

  // Test 2: Progress tracking
  console.log('\nTest 2: Progress tracking');
  try {
    const analyzer = new ParallelAnalyzer({ maxWorkers: 1 });
    let progressEmitted = false;

    analyzer.on('progress', (event) => {
      progressEmitted = true;
      console.log(`  📊 Progress: ${event.processed}/${event.total} (${event.percentage.toFixed(0)}%)`);
    });

    const chunks: CodeChunk[] = [
      {
        category: 'components',
        files: [{ path: 'progress.dart', content: 'class ProgressTest {}' }],
        context: 'Testing progress events',
      },
    ];

    await analyzer.analyzeFunctionality(chunks);

    if (progressEmitted) {
      console.log('  ✅ Progress events emitted successfully');
      passed++;
    } else {
      console.log('  ❌ No progress events emitted');
      failed++;
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
    failed++;
  }

  // Test 3: Error handling
  console.log('\nTest 3: Error handling');
  try {
    const analyzer = new ParallelAnalyzer({ maxWorkers: 2 });

    const chunks: CodeChunk[] = [
      {
        category: 'components',
        files: [{ path: 'valid.dart', content: 'class Valid {}' }],
        context: 'Valid chunk',
      },
      {
        category: 'services',
        files: [{ path: 'error.dart', content: 'TRIGGER_ERROR' }],
        context: 'Error chunk',
      },
    ];

    const results = await analyzer.analyzeFunctionality(chunks);

    if (results && results.appPurpose) {
      console.log('  ✅ Handled errors gracefully');
      passed++;
    } else {
      console.log('  ❌ Failed to handle errors');
      failed++;
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
    failed++;
  }

  // Test 4: Memory management
  console.log('\nTest 4: Memory management');
  try {
    const analyzer = new ParallelAnalyzer({
      maxWorkers: 1,
      maxMemory: 100 * 1024 * 1024, // 100MB
    });

    const chunks: CodeChunk[] = [
      {
        category: 'components',
        files: [{ path: 'memory.dart', content: 'class MemoryTest { /* ' + 'a'.repeat(1000) + ' */ }' }],
        context: 'Memory test',
      },
    ];

    const memBefore = process.memoryUsage().heapUsed;
    const results = await analyzer.analyzeFunctionality(chunks);
    const memAfter = process.memoryUsage().heapUsed;
    const memUsed = (memAfter - memBefore) / 1024 / 1024;

    if (results && memUsed < 100) {
      console.log(`  ✅ Memory usage kept under limit (${memUsed.toFixed(1)}MB)`);
      passed++;
    } else {
      console.log(`  ❌ Memory limit exceeded (${memUsed.toFixed(1)}MB)`);
      failed++;
    }

    await analyzer.shutdown();
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };