import { type AnalysisOptions } from '../../types/index.ts';

/**
 * Configuration options for parallel analysis
 */
export interface ParallelOptions extends AnalysisOptions {
  /** Maximum number of worker threads (default: Math.min(4, navigator.hardwareConcurrency || 4)) */
  maxWorkers?: number;
  /** Minimum number of worker threads (default: 1) */
  minWorkers?: number;
  /** Enable dynamic worker scaling based on workload (default: false) */
  dynamicScaling?: boolean;
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
export interface WorkItem {
  chunk: import('../../types/index.ts').CodeChunk;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Progress event data
 */
export interface ProgressEvent {
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
export interface WorkerHealth {
  worker: Worker;
  tasksCompleted: number;
  lastActivity: number;
  isHealthy: boolean;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
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
}
