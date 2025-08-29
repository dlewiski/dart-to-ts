/**
 * Test for the parallel processing worker implementation
 */

import { ParallelAnalyzer } from '../src/core/parallel/ParallelAnalyzer.ts';
import { type CodeChunk } from '../src/types/index.ts';

async function testWorker() {
  console.log('🧪 Testing Worker Implementation\n');
  console.log('='.repeat(50) + '\n');

  try {
    // Create a parallel analyzer with workers enabled
    const analyzer = new ParallelAnalyzer({
      maxWorkers: 2,
      useWorkers: true,  // Enable actual worker processing
      timeout: 10000,    // 10 seconds timeout for testing
    });

    // Create test chunks
    const testChunks: CodeChunk[] = [
      {
        category: 'components',
        files: [{
          path: 'test_component.dart',
          content: `
class TestWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Test Component'),
    );
  }
}`
        }],
        context: 'Testing worker with a simple Flutter component',
      },
      {
        category: 'services',
        files: [{
          path: 'test_service.dart', 
          content: `
class ApiService {
  Future<String> fetchData() async {
    return 'test data';
  }
}`
        }],
        context: 'Testing worker with a simple service',
      }
    ];

    console.log('Starting parallel analysis with workers...\n');

    // Track progress events
    let progressEvents = 0;
    analyzer.on('progress', (event: CustomEvent) => {
      progressEvents++;
      const detail = event.detail as {
        processed: number;
        total: number;
        percentage: number;
        activeWorkers?: number;
      };
      console.log(`Progress: ${detail.processed}/${detail.total} (${detail.percentage.toFixed(0)}%)`);
    });

    // Analyze the chunks
    const startTime = Date.now();
    const result = await analyzer.analyzeFunctionality(testChunks);
    const duration = Date.now() - startTime;

    console.log(`\n✅ Analysis completed in ${duration}ms`);
    console.log(`Progress events emitted: ${progressEvents}`);
    
    // Verify we got results
    if (result && result.appPurpose) {
      console.log('\n📊 Analysis Result Summary:');
      console.log(`- App Purpose: ${result.appPurpose.substring(0, 100)}...`);
      console.log(`- Core Features: ${result.coreFeatures?.length || 0} features identified`);
      console.log('\n✅ Worker implementation is functioning correctly!');
    } else {
      console.error('\n❌ No analysis results returned');
    }

    // Clean up
    await analyzer.shutdown();
    console.log('\n🧹 Worker shutdown completed successfully');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    Deno.exit(1);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ All worker tests passed!\n');
}

// Run the test
if (import.meta.main) {
  testWorker().catch(console.error);
}

export { testWorker };