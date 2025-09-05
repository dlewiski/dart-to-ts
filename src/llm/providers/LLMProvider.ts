/**
 * Base abstract class for LLM providers
 */

import {
  type ILLMProvider,
  type LLMOptions,
  type LLMProvider as LLMProviderType,
  LLMProviderError,
  type LLMResponse,
  LLMTimeoutError,
  type ProviderCapabilities,
} from '../../types/llm.ts';

export abstract class BaseLLMProvider implements ILLMProvider {
  abstract name: LLMProviderType;
  abstract capabilities: ProviderCapabilities;

  protected config: Partial<LLMOptions> = {};
  protected initialized = false;

  constructor(config?: Partial<LLMOptions>) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Initialize the provider
   */
  abstract initialize(): Promise<void>;

  /**
   * Check if the provider is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * List available models
   */
  abstract listModels(): Promise<string[]>;

  /**
   * Generate a completion
   */
  abstract complete(
    prompt: string,
    options?: Partial<LLMOptions>,
  ): Promise<LLMResponse>;

  /**
   * Generate a streaming completion (optional)
   */
  async streamComplete?(
    prompt: string,
    options?: Partial<LLMOptions>,
    onChunk?: (chunk: string) => void,
  ): Promise<LLMResponse>;

  /**
   * Shutdown the provider (optional)
   */
  async shutdown?(): Promise<void>;

  /**
   * Helper method to measure latency
   */
  protected async measureLatency<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; latency: number }> {
    const startTime = performance.now();
    const result = await operation();
    const latency = performance.now() - startTime;
    return { result, latency };
  }

  /**
   * Helper method to handle timeouts
   */
  protected withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new LLMTimeoutError(this.name, timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Helper method to retry operations
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw new LLMProviderError(
            this.name,
            `Failed after ${maxRetries} attempts: ${lastError.message}`,
            'MAX_RETRIES_EXCEEDED',
            { originalError: lastError },
          );
        }

        // Exponential backoff
        const waitTime = delayMs * Math.pow(2, attempt - 1);
        await this.sleep(waitTime);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Unexpected retry error');
  }

  /**
   * Helper method for sleep/delay
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate options
   */
  protected validateOptions(options?: Partial<LLMOptions>): void {
    if (options?.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        throw new LLMProviderError(
          this.name,
          'Temperature must be between 0 and 2',
          'INVALID_TEMPERATURE',
        );
      }
    }

    if (options?.maxTokens !== undefined && options.maxTokens <= 0) {
      throw new LLMProviderError(
        this.name,
        'Max tokens must be positive',
        'INVALID_MAX_TOKENS',
      );
    }
  }

  /**
   * Merge options with defaults
   */
  protected mergeOptions(options?: Partial<LLMOptions>): LLMOptions {
    const merged: LLMOptions = {
      provider: this.name,
      model: this.config.model || options?.model || this.getDefaultModel(),
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      timeout: options?.timeout ?? this.config.timeout ?? 60000,
      stream: options?.stream ?? this.config.stream ?? false,
    };

    // Only add optional properties if they are defined
    const maxTokens = options?.maxTokens ?? this.config.maxTokens;
    if (maxTokens !== undefined) {
      merged.maxTokens = maxTokens;
    }

    const verbose = options?.verbose ?? this.config.verbose;
    if (verbose !== undefined) {
      merged.verbose = verbose;
    }

    if (options?.format) {
      merged.format = options.format;
    }

    const systemPrompt = options?.systemPrompt ?? this.config.systemPrompt;
    if (systemPrompt) {
      merged.systemPrompt = systemPrompt;
    }

    const baseUrl = options?.baseUrl ?? this.config.baseUrl;
    if (baseUrl) {
      merged.baseUrl = baseUrl;
    }

    const apiKey = options?.apiKey ?? this.config.apiKey;
    if (apiKey) {
      merged.apiKey = apiKey;
    }

    return merged;
  }

  /**
   * Get default model for the provider
   */
  protected abstract getDefaultModel(): string;
}
