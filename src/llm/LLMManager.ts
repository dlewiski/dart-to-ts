/**
 * LLM Manager for orchestrating multiple providers
 * Handles provider selection, fallbacks, and configuration
 */

import {
  type ILLMProvider,
  type LLMOptions,
  type LLMProvider,
  type LLMProviderConfig,
  LLMProviderError,
  type LLMResponse,
} from '../types/llm.ts';
import { ClaudeProvider } from './providers/ClaudeProvider.ts';
import { OllamaProvider } from './providers/OllamaProvider.ts';
import { logError, logWarning } from '../utils/error-handling.ts';

export interface LLMManagerConfig {
  providers: Record<LLMProvider, LLMProviderConfig>;
  defaultProvider?: LLMProvider;
  fallbackEnabled?: boolean;
  verbose?: boolean;
}

export class LLMManager {
  private providers: Map<LLMProvider, ILLMProvider> = new Map();
  private config: LLMManagerConfig;
  private initialized = false;

  constructor(config?: Partial<LLMManagerConfig>) {
    this.config = {
      providers: config?.providers || this.getDefaultProvidersConfig(),
      defaultProvider: config?.defaultProvider || 'claude',
      fallbackEnabled: config?.fallbackEnabled ?? true,
      verbose: config?.verbose ?? false,
    };
  }

  /**
   * Initialize all enabled providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const initPromises: Promise<void>[] = [];

    for (
      const [providerName, providerConfig] of Object.entries(
        this.config.providers,
      )
    ) {
      if (providerConfig.enabled) {
        initPromises.push(
          this.initializeProvider(providerName as LLMProvider, providerConfig),
        );
      }
    }

    await Promise.allSettled(initPromises);

    if (this.providers.size === 0) {
      throw new Error('No LLM providers could be initialized');
    }

    this.initialized = true;
  }

  /**
   * Initialize a specific provider
   */
  private async initializeProvider(
    providerName: LLMProvider,
    config: LLMProviderConfig,
  ): Promise<void> {
    try {
      let provider: ILLMProvider;

      switch (providerName) {
        case 'claude':
          provider = new ClaudeProvider({
            model: config.defaultModel,
            ...(config.timeout && { timeout: config.timeout }),
          });
          break;
        case 'ollama':
          provider = new OllamaProvider({
            model: config.defaultModel,
            ...(config.baseUrl && { baseUrl: config.baseUrl }),
            ...(config.timeout && { timeout: config.timeout }),
          });
          break;
        default:
          logWarning(`Unknown provider: ${providerName}`, {
            operation: 'Provider initialization',
            details: { provider: providerName },
          });
          return;
      }

      await provider.initialize();
      this.providers.set(providerName, provider);
    } catch (error) {
      logError(error, {
        operation: 'Provider initialization',
        details: { provider: providerName },
      });

      if (this.config.verbose) {
        console.error(
          `[LLMManager] Failed to initialize ${providerName}:`,
          error,
        );
      }
    }
  }

  /**
   * Get a specific provider
   */
  getProvider(name: LLMProvider): ILLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Complete a prompt using the specified or default provider
   */
  async complete(
    prompt: string,
    options?: Partial<LLMOptions>,
  ): Promise<LLMResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const providerName = options?.provider || this.config.defaultProvider;
    if (!providerName) {
      throw new Error(
        'No provider specified and no default provider configured',
      );
    }

    // Try primary provider
    const primaryProvider = this.providers.get(providerName);
    if (primaryProvider) {
      try {
        if (this.config.verbose) {
          console.log(
            `[LLMManager] Calling provider ${providerName} with options:`,
            {
              provider: options?.provider,
              model: options?.model,
              format: options?.format,
              verbose: options?.verbose,
            },
          );
        }
        return await primaryProvider.complete(prompt, options);
      } catch (error) {
        if (!this.config.fallbackEnabled) {
          throw error;
        }

        logWarning(`Primary provider ${providerName} failed, trying fallback`, {
          operation: 'LLM completion',
          details: { error },
        });
      }
    }

    // Try fallback providers
    if (this.config.fallbackEnabled) {
      const fallbackProviders = this.getFallbackProviders(providerName);

      for (const fallbackName of fallbackProviders) {
        const fallbackProvider = this.providers.get(fallbackName);
        if (fallbackProvider) {
          try {
            if (this.config.verbose) {
              console.log(
                `[LLMManager] Using fallback provider: ${fallbackName}`,
              );
            }

            const response = await fallbackProvider.complete(prompt, {
              ...options,
              provider: fallbackName,
            });

            // Add metadata about fallback
            response.metadata = {
              ...response.metadata,
              fallback: true,
              originalProvider: providerName,
            };

            return response;
          } catch (error) {
            logWarning(`Fallback provider ${fallbackName} failed`, {
              operation: 'LLM completion fallback',
              details: { error },
            });
          }
        }
      }
    }

    throw new LLMProviderError(
      providerName,
      'All providers failed to complete the request',
      'ALL_PROVIDERS_FAILED',
    );
  }

  /**
   * Stream a completion (if provider supports it)
   */
  async streamComplete(
    prompt: string,
    options?: Partial<LLMOptions>,
    onChunk?: (chunk: string) => void,
  ): Promise<LLMResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const providerName = options?.provider || this.config.defaultProvider;
    if (!providerName) {
      throw new Error(
        'No provider specified and no default provider configured',
      );
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new LLMProviderError(
        providerName,
        `Provider ${providerName} is not available`,
        'PROVIDER_NOT_AVAILABLE',
      );
    }

    if (!provider.streamComplete) {
      // Fall back to regular completion if streaming not supported
      return await this.complete(prompt, options);
    }

    return await provider.streamComplete(prompt, options, onChunk);
  }

  /**
   * Get fallback providers based on priority
   */
  private getFallbackProviders(excludeProvider: LLMProvider): LLMProvider[] {
    return Array.from(this.providers.keys())
      .filter((name) => name !== excludeProvider)
      .sort((a, b) => {
        const priorityA = this.config.providers[a]?.priority || 999;
        const priorityB = this.config.providers[b]?.priority || 999;
        return priorityA - priorityB;
      });
  }

  /**
   * Get default providers configuration
   */
  private getDefaultProvidersConfig(): Record<LLMProvider, LLMProviderConfig> {
    return {
      claude: {
        enabled: true,
        priority: 1,
        models: ['sonnet', 'opus'],
        defaultModel: 'sonnet',
        timeout: 60000,
        maxRetries: 3,
      },
      ollama: {
        enabled: true,
        priority: 2,
        models: [],
        defaultModel: 'qwen2.5-coder:14b-instruct',
        baseUrl: 'http://localhost:11434',
        timeout: 60000,
        maxRetries: 2,
      },
      openai: {
        enabled: false,
        priority: 3,
        models: ['gpt-4', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4',
        timeout: 60000,
        maxRetries: 3,
      },
    };
  }

  /**
   * Shutdown all providers
   */
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    for (const provider of this.providers.values()) {
      if (provider.shutdown) {
        shutdownPromises.push(provider.shutdown());
      }
    }

    await Promise.allSettled(shutdownPromises);
    this.providers.clear();
    this.initialized = false;
  }
}
