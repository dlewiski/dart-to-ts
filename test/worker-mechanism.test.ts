/**
 * Test for worker mechanism and infrastructure
 * Verifies web worker functionality without external dependencies
 */

import { cleanupWorker, createTestWorker } from './helpers/mock-analyzer.ts';
import { assert } from '@std/assert';

// Helper function to add timeout to a promise
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Operation timed out',
): Promise<T> {
  let timeoutId: number;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}

// Helper function to measure execution time
async function measureTime<T>(
  fn: () => Promise<T>,
): Promise<{ result?: T; duration: number }> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    return { result, duration };
  } catch (_error) {
    const duration = Math.round(performance.now() - start);
    return { duration };
  }
}

Deno.test('Basic Worker Creation', () => {
  const { worker, url } = createTestWorker();

  assert(worker, 'Should create worker successfully');
  assert(url, 'Should have blob URL');

  cleanupWorker(worker, url);
});

Deno.test('Worker Message Communication', async () => {
  const { worker, url } = createTestWorker();

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
  const response = await withTimeout(
    responsePromise,
    5000,
    'Worker response timeout',
  );

  assert(response, 'Should receive response from worker');
  const resp = response as { success: boolean; result?: string };
  assert(
    resp.success === true,
    'Response should indicate success',
  );
  assert(
    resp.result?.includes('Processed'),
    'Should process message',
  );

  cleanupWorker(worker, url);
});

Deno.test('Multiple Worker Instances', async () => {
  const workers: Array<{ worker: Worker; url: string }> = [];
  const workerCount = 3;

  // Create multiple workers
  for (let i = 0; i < workerCount; i++) {
    workers.push(createTestWorker());
  }

  assert(workers.length === workerCount, 'Should create multiple workers');

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
  assert(responses.length === workerCount, 'All workers should respond');

  // Cleanup
  workers.forEach(({ worker, url }) => cleanupWorker(worker, url));
});

Deno.test('Worker Error Handling', async () => {
  // Create worker with error-prone code that catches and reports errors
  const errorCode = `
          self.addEventListener('message', (event) => {
            try {
              if (event.data.triggerError) {
                // Simulate error but catch it so worker doesn't die
                const error = new Error('Test error from worker');
                self.postMessage({ success: false, error: error.message });
              } else {
                self.postMessage({ success: true });
              }
            } catch (err) {
              self.postMessage({ success: false, error: err.message });
            }
          });
        `;

  const { worker, url } = createTestWorker(errorCode);

  // Set up error handler
  worker.addEventListener('error', (event) => {
    event.preventDefault(); // Prevent unhandled error
  });

  // Test normal operation
  const normalPromise = new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      worker.removeEventListener('message', handler);
      resolve(event.data);
    };
    worker.addEventListener('message', handler);
  });

  worker.postMessage({ triggerError: false });
  const normalResponse = await withTimeout(normalPromise, 2000);
  assert(normalResponse, 'Should handle normal messages');

  // Test error handling
  const errorPromise = new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      worker.removeEventListener('message', handler);
      resolve(event.data);
    };
    worker.addEventListener('message', handler);
  });

  worker.postMessage({ triggerError: true });
  const errorResponse = await withTimeout(errorPromise, 2000) as {
    success: boolean;
    error?: string;
  };
  assert(!errorResponse.success, 'Should report error');
  assert(
    errorResponse.error?.includes('Test error'),
    'Should include error message',
  );

  // Worker should still be functional after error
  const afterErrorPromise = new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      worker.removeEventListener('message', handler);
      resolve(event.data);
    };
    worker.addEventListener('message', handler);
  });

  worker.postMessage({ triggerError: false });
  const afterErrorResponse = await withTimeout(afterErrorPromise, 2000);
  assert(afterErrorResponse, 'Worker should continue after error');

  cleanupWorker(worker, url);
});

Deno.test('Worker Termination', async () => {
  const { worker, url } = createTestWorker();

  // Set up message listener that should not fire after termination
  let messageReceived = false;
  worker.addEventListener('message', () => {
    messageReceived = true;
  });

  // Terminate worker
  worker.terminate();

  // Try to send message (should not get response)
  worker.postMessage({ message: 'Should not process' });

  // Give a brief moment for any potential message
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert(
    messageReceived === false,
    'Should not receive messages after termination',
  );

  URL.revokeObjectURL(url);
});

Deno.test('Worker Performance', async () => {
  const { worker, url } = createTestWorker();

  const messageCount = 10;
  const messages: Promise<unknown>[] = [];

  const { duration } = await measureTime(async () => {
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
  assert(
    duration < messageCount * 200, // Allow 200ms per message max
    'Should process messages efficiently',
  );

  cleanupWorker(worker, url);
});
