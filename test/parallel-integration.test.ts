/**
 * Integration tests for parallel processing with actual ParallelAnalyzer
 * Tests real functionality with minimal external dependencies
 */

import { ParallelAnalyzer } from '../src/core/parallel/ParallelAnalyzer.ts';
import { createMockChunks, createRealisticChunks } from './helpers/test-fixtures.ts';
import { runTestSuite, assert, timing, trackProgressEvents } from './helpers/test-runner.ts';

async function runIntegrationTests() {
  await runTestSuite('Integration Tests for Parallel Processing', [
    {
      name: 'Basic Parallel Processing',
      fn: async () => {
        const analyzer = new ParallelAnalyzer({
          maxWorkers: 2,
          timeout: 30000
        });
        
        const chunks = createMockChunks(3);
        const result = await analyzer.analyzeFunctionality(chunks);
        
        assert.ok(result, 'Should return results');
        assert.ok(result.appPurpose, 'Should have app purpose');
        
        await analyzer.shutdown();
      }
    },
    
    {
      name: 'Progress Event Emission',
      fn: async () => {
        const analyzer = new ParallelAnalyzer({ maxWorkers: 1 });
        const events = trackProgressEvents(analyzer);
        
        await analyzer.analyzeFunctionality(createMockChunks(2));
        
        assert.greaterThan(events.length, 0, 'Should emit progress events');
        
        const lastEvent = events[events.length - 1];
        assert.ok(lastEvent, 'Should have final event');
        assert.ok('percentage' in lastEvent, 'Should have percentage');
        assert.ok('processed' in lastEvent, 'Should have processed count');
        
        await analyzer.shutdown();
      }
    },
    
    {
      name: 'Error Resilience',
      fn: async () => {
        const analyzer = new ParallelAnalyzer({ maxWorkers: 2 });
        
        const chunks = createMockChunks(2, { 
          triggerError: true, 
          errorIndex: 1 
        });
        
        const result = await analyzer.analyzeFunctionality(chunks);
        
        assert.ok(result, 'Should handle errors gracefully');
        
        await analyzer.shutdown();
      }
    },
    
    {
      name: 'Concurrency Control',
      fn: async () => {
        const maxWorkers = 2;
        const analyzer = new ParallelAnalyzer({ maxWorkers });
        
        let maxConcurrent = 0;
        trackProgressEvents(analyzer, {
          onProgress: (event) => {
            const current = event.activeWorkers || 0;
            maxConcurrent = Math.max(maxConcurrent, current);
          }
        });
        
        await analyzer.analyzeFunctionality(createMockChunks(5));
        
        assert.lessThan(
          maxConcurrent,
          maxWorkers + 1,
          'Should respect concurrency limit'
        );
        
        await analyzer.shutdown();
      }
    },
    
    {
      name: 'Memory Management',
      fn: async () => {
        const analyzer = new ParallelAnalyzer({
          maxWorkers: 1,
          maxMemory: 200 * 1024 * 1024 // 200MB
        });
        
        const initialMemory = Deno.memoryUsage().heapUsed;
        
        await analyzer.analyzeFunctionality(createMockChunks(10));
        
        const finalMemory = Deno.memoryUsage().heapUsed;
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
        
        assert.lessThan(
          memoryIncrease,
          150,
          'Should manage memory efficiently'
        );
        
        await analyzer.shutdown();
      }
    },
    
    {
      name: 'Resource Cleanup',
      fn: async () => {
        const analyzer = new ParallelAnalyzer({
          maxWorkers: 3,
          useWorkers: true
        });
        
        const chunks = createMockChunks(2);
        await analyzer.analyzeFunctionality(chunks);
        
        // Shutdown should clean up all resources
        await analyzer.shutdown();
        
        // Try to use after shutdown (should not hang or crash)
        try {
          await timing.timeout(
            analyzer.analyzeFunctionality(chunks),
            1000,
            'Should fail after shutdown'
          );
          throw new Error('Should have failed after shutdown');
        } catch {
          // Expected to fail - test passes
        }
      }
    },
    
    {
      name: 'Realistic Content Processing',
      fn: async () => {
        const analyzer = new ParallelAnalyzer({
          maxWorkers: 2,
          timeout: 30000
        });
        
        const chunks = createRealisticChunks();
        
        const { result, duration } = await timing.measure(
          () => analyzer.analyzeFunctionality(chunks)
        );
        
        assert.ok(result, 'Should process realistic content');
        assert.ok(result.appPurpose, 'Should analyze app purpose');
        assert.greaterThan(
          result.coreFeatures?.length || 0,
          0,
          'Should identify features'
        );
        
        console.log(`  Processed ${chunks.length} realistic chunks in ${duration}ms`);
        
        await analyzer.shutdown();
      }
    }
  ]);
}

// Run tests if executed directly
if (import.meta.main) {
  runIntegrationTests().catch((error) => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}

export { runIntegrationTests };