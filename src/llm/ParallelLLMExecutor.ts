/**
 * Parallel LLM Executor for running multiple providers concurrently
 */

import {
  type AggregatedLLMResponse,
  type ILLMProvider as _ILLMProvider,
  type LLMOptions,
  type LLMProvider,
  LLMProviderError,
  type LLMResponse,
  type ParallelLLMOptions,
} from '../types/llm.ts';
import { LLMManager } from './LLMManager.ts';
import { ResultAggregator } from './ResultAggregator.ts';
import { logWarning } from '../utils/error-handling.ts';

export class ParallelLLMExecutor {
  private manager: LLMManager;
  private aggregator: ResultAggregator;
  private verbose: boolean;

  constructor(manager: LLMManager, verbose = false) {
    this.manager = manager;
    this.aggregator = new ResultAggregator();
    this.verbose = verbose;
  }

  /**
   * Execute prompt on multiple providers in parallel
   */
  async executeParallel(
    prompt: string,
    options?: ParallelLLMOptions & Partial<LLMOptions>,
  ): Promise<AggregatedLLMResponse> {
    const providers = options?.providers ||
      this.manager.getAvailableProviders();
    const aggregationStrategy = options?.aggregationStrategy || 'first';
    const timeout = options?.timeout || 60000;

    if (providers.length === 0) {
      throw new Error('No providers specified for parallel execution');
    }

    if (this.verbose) {
      console.log(
        `[ParallelLLM] Executing on providers: ${providers.join(', ')}`,
      );
      console.log(`[ParallelLLM] Aggregation strategy: ${aggregationStrategy}`);
    }

    const startTime = performance.now();

    // Create promises for each provider
    const providerPromises = providers.map((providerName) =>
      this.executeWithProvider(providerName, prompt, options, timeout)
    );

    // Execute all providers in parallel
    const results = await Promise.allSettled(providerPromises);

    // Collect successful responses
    const successfulResponses: LLMResponse[] = [];
    const errors: Array<{ provider: LLMProvider; error: unknown }> = [];

    results.forEach((result, index) => {
      const providerName = providers[index];

      if (result.status === 'fulfilled' && result.value) {
        successfulResponses.push(result.value);
      } else if (result.status === 'rejected') {
        if (providerName) {
          errors.push({ provider: providerName, error: result.reason });
        }

        if (this.verbose) {
          console.error(
            `[ParallelLLM] Provider ${providerName} failed:`,
            result.reason,
          );
        }
      }
    });

    // Check if we have any successful responses
    if (successfulResponses.length === 0) {
      throw new Error(
        `All providers failed. Errors: ${
          errors.map((e) => `${e.provider}: ${e.error}`).join(', ')
        }`,
      );
    }

    // Aggregate results based on strategy
    const aggregatedResponse = this.aggregator.aggregate(
      successfulResponses,
      aggregationStrategy,
    );

    const totalLatency = performance.now() - startTime;

    if (this.verbose) {
      console.log(`[ParallelLLM] Completed in ${totalLatency.toFixed(2)}ms`);
      console.log(
        `[ParallelLLM] Successful providers: ${
          successfulResponses.map((r) => r.provider).join(', ')
        }`,
      );
      if (aggregatedResponse.consensus) {
        console.log(
          `[ParallelLLM] Consensus confidence: ${
            (aggregatedResponse.confidence || 0) * 100
          }%`,
        );
      }
    }

    return {
      ...aggregatedResponse,
      latency: totalLatency,
    };
  }

  /**
   * Execute prompt with a specific provider
   */
  private async executeWithProvider(
    providerName: LLMProvider,
    prompt: string,
    options?: Partial<LLMOptions>,
    timeout?: number,
  ): Promise<LLMResponse> {
    const provider = this.manager.getProvider(providerName);

    if (!provider) {
      throw new LLMProviderError(
        providerName,
        `Provider ${providerName} is not available`,
        'PROVIDER_NOT_AVAILABLE',
      );
    }

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new LLMProviderError(
            providerName,
            `Provider ${providerName} timed out after ${timeout}ms`,
            'TIMEOUT',
          ),
        );
      }, timeout || 60000);
    });

    // Race between the actual execution and timeout
    try {
      const response = await Promise.race([
        provider.complete(prompt, { ...options, provider: providerName }),
        timeoutPromise,
      ]);

      return response;
    } catch (error) {
      // Log the error but re-throw it
      logWarning(`Provider ${providerName} failed during parallel execution`, {
        operation: 'Parallel LLM execution',
        details: { provider: providerName, error },
      });
      throw error;
    }
  }

  /**
   * Compare responses from multiple providers
   */
  async compareProviders(
    prompt: string,
    providers?: LLMProvider[],
    options?: Partial<LLMOptions>,
  ): Promise<{
    responses: LLMResponse[];
    comparison: {
      consensusContent?: string;
      similarity: number;
      differences: string[];
      recommendations: string[];
    };
  }> {
    const targetProviders = providers || this.manager.getAvailableProviders();

    const result = await this.executeParallel(prompt, {
      ...options,
      providers: targetProviders,
      aggregationStrategy: 'all',
    });

    const responses = [result.primary, ...(result.alternatives || [])];
    const comparison = this.aggregator.compareResponses(responses);

    return {
      responses,
      comparison,
    };
  }

  /**
   * Execute with automatic fallback to best available provider
   */
  async executeWithBestProvider(
    prompt: string,
    options?: Partial<LLMOptions>,
  ): Promise<LLMResponse> {
    const providers = this.manager.getAvailableProviders();

    if (providers.length === 0) {
      throw new Error('No providers available');
    }

    // Try providers in order of priority
    for (const providerName of providers) {
      try {
        if (this.verbose) {
          console.log(`[ParallelLLM] Trying provider: ${providerName}`);
        }

        return await this.executeWithProvider(providerName, prompt, options);
      } catch (_error) {
        if (this.verbose) {
          console.warn(
            `[ParallelLLM] Provider ${providerName} failed, trying next...`,
          );
        }

        // Continue to next provider
        continue;
      }
    }

    throw new Error('All providers failed to execute the prompt');
  }
}
