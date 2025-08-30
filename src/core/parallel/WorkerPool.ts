import { type ParallelOptions, type WorkerHealth } from './types.ts';

/**
 * Worker pool management for Deno parallel processing
 */
export class WorkerPool {
  private availableWorkers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private workerHealth: Map<Worker, WorkerHealth> = new Map();
  private isShuttingDown = false;

  constructor(private options: ParallelOptions) {}

  /**
   * Initialize the Deno worker pool with health monitoring
   */
  initialize(): void {
    const workerPath = this.resolveWorkerPath();
    const initialWorkers = this.options.dynamicScaling
      ? this.options.minWorkers || 1
      : this.options.maxWorkers || 4;

    for (let i = 0; i < initialWorkers; i++) {
      this.createWorker(workerPath);
    }
  }

  /**
   * Create a single Deno worker with full event handling and health monitoring
   */
  private createWorker(workerPath: string): void {
    const worker = new Worker(
      workerPath,
      {
        type: 'module',
        deno: {
          permissions: {
            read: true,
            write: false, // Minimized from original feedback
            run: ['claude'], // Allow running claude CLI
            env: true, // Allow reading environment variables for Claude API
            net: false, // Don't need network access, claude CLI handles that
          },
        },
      } as WorkerOptions & { deno?: { permissions: Record<string, unknown> } },
    );

    this.availableWorkers.push(worker);

    // Initialize health tracking
    this.workerHealth.set(worker, {
      worker,
      tasksCompleted: 0,
      lastActivity: Date.now(),
      isHealthy: true,
    });

    worker.addEventListener('error', (error) => {
      console.error('Worker error:', error);
      this.handleWorkerError(worker, error);
    });
  }

  /**
   * Handle worker error and potential restart
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
   */
  private restartWorker(oldWorker: Worker): void {
    this.removeWorker(oldWorker);
    const workerPath = this.resolveWorkerPath();
    this.createWorker(workerPath);
  }

  /**
   * Remove a worker from all tracking structures
   */
  removeWorker(worker: Worker): void {
    const index = this.availableWorkers.indexOf(worker);
    if (index !== -1) {
      this.availableWorkers.splice(index, 1);
    }

    this.busyWorkers.delete(worker);
    this.workerHealth.delete(worker);
  }

  /**
   * Resolve the correct worker file path using Deno APIs
   */
  private resolveWorkerPath(): string {
    const workerUrl = new URL('./worker.ts', import.meta.url);
    return workerUrl.href;
  }

  /**
   * Get an available worker
   */
  getAvailableWorker(): Worker | undefined {
    const worker = this.availableWorkers.pop();
    if (worker) {
      this.busyWorkers.add(worker);
    }
    return worker;
  }

  /**
   * Return a worker to the available pool
   */
  returnWorkerToPool(worker: Worker): void {
    this.busyWorkers.delete(worker);
    if (!this.availableWorkers.includes(worker)) {
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Update worker health tracking
   */
  updateWorkerHealth(worker: Worker): void {
    const health = this.workerHealth.get(worker);
    if (health) {
      health.tasksCompleted++;
      health.lastActivity = Date.now();
      health.isHealthy = true;
    }
  }

  /**
   * Adjust worker pool size based on workload (for dynamic scaling)
   */
  adjustPoolSize(pendingWorkLength: number): void {
    if (!this.options.dynamicScaling) return;

    const totalWorkers = this.availableWorkers.length + this.busyWorkers.size;
    const queueRatio = pendingWorkLength / Math.max(1, totalWorkers);

    // Scale up if queue is building and we're under max workers
    if (
      queueRatio > 2 &&
      totalWorkers < (this.options.maxWorkers || 4)
    ) {
      const workerPath = this.resolveWorkerPath();
      this.createWorker(workerPath);
      console.debug(`Scaled up to ${totalWorkers + 1} workers`);
    } // Scale down if queue is empty and we have excess workers
    else if (
      queueRatio < 0.5 &&
      pendingWorkLength === 0 &&
      totalWorkers > (this.options.minWorkers || 1) &&
      this.availableWorkers.length > 0
    ) {
      const excessWorker = this.availableWorkers.pop();
      if (excessWorker) {
        this.removeWorker(excessWorker);
        excessWorker.terminate();
        console.debug(`Scaled down to ${totalWorkers - 1} workers`);
      }
    }
  }

  /**
   * Get worker pool metrics
   */
  getMetrics(): {
    total: number;
    available: number;
    busy: number;
    healthy: number;
  } {
    return {
      total: this.availableWorkers.length + this.busyWorkers.size,
      available: this.availableWorkers.length,
      busy: this.busyWorkers.size,
      healthy: Array.from(this.workerHealth.values()).filter(
        (h) => h.isHealthy,
      ).length,
    };
  }

  /**
   * Get health status of all workers
   */
  getWorkerHealth(): WorkerHealth[] {
    return Array.from(this.workerHealth.values());
  }

  /**
   * Shutdown all workers
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
  }
}
