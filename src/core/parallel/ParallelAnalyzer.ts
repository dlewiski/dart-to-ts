import { type CodeChunk, type FunctionalAnalysis } from '../../types/index.ts';
import { DenoEventEmitter } from './EventEmitter.ts';
import { MemoryManager } from './MemoryManager.ts';
import { WorkerPool } from './WorkerPool.ts';
import { AnalysisProcessor } from './AnalysisProcessor.ts';
import {
  type ParallelOptions,
  type PerformanceMetrics,
  type ProgressEvent,
  type WorkerHealth,
  type WorkItem,
} from './types.ts';

/**
 * Parallel analyzer for processing code chunks using Deno Workers
 * Provides parallel execution with worker pool management, backpressure,
 * and health monitoring capabilities.
 *
 * Refactored into smaller, focused modules for better maintainability.
 */
export class ParallelAnalyzer extends DenoEventEmitter {
  private options: ParallelOptions;
  private processedChunks = 0;
  private totalChunks = 0;
  private pendingWork: WorkItem[] = [];

  private memoryManager: MemoryManager;
  private workerPool: WorkerPool;
  private processor: AnalysisProcessor;

  /**
   * Creates a new ParallelAnalyzer instance
   */
  constructor(options: ParallelOptions = {}) {
    super();
    this.options = {
      maxWorkers: options.maxWorkers ||
        Math.min(4, navigator.hardwareConcurrency || 4),
      minWorkers: options.minWorkers || 1,
      dynamicScaling: options.dynamicScaling || false,
      maxMemory: options.maxMemory || 512 * 1024 * 1024, // 512MB default
      streaming: options.streaming || false,
      chunkSize: options.chunkSize || 1024 * 1024, // 1MB default
      timeout: options.timeout || 60000, // 60s default
      useWorkers: options.useWorkers || false, // Default to false for now
      ...options,
    };

    // Initialize modules
    this.memoryManager = new MemoryManager(this.options);
    this.workerPool = new WorkerPool(this.options);
    this.processor = new AnalysisProcessor(this.options);

    if (this.options.useWorkers) {
      this.workerPool.initialize();
    }
  }

  /**
   * Analyze functionality across multiple code chunks in parallel
   */
  analyzeFunctionality(chunks: CodeChunk[]): Promise<FunctionalAnalysis> {
    this.totalChunks = chunks.length;
    this.processedChunks = 0;

    // Check memory before starting analysis
    this.memoryManager.checkMemoryUsage();

    if (this.options.useWorkers && this.workerPool.getMetrics().total > 0) {
      return this.processor.processChunksInParallel(
        chunks,
        (chunk) => this.assignWorkToWorker(chunk),
        (processed) => this.updateProgress(processed),
      );
    } else {
      // Fall back to sequential processing with progress events
      return this.processor.processChunksWithProgress(
        chunks,
        (processed) => this.updateProgress(processed),
      );
    }
  }

  /**
   * Assign work to an available worker with backpressure handling
   */
  private assignWorkToWorker(chunk: CodeChunk): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Apply backpressure if necessary
      if (
        this.memoryManager.shouldApplyBackpressure(
          this.pendingWork.length,
          this.options.maxWorkers || 4,
        )
      ) {
        setTimeout(() => {
          this.assignWorkToWorker(chunk).then(resolve).catch(reject);
        }, 10);
        return;
      }

      const worker = this.workerPool.getAvailableWorker();
      if (!worker) {
        this.pendingWork.push({ chunk, resolve, reject });
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Worker timeout after ${this.options.timeout}ms`));
        this.workerPool.returnWorkerToPool(worker);
      }, this.options.timeout);

      const messageHandler = (event: MessageEvent): void => {
        clearTimeout(timeout);
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);

        this.workerPool.updateWorkerHealth(worker);
        this.workerPool.returnWorkerToPool(worker);
        this.processNextWork();

        resolve(event.data);
      };

      const errorHandler = (error: ErrorEvent): void => {
        clearTimeout(timeout);
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
        this.workerPool.returnWorkerToPool(worker);
        reject(new Error(error.message));
      };

      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);
      worker.postMessage({ chunk, options: this.options });
    });
  }

  /**
   * Process the next pending work item if workers are available
   */
  private processNextWork(): void {
    if (
      this.workerPool.getMetrics().available > 0 && this.pendingWork.length > 0
    ) {
      const work = this.pendingWork.shift();
      if (work) {
        this.assignWorkToWorker(work.chunk)
          .then(work.resolve)
          .catch(work.reject);
      }
    }

    // Check if we should scale workers dynamically
    this.workerPool.adjustPoolSize(this.pendingWork.length);
  }

  /**
   * Update progress tracking
   */
  private updateProgress(processed: number): void {
    this.processedChunks = processed;
    this.emitProgress();
  }

  /**
   * Emit progress update event
   */
  private emitProgress(): void {
    const percentage = this.totalChunks > 0
      ? (this.processedChunks / this.totalChunks) * 100
      : 0;

    const workerMetrics = this.workerPool.getMetrics();
    const progressEvent: ProgressEvent = {
      processed: this.processedChunks,
      total: this.totalChunks,
      percentage,
      activeWorkers: workerMetrics.busy,
      availableWorkers: workerMetrics.available,
      pendingWork: this.pendingWork.length,
    };

    this.emit('progress', progressEvent);
  }

  /**
   * Get health status of all workers
   */
  getWorkerHealth(): WorkerHealth[] {
    return this.workerPool.getWorkerHealth();
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const memoryMetrics = this.memoryManager.getMemoryMetrics();
    const workerMetrics = this.workerPool.getMetrics();

    return {
      memory: memoryMetrics,
      workers: workerMetrics,
      queue: {
        pending: this.pendingWork.length,
        processed: this.processedChunks,
        total: this.totalChunks,
      },
    };
  }

  /**
   * Shutdown the analyzer and clean up all resources
   */
  async shutdown(): Promise<void> {
    await this.workerPool.shutdown();
    this.pendingWork = [];
    this.removeAllListeners();
  }
}
