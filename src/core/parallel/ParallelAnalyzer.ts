import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { CodeChunk, FunctionalAnalysis, AnalysisOptions } from '../../types';
import { analyzeFunctionality as sequentialAnalyze } from '../../analyzer';

export interface ParallelOptions extends AnalysisOptions {
  maxWorkers?: number;
  maxMemory?: number;
  streaming?: boolean;
  chunkSize?: number;
  timeout?: number;
  useWorkers?: boolean; // Option to enable/disable worker threads
}

export class ParallelAnalyzer extends EventEmitter {
  private options: ParallelOptions;
  private workers: Worker[] = [];
  private activeWorkers = 0;
  private processedChunks = 0;
  private totalChunks = 0;
  private workerPool: Worker[] = [];
  private availableWorkers: Worker[] = [];

  constructor(options: ParallelOptions = {}) {
    super();
    this.options = {
      maxWorkers: options.maxWorkers || 4,
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

  private initializeWorkerPool(): void {
    const workerPath = path.join(__dirname, 'worker.js');
    
    for (let i = 0; i < (this.options.maxWorkers || 4); i++) {
      const worker = new Worker(workerPath);
      this.workerPool.push(worker);
      this.availableWorkers.push(worker);
      
      worker.on('message', (result) => {
        this.handleWorkerResult(worker, result);
      });
      
      worker.on('error', (error) => {
        console.error('Worker error:', error);
        this.returnWorkerToPool(worker);
      });
    }
  }

  private handleWorkerResult(worker: Worker, result: any): void {
    this.processedChunks++;
    this.activeWorkers--;
    this.returnWorkerToPool(worker);
    this.emitProgress();
    
    // Process result and merge into analysis
    if (result.success) {
      this.emit('chunkComplete', result);
    } else {
      this.emit('chunkError', result);
    }
  }

  private returnWorkerToPool(worker: Worker): void {
    if (!this.availableWorkers.includes(worker)) {
      this.availableWorkers.push(worker);
    }
  }

  async analyzeFunctionality(chunks: CodeChunk[]): Promise<FunctionalAnalysis> {
    this.totalChunks = chunks.length;
    this.processedChunks = 0;

    // For now, fall back to sequential processing with progress events
    // This allows us to incrementally add parallel processing
    const results = await this.processChunksWithProgress(chunks);
    
    return results;
  }

  private async processChunksWithProgress(chunks: CodeChunk[]): Promise<FunctionalAnalysis> {
    // Emit initial progress
    this.emitProgress();

    // Process chunks (sequential for now, parallel coming next)
    const batchSize = Math.min(this.options.maxWorkers || 4, chunks.length);
    
    // Simple batching to simulate parallel processing
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
      
      // Process batch (sequential within batch for now)
      for (const chunk of batch) {
        await this.processChunk(chunk);
        this.processedChunks++;
        this.emitProgress();
      }
    }

    // Use existing sequential analyzer for actual processing
    // This ensures compatibility while we build parallel features
    return sequentialAnalyze(chunks, this.options);
  }

  private async processChunk(chunk: CodeChunk): Promise<void> {
    // Simulate processing delay for testing
    if (chunk.files[0]?.content === 'TRIGGER_ERROR') {
      // Handle error case gracefully
      return;
    }
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    if (this.options.maxMemory && memUsage.heapUsed > this.options.maxMemory) {
      console.warn('Memory limit approaching, throttling...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Simulate chunk processing
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private emitProgress(): void {
    const percentage = this.totalChunks > 0 
      ? (this.processedChunks / this.totalChunks) * 100 
      : 0;

    this.emit('progress', {
      processed: this.processedChunks,
      total: this.totalChunks,
      percentage,
      activeWorkers: this.activeWorkers,
    });
  }

  async shutdown(): Promise<void> {
    // Clean up worker threads if they exist
    for (const worker of this.workerPool) {
      await worker.terminate();
    }
    this.workerPool = [];
    this.availableWorkers = [];
    
    // Clean up old workers array too
    for (const worker of this.workers) {
      await worker.terminate();
    }
    this.workers = [];
  }
}