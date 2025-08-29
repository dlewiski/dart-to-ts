/**
 * Test for the worker mechanism without actual Claude API calls
 * This verifies the worker infrastructure is functioning correctly
 */

async function testWorkerMechanism() {
  console.log('🧪 Testing Worker Mechanism\n');
  console.log('='.repeat(50) + '\n');

  try {
    // Create a simple test worker inline
    const workerCode = `
      self.addEventListener('message', (event) => {
        const { data } = event;
        console.log('Worker received:', data.message);
        
        // Simulate some processing
        setTimeout(() => {
          self.postMessage({
            success: true,
            result: \`Processed: \${data.message}\`,
            timestamp: Date.now()
          });
        }, 100);
      });
    `;

    // Create a blob URL for the worker
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    // Create the worker with Deno permissions
    const worker = new Worker(workerUrl, { 
      type: 'module',
      // @ts-ignore - Deno-specific option
      deno: { 
        permissions: { 
          read: false,
          write: false,
          net: false,
          run: false 
        } 
      }
    });

    console.log('✅ Worker created successfully');

    // Set up promise to wait for response
    const responsePromise = new Promise((resolve) => {
      worker.addEventListener('message', (event) => {
        console.log('✅ Received response from worker:', event.data);
        resolve(event.data);
      });
    });

    // Send test message
    const testMessage = { message: 'Hello from main thread!' };
    console.log('📤 Sending message to worker:', testMessage);
    worker.postMessage(testMessage);

    // Wait for response with timeout
    const response = await Promise.race([
      responsePromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout waiting for worker')), 5000)
      )
    ]);

    console.log('\n📊 Worker Response:', response);

    // Clean up
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
    console.log('✅ Worker terminated and cleaned up');

    console.log('\n' + '='.repeat(50));
    console.log('✅ Worker mechanism test passed!\n');
    console.log('The worker infrastructure is functioning correctly.');
    console.log('Workers can be created, receive messages, and send responses.');

  } catch (error) {
    console.error('\n❌ Worker mechanism test failed:', error);
    Deno.exit(1);
  }
}

// Run the test
if (import.meta.main) {
  testWorkerMechanism().catch(console.error);
}

export { testWorkerMechanism };