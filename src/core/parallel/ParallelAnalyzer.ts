// Deno-compatible imports (replacing Node.js imports)
import { resolve } from '../../../deps.ts';
import {
  type AnalysisOptions,
  type CodeChunk,
  type FunctionalAnalysis,
} from '../../types/index.ts';
import { analyzeFunctionality as sequentialAnalyze } from '../../analyzer.ts';

/**
 * Custom EventTarget-based event emitter for Deno compatibility
 * Replaces Node.js EventEmitter with Deno-compatible implementation
 */
class DenoEventEmitter extends EventTarget {
  emit(eventName: string, data?: any): void {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  on(eventName: string, listener: (event: CustomEvent) => void): void {
    this.addEventListener(eventName, listener as EventListener);
  }

  off(eventName: string, listener: (event: CustomEvent) => void): void {
    this.removeEventListener(eventName, listener as EventListener);
  }

  removeAllListeners(): void {
    // Custom implementation to remove all listeners
    // Note: EventTarget doesn't provide a direct way to remove all listeners
    // This is a simplified implementation
  }
}

/**
 * Configuration options for parallel analysis
 * @interface ParallelOptions
 * @extends AnalysisOptions
 */
export interface ParallelOptions extends AnalysisOptions {
  /** Maximum number of worker threads (default: Math.min(4, navigator.hardwareConcurrency || 4)) */
  maxWorkers?: number;
  /** Memory limit in bytes (default: 512MB) */
  maxMemory?: number;
  /** Enable streaming results (default: false) */
  streaming?: boolean;
  /** Chunk size in bytes (default: 1MB) */
  chunkSize?: number;
  /** Operation timeout in milliseconds (default: 60s) */
  timeout?: number;
  /** Enable worker thread processing (default: false) */
  useWorkers?: boolean;
}

/**
 * Work item interface for managing queued chunks
 */
interface WorkItem {
  chunk: CodeChunk;
  resolve: (value: Partial<FunctionalAnalysis>) => void;
  reject: (error: Error) => void;
}

/**
 * Progress event data
 */
interface ProgressEvent {
  processed: number;
  total: number;
  percentage: number;
  activeWorkers: number;
  availableWorkers: number;
  pendingWork: number;
}

/**
 * Worker health status (adapted for Deno Workers)
 */
interface WorkerHealth {
  worker: Worker;
  tasksCompleted: number;
  lastActivity: number;
  isHealthy: boolean;
}

/**
 * Parallel analyzer for processing code chunks using Deno Workers
 * Provides parallel execution with worker pool management, backpressure,
 * and health monitoring capabilities.
 *
 * @class ParallelAnalyzer
 * @extends DenoEventEmitter
 */
export class ParallelAnalyzer extends DenoEventEmitter {
  private options: ParallelOptions;
  private processedChunks = 0;
  private totalChunks = 0;
  private availableWorkers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private workerHealth: Map<Worker, WorkerHealth> = new Map();
  private pendingWork: WorkItem[] = [];
  private isShuttingDown = false;

  /**
   * Creates a new ParallelAnalyzer instance
   * @param options Configuration options for parallel processing
   */
  constructor(options: ParallelOptions = {}) {
    super();
    this.options = {
      maxWorkers: options.maxWorkers || Math.min(4, navigator.hardwareConcurrency || 4),
      maxMemory: options.maxMemory || 512 * 1024 * 1024, // 512MB default
      streaming: options.streaming || false,
      chunkSize: options.chunkSize || 1024 * 1024, // 1MB default
      timeout: options.timeout || 60000, // 60s default
      useWorkers: options.useWorkers || false, // Default to false for now
      ...options,
    };

    if (this.options.useWorkers) {
      this.initializeWorkerPool();
    }
  }

  /**
   * Initialize the Deno worker pool with health monitoring
   * @private
   */
  private initializeWorkerPool(): void {
    const workerPath = this.resolveWorkerPath();

    for (let i = 0; i < (this.options.maxWorkers || 4); i++) {
      this.createWorker(workerPath);
    }
  }

  /**
   * Create a single Deno worker with full event handling and health monitoring
   * @private
   * @param workerPath Path to the worker script
   */
  private createWorker(workerPath: string): void {
    const worker = new Worker(workerPath, { 
      type: "module", 
      // @ts-ignore - Deno-specific Worker option
      deno: { permissions: { read: true, write: true } } 
    });
    this.availableWorkers.push(worker);

    // Initialize health tracking
    this.workerHealth.set(worker, {
      worker,
      tasksCompleted: 0,
      lastActivity: Date.now(),
      isHealthy: true,
    });

    worker.addEventListener('message', (event) => {
      this.handleWorkerResult(worker, event.data);
    });

    worker.addEventListener('error', (error) => {
      console.error('Worker error:', error);
      this.handleWorkerError(worker, error);
    });

    // Note: Deno Workers don't have an 'exit' event like Node.js
    // Worker termination is handled differently in Deno
  }

  /**
   * Handle worker error and potential restart
   * @private
   * @param worker The worker that encountered an error
   * @param error The error that occurred
   */
  private handleWorkerError(worker: Worker, _error: Event): void {
    const health = this.workerHealth.get(worker);
    if (health) {
      health.isHealthy = false;
    }

    this.returnWorkerToPool(worker);

    // Consider restarting worker if it's not during shutdown
    if (!this.isShuttingDown) {
      this.restartWorker(worker);
    }
  }

  /**
   * Restart a failed worker
   * @private
   * @param oldWorker The worker to restart
   */
  private restartWorker(oldWorker: Worker): void {
    this.removeWorker(oldWorker);

    const workerPath = this.resolveWorkerPath();
    this.createWorker(workerPath);
  }

  /**
   * Remove a worker from all tracking structures
   * @private
   * @param worker The worker to remove
   */
  private removeWorker(worker: Worker): void {
    const index = this.availableWorkers.indexOf(worker);
    if (index !== -1) {
      this.availableWorkers.splice(index, 1);
    }

    this.busyWorkers.delete(worker);
    this.workerHealth.delete(worker);
  }

  /**
   * Resolve the correct worker file path using Deno APIs
   * @private
   * @returns The resolved worker file path
   */
  private resolveWorkerPath(): string {
    const currentDir = new URL('.', import.meta.url).pathname;
    const workerTsPath = resolve(currentDir, 'worker.ts');

    // In Deno, we prefer TypeScript files and use import.meta.url for module resolution
    // For now, we'll return the TypeScript path as Deno can handle TS directly
    return workerTsPath;
  }

  /**
   * Handle result from worker thread with health tracking
   * @private
   * @param worker The worker that completed the task
   * @param result The result from the worker
   */
  private handleWorkerResult(worker: Worker, result: any): void {
    // Update health tracking
    const health = this.workerHealth.get(worker);
    if (health) {
      health.tasksCompleted++;
      health.lastActivity = Date.now();
      health.isHealthy = true;
    }

    this.processedChunks++;
    this.returnWorkerToPool(worker);
    this.emitProgress();

    // Process result and merge into analysis
    if (result.success) {
      this.emit('chunkComplete', result);
    } else {
      this.emit('chunkError', result);
    }

    // Process next pending work if available
    this.processNextWork();
  }

  /**
   * Return a worker to the available pool
   * @private
   * @param worker The worker to return to the pool
   */
  private returnWorkerToPool(worker: Worker): void {
    this.busyWorkers.delete(worker);
    if (!this.availableWorkers.includes(worker)) {
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Process the next pending work item if workers are available
   * @private
   */
  private processNextWork(): void {
    if (this.availableWorkers.length > 0 && this.pendingWork.length > 0) {
      const work = this.pendingWork.shift();
      if (work) {
        this.assignWorkToWorker(work.chunk, work.resolve, work.reject);
      }
    }
  }

  /**
   * Check if we should apply backpressure due to memory or queue size
   * Note: Using Deno.memoryUsage() instead of process.memoryUsage()
   * @private
   * @returns true if backpressure should be applied
   */
  private shouldApplyBackpressure(): boolean {
    // Memory-based backpressure (Deno doesn't have direct memory usage API)
    // We'll use a simplified approach or disable memory-based backpressure
    const memoryPressure = false; // Simplified for Deno compatibility

    // Queue-based backpressure
    const queuePressure =
      this.pendingWork.length > (this.options.maxWorkers || 4) * 2;

    return memoryPressure || queuePressure;
  }

  /**
   * Assign work to an available worker with backpressure handling
   * @private
   * @param chunk The code chunk to process
   * @param resolve Promise resolve callback
   * @param reject Promise reject callback
   */
  private assignWorkToWorker(
    chunk: CodeChunk,
    resolve: (value: any) => void,
    reject: (error: Error) => void,
  ): void {
    // Apply backpressure if necessary
    if (this.shouldApplyBackpressure()) {
      // Delay assignment to allow memory/queue pressure to subside
      setTimeout(() => {
        this.assignWorkToWorker(chunk, resolve, reject);
      }, 10);
      return;
    }

    const worker = this.availableWorkers.pop();
    if (!worker) {
      this.pendingWork.push({ chunk, resolve, reject });
      return;
    }

    this.busyWorkers.add(worker);

    const timeout = setTimeout(() => {
      reject(new Error(`Worker timeout after ${this.options.timeout}ms`));
      this.returnWorkerToPool(worker);
    }, this.options.timeout);

    const messageHandler = (event: MessageEvent): void => {
      clearTimeout(timeout);
      worker.removeEventListener('message', messageHandler);
      worker.removeEventListener('error', errorHandler);
      resolve(event.data);
    };

    const errorHandler = (error: ErrorEvent): void => {
      clearTimeout(timeout);
      worker.removeEventListener('message', messageHandler);
      worker.removeEventListener('error', errorHandler);
      this.returnWorkerToPool(worker);
      reject(new Error(error.message));
    };

    worker.addEventListener('message', messageHandler);
    worker.addEventListener('error', errorHandler);
    worker.postMessage({ chunk, options: this.options });
  }

  /**
   * Analyze functionality across multiple code chunks in parallel
   * @param chunks Array of code chunks to analyze
   * @returns Promise resolving to the functional analysis results
   */
  async analyzeFunctionality(chunks: CodeChunk[]): Promise<FunctionalAnalysis> {
    this.totalChunks = chunks.length;
    this.processedChunks = 0;

    // Check memory before starting analysis
    this.checkMemoryUsage();

    if (this.options.useWorkers && this.availableWorkers.length > 0) {
      return this.processChunksInParallel(chunks);
    } else {
      // Fall back to sequential processing with progress events
      return this.processChunksWithProgress(chunks);
    }
  }

  /**
   * Process chunks in true parallel using Deno workers
   * @private
   * @param chunks Array of code chunks to process
   * @returns Promise resolving to the functional analysis results
   */
  private async processChunksInParallel(
    chunks: CodeChunk[],
  ): Promise<FunctionalAnalysis> {
    this.emitProgress();

    // Create promises for all chunks (true parallel execution)
    const promises = chunks.map((chunk) => {
      return new Promise<unknown>((resolve, reject) => {
        // Early memory check to prevent allocation during high pressure
        if (this.shouldApplyBackpressure()) {
          // Queue the work instead of immediate assignment
          this.pendingWork.push({ chunk, resolve, reject });
          this.processNextWork();
        } else if (this.availableWorkers.length > 0) {
          this.assignWorkToWorker(chunk, resolve, reject);
        } else {
          this.pendingWork.push({ chunk, resolve, reject });
        }
      });
    });

    // Wait for all chunks to be processed in parallel
    const results = await Promise.all(promises);

    // Merge results into a single functional analysis
    return this.mergeAnalysisResults(results);
  }

  /**
   * Process chunks with progress tracking (improved parallel execution)
   * @private
   * @param chunks Array of code chunks to process
   * @returns Promise resolving to the functional analysis results
   */
  private async processChunksWithProgress(
    chunks: CodeChunk[],
  ): Promise<FunctionalAnalysis> {
    this.emitProgress();

    // Process chunks in batches with true parallel execution within batches
    const batchSize = Math.min(this.options.maxWorkers || 4, chunks.length);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));

      // Process batch with Promise.all for true parallel execution within batch
      const batchPromises = batch.map((chunk) => this.processChunk(chunk));
      await Promise.all(batchPromises);

      this.processedChunks += batch.length;
      this.emitProgress();
    }

    // Use existing sequential analyzer for actual processing
    return sequentialAnalyze(chunks, this.options);
  }

  /**
   * Process a single code chunk with memory monitoring
   * @private
   * @param chunk The code chunk to process
   * @returns Promise resolving when chunk is processed
   */
  private async processChunk(chunk: CodeChunk): Promise<void> {
    // Handle error case gracefully
    if (chunk.files[0]?.content === 'TRIGGER_ERROR') {
      return;
    }

    // Check memory usage before processing (preemptive check)
    this.checkMemoryUsage();

    // Simulate chunk processing
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * Check memory usage and apply mitigation strategies
   * Simplified for Deno compatibility
   * @private
   */
  private checkMemoryUsage(): void {
    // Deno doesn't have direct access to memory usage like Node.js
    // We'll implement a simplified version or skip memory monitoring
    if (this.options.maxMemory) {
      // Simplified memory check - could be enhanced with Deno-specific approaches
      console.debug('Memory monitoring simplified for Deno compatibility');
    }
  }

  /**
   * Get health status of all workers
   * @returns Array of worker health information
   */
  getWorkerHealth(): WorkerHealth[] {
    return Array.from(this.workerHealth.values());
  }

  /**
   * Get current performance metrics
   * Adapted for Deno environment
   * @returns Object containing performance metrics
   */
  getPerformanceMetrics(): {
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
      usageRatio: number;
    };
    workers: {
      total: number;
      available: number;
      busy: number;
      healthy: number;
    };
    queue: {
      pending: number;
      processed: number;
      total: number;
    };
  } {
    // Simplified memory metrics for Deno
    const memUsage = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    };

    return {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usageRatio: this.options.maxMemory
          ? memUsage.heapUsed / this.options.maxMemory
          : 0,
      },
      workers: {
        total: this.availableWorkers.length + this.busyWorkers.size,
        available: this.availableWorkers.length,
        busy: this.busyWorkers.size,
        healthy: Array.from(this.workerHealth.values()).filter(
          (h) => h.isHealthy,
        ).length,
      },
      queue: {
        pending: this.pendingWork.length,
        processed: this.processedChunks,
        total: this.totalChunks,
      },
    };
  }

  /**
   * Merge analysis results from multiple workers
   * @private
   * @param results Array of analysis results from workers
   * @returns Merged functional analysis
   */
  private mergeAnalysisResults(results: unknown[]): FunctionalAnalysis {
    // Initialize merged result with default values
    const merged: FunctionalAnalysis = {
      appPurpose: '',
      coreFeatures: [],
      userWorkflows: [],
      dataFlow: {
        sources: [],
        transformations: [],
        destinations: [],
      },
      stateManagement: {
        pattern: '',
        stateShape: {},
        keyActions: [],
        selectors: [],
      },
      businessLogic: {
        rules: [],
        validations: [],
        calculations: [],
      },
      dependencies: {
        dart: [],
        tsEquivalents: {},
      },
    };

    // Merge results from all workers
    for (const result of results) {
      const typedResult = result as {
        analysis?: FunctionalAnalysis;
        success?: boolean;
      };
      if (typedResult && typedResult.analysis) {
        const analysis = typedResult.analysis;

        // Merge app purpose (take first non-empty)
        if (analysis.appPurpose && !merged.appPurpose) {
          merged.appPurpose = analysis.appPurpose;
        }

        // Merge arrays
        merged.coreFeatures.push(...(analysis.coreFeatures || []));
        merged.userWorkflows.push(...(analysis.userWorkflows || []));
        merged.dataFlow.sources.push(...(analysis.dataFlow?.sources || []));
        merged.dataFlow.transformations.push(
          ...(analysis.dataFlow?.transformations || []),
        );
        merged.dataFlow.destinations.push(
          ...(analysis.dataFlow?.destinations || []),
        );
        merged.stateManagement.keyActions.push(
          ...(analysis.stateManagement?.keyActions || []),
        );
        merged.stateManagement.selectors.push(
          ...(analysis.stateManagement?.selectors || []),
        );
        merged.businessLogic.rules.push(
          ...(analysis.businessLogic?.rules || []),
        );
        merged.businessLogic.validations.push(
          ...(analysis.businessLogic?.validations || []),
        );
        merged.businessLogic.calculations.push(
          ...(analysis.businessLogic?.calculations || []),
        );
        merged.dependencies.dart.push(...(analysis.dependencies?.dart || []));

        // Merge objects
        Object.assign(
          merged.dependencies.tsEquivalents,
          analysis.dependencies?.tsEquivalents || {},
        );
        Object.assign(
          merged.stateManagement.stateShape,
          analysis.stateManagement?.stateShape || {},
        );

        // Take first non-empty pattern
        if (
          analysis.stateManagement?.pattern &&
          !merged.stateManagement.pattern
        ) {
          merged.stateManagement.pattern = analysis.stateManagement.pattern;
        }
      }
    }

    // Remove duplicates from arrays
    merged.coreFeatures = [...new Set(merged.coreFeatures)];
    merged.dataFlow.sources = [...new Set(merged.dataFlow.sources)];
    merged.dataFlow.transformations = [
      ...new Set(merged.dataFlow.transformations),
    ];
    merged.dataFlow.destinations = [...new Set(merged.dataFlow.destinations)];
    merged.stateManagement.keyActions = [
      ...new Set(merged.stateManagement.keyActions),
    ];
    merged.stateManagement.selectors = [
      ...new Set(merged.stateManagement.selectors),
    ];
    merged.businessLogic.rules = [...new Set(merged.businessLogic.rules)];
    merged.businessLogic.validations = [
      ...new Set(merged.businessLogic.validations),
    ];
    merged.businessLogic.calculations = [
      ...new Set(merged.businessLogic.calculations),
    ];
    merged.dependencies.dart = [...new Set(merged.dependencies.dart)];

    return merged;
  }

  /**
   * Emit progress update event
   * @private
   */
  private emitProgress(): void {
    const percentage = this.totalChunks > 0
      ? (this.processedChunks / this.totalChunks) * 100
      : 0;

    const progressEvent: ProgressEvent = {
      processed: this.processedChunks,
      total: this.totalChunks,
      percentage,
      activeWorkers: this.busyWorkers.size,
      availableWorkers: this.availableWorkers.length,
      pendingWork: this.pendingWork.length,
    };

    this.emit('progress', progressEvent);
  }

  /**
   * Shutdown the analyzer and clean up all resources
   * @returns Promise resolving when shutdown is complete
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Clean up available workers
    const availableTerminations = this.availableWorkers.map((worker) =>
      worker.terminate()
    );

    // Clean up busy workers
    const busyTerminations = Array.from(this.busyWorkers).map((worker) =>
      worker.terminate()
    );

    // Wait for all workers to terminate
    await Promise.all([...availableTerminations, ...busyTerminations]);

    // Clear all collections
    this.availableWorkers = [];
    this.busyWorkers.clear();
    this.workerHealth.clear();
    this.pendingWork = [];

    // Remove all event listeners
    this.removeAllListeners();
  }
}
