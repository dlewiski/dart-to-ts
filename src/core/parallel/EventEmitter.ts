/**
 * Custom EventTarget-based event emitter for Deno compatibility
 * Replaces Node.js EventEmitter with Deno-compatible implementation
 * Uses AbortController pattern for proper listener cleanup
 */
export class DenoEventEmitter extends EventTarget {
  private abortController: AbortController;
  private listenerMap: Map<string, Set<EventListener>>;

  constructor() {
    super();
    this.abortController = new AbortController();
    this.listenerMap = new Map();
  }

  emit(eventName: string, data?: unknown): void {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  on(eventName: string, listener: (event: CustomEvent) => void): void {
    const wrappedListener = listener as EventListener;

    // Track the listener
    if (!this.listenerMap.has(eventName)) {
      this.listenerMap.set(eventName, new Set());
    }
    this.listenerMap.get(eventName)!.add(wrappedListener);

    // Add with abort signal for cleanup
    this.addEventListener(eventName, wrappedListener, {
      signal: this.abortController.signal,
    });
  }

  off(eventName: string, listener: (event: CustomEvent) => void): void {
    const wrappedListener = listener as EventListener;

    // Remove from tracking
    const listeners = this.listenerMap.get(eventName);
    if (listeners) {
      listeners.delete(wrappedListener);
      if (listeners.size === 0) {
        this.listenerMap.delete(eventName);
      }
    }

    this.removeEventListener(eventName, wrappedListener);
  }

  removeAllListeners(): void {
    // Abort all listeners at once - this removes all event listeners
    // that were added with the abort signal
    this.abortController.abort();

    // Create a new AbortController for future listeners
    this.abortController = new AbortController();

    // Clear the listener map
    this.listenerMap.clear();
  }
}
