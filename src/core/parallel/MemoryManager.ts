import { type ParallelOptions } from './types.ts';

/**
 * Memory management utilities for Deno parallel processing
 */
export class MemoryManager {
  constructor(private options: ParallelOptions) {}

  /**
   * Check if we should apply backpressure due to memory or queue pressure
   * Using Deno.memoryUsage() for enhanced memory monitoring
   */
  shouldApplyBackpressure(
    pendingWorkLength: number,
    maxWorkers: number,
  ): boolean {
    // Enhanced memory-based backpressure using Deno APIs
    let memoryPressure = false;

    try {
      if (Deno.memoryUsage && this.options.maxMemory) {
        const memUsage = Deno.memoryUsage();
        const heapUsed = memUsage.heapUsed || 0;
        memoryPressure = heapUsed > this.options.maxMemory * 0.8; // 80% threshold
      }
    } catch {
      // Fallback if memoryUsage is not available
      memoryPressure = false;
    }

    // Queue-based backpressure
    const queuePressure = pendingWorkLength > maxWorkers * 2;

    return memoryPressure || queuePressure;
  }

  /**
   * Check memory usage and apply mitigation strategies
   * Enhanced with Deno APIs
   */
  checkMemoryUsage(): void {
    if (!this.options.maxMemory) return;

    try {
      if (Deno.memoryUsage) {
        const memUsage = Deno.memoryUsage();
        const heapUsed = memUsage.heapUsed || 0;
        const usageRatio = heapUsed / this.options.maxMemory;

        if (usageRatio > 0.9) {
          console.warn(
            `High memory usage detected: ${(usageRatio * 100).toFixed(1)}%`,
          );
          // Force garbage collection if available
          if (
            'gc' in globalThis &&
            typeof (globalThis as { gc?: () => void }).gc === 'function'
          ) {
            ((globalThis as unknown) as { gc: () => void }).gc();
          }
        }
      }
    } catch (error) {
      console.debug(
        'Memory monitoring not available:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Get current memory metrics using Deno APIs
   */
  getMemoryMetrics(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    usageRatio: number;
  } {
    // Enhanced memory metrics using Deno APIs
    let memUsage = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    };

    try {
      if (Deno.memoryUsage) {
        const denoMemUsage = Deno.memoryUsage();
        memUsage = {
          heapUsed: denoMemUsage.heapUsed || 0,
          heapTotal: denoMemUsage.heapTotal || 0,
          external: denoMemUsage.external || 0,
          rss: denoMemUsage.rss || 0,
        };
      }
    } catch {
      // Fallback to default values if Deno.memoryUsage is not available
    }

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      usageRatio: this.options.maxMemory
        ? memUsage.heapUsed / this.options.maxMemory
        : 0,
    };
  }
}
