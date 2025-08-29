/**
 * Test for worker mechanism and infrastructure
 * Verifies web worker functionality without external dependencies
 */

import { createTestWorker, cleanupWorker, createTestWorkerCode } from './helpers/mock-analyzer.ts';
import { runTestSuite, assert, timing } from './helpers/test-runner.ts';

async function runWorkerMechanismTests() {
  await runTestSuite('Worker Mechanism Tests', [
    {
      name: 'Basic Worker Creation',
      fn: async () => {
        const { worker, url } = await createTestWorker();
        
        assert.ok(worker, 'Should create worker successfully');
        assert.ok(url, 'Should have blob URL');
        
        cleanupWorker(worker, url);
      }
    },
    
    {
      name: 'Worker Message Communication',
      fn: async () => {
        const { worker, url } = await createTestWorker();
        
        // Set up promise to wait for response
        const responsePromise = new Promise((resolve) => {
          worker.addEventListener('message', (event) => {
            resolve(event.data);
          });
        });
        
        // Send test message
        const testMessage = { message: 'Hello from main thread!' };
        worker.postMessage(testMessage);
        
        // Wait for response with timeout
        const response = await timing.timeout(
          responsePromise,
          5000,
          'Worker response timeout'
        );
        
        assert.ok(response, 'Should receive response from worker');
        assert.equal(
          (response as any).success,
          true,
          'Response should indicate success'
        );
        assert.ok(
          (response as any).result?.includes('Processed'),
          'Should process message'
        );
        
        cleanupWorker(worker, url);
      },
      timeout: 10000
    },
    
    {
      name: 'Multiple Worker Instances',
      fn: async () => {
        const workers: Array<{ worker: Worker; url: string }> = [];
        const workerCount = 3;
        
        // Create multiple workers
        for (let i = 0; i < workerCount; i++) {
          workers.push(await createTestWorker());
        }
        
        assert.lengthOf(workers, workerCount, 'Should create multiple workers');
        
        // Test all workers can communicate
        const promises = workers.map((w, index) => {
          return new Promise((resolve) => {
            w.worker.addEventListener('message', (event) => {
              resolve({ index, data: event.data });
            });
            w.worker.postMessage({ message: `Worker ${index}` });
          });
        });
        
        const responses = await Promise.all(promises);
        assert.lengthOf(responses, workerCount, 'All workers should respond');
        
        // Cleanup
        workers.forEach(({ worker, url }) => cleanupWorker(worker, url));
      }
    },
    
    {
      name: 'Worker Error Handling',
      fn: async () => {
        // Create worker with error-prone code
        const errorCode = `
          self.addEventListener('message', (event) => {
            if (event.data.triggerError) {
              throw new Error('Test error from worker');
            }
            self.postMessage({ success: true });
          });
        `;
        
        const { worker, url } = await createTestWorker(errorCode);
        
        // Test normal operation
        const normalPromise = new Promise((resolve) => {
          const handler = (event: MessageEvent) => {
            worker.removeEventListener('message', handler);
            resolve(event.data);
          };
          worker.addEventListener('message', handler);
        });
        
        worker.postMessage({ triggerError: false });
        const normalResponse = await timing.timeout(normalPromise, 2000);
        assert.ok(normalResponse, 'Should handle normal messages');
        
        // Worker should survive after error
        worker.postMessage({ triggerError: true });
        await timing.delay(100); // Give time for error to occur
        
        // Worker should still be functional
        const afterErrorPromise = new Promise((resolve) => {
          const handler = (event: MessageEvent) => {
            worker.removeEventListener('message', handler);
            resolve(event.data);
          };
          worker.addEventListener('message', handler);
        });
        
        worker.postMessage({ triggerError: false });
        const afterErrorResponse = await timing.timeout(afterErrorPromise, 2000);
        assert.ok(afterErrorResponse, 'Worker should continue after error');
        
        cleanupWorker(worker, url);
      }
    },
    
    {
      name: 'Worker Termination',
      fn: async () => {
        const { worker, url } = await createTestWorker();
        
        // Set up message listener that should not fire after termination
        let messageReceived = false;
        worker.addEventListener('message', () => {
          messageReceived = true;
        });
        
        // Terminate worker
        worker.terminate();
        
        // Try to send message (should not get response)
        worker.postMessage({ message: 'Should not process' });
        await timing.delay(100);
        
        assert.equal(
          messageReceived,
          false,
          'Should not receive messages after termination'
        );
        
        URL.revokeObjectURL(url);
      }
    },
    
    {
      name: 'Worker Performance',
      fn: async () => {
        const { worker, url } = await createTestWorker();
        
        const messageCount = 10;
        const messages: Promise<any>[] = [];
        
        const { duration } = await timing.measure(async () => {
          for (let i = 0; i < messageCount; i++) {
            const promise = new Promise((resolve) => {
              const handler = (event: MessageEvent) => {
                if (event.data.result?.includes(`Message ${i}`)) {
                  worker.removeEventListener('message', handler);
                  resolve(event.data);
                }
              };
              worker.addEventListener('message', handler);
            });
            messages.push(promise);
            worker.postMessage({ message: `Message ${i}` });
          }
          
          await Promise.all(messages);
        });
        
        console.log(`  Processed ${messageCount} messages in ${duration}ms`);
        assert.lessThan(
          duration,
          messageCount * 200, // Allow 200ms per message max
          'Should process messages efficiently'
        );
        
        cleanupWorker(worker, url);
      }
    }
  ]);
}

// Run tests if executed directly
if (import.meta.main) {
  runWorkerMechanismTests().catch((error) => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}

export { runWorkerMechanismTests };