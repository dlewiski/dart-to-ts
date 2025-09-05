/**
 * Claude LLM provider implementation
 * Wraps the existing Claude CLI functionality
 */

import { BaseLLMProvider } from './LLMProvider.ts';
import {
  type ClaudeProviderOptions,
  type LLMOptions as _LLMOptions,
  LLMProviderError,
  type LLMResponse,
  type ProviderCapabilities,
} from '../../types/llm.ts';
import { executeClaude } from '../../claude-cli.ts';
import type { ClaudeModel, ClaudeOptions } from '../../types/claude.ts';

export class ClaudeProvider extends BaseLLMProvider {
  name = 'claude' as const;

  capabilities: ProviderCapabilities = {
    streaming: false, // Claude CLI doesn't support streaming yet
    functionCalling: false,
    vision: false,
    maxContextLength: 200000, // Claude 3 context window
    costPerToken: {
      input: 0.000003, // $3 per 1M tokens (Sonnet)
      output: 0.000015, // $15 per 1M tokens (Sonnet)
    },
  };

  private availableModels: ClaudeModel[] = ['sonnet', 'opus'];

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check if Claude CLI is available
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new LLMProviderError(
        this.name,
        'Claude CLI is not available. Please ensure it is installed and configured.',
        'CLI_NOT_AVAILABLE',
      );
    }

    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try to run Claude with a simple test
      const command = new Deno.Command('which', {
        args: ['claude'],
        stdout: 'piped',
        stderr: 'piped',
      });

      const { code } = await command.output();
      return code === 0;
    } catch {
      return false;
    }
  }

  listModels(): Promise<string[]> {
    return Promise.resolve([...this.availableModels]);
  }

  async complete(
    prompt: string,
    options?: Partial<ClaudeProviderOptions>,
  ): Promise<LLMResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.validateOptions(options);
    const mergedOptions = this.mergeOptions(options) as ClaudeProviderOptions;

    try {
      // Map our options to Claude CLI options
      const claudeOptions: ClaudeOptions = {
        model: (mergedOptions.model as ClaudeModel) || 'sonnet',
        outputFormat: mergedOptions.outputFormat || 'text',
        maxRetries: 3,
        verbose: mergedOptions.verbose || false,
        ...(mergedOptions.timeout && { timeout: mergedOptions.timeout }),
      };

      // Add system prompt to the prompt if provided
      const fullPrompt = mergedOptions.systemPrompt
        ? `${mergedOptions.systemPrompt}\n\n${prompt}`
        : prompt;

      // Execute with latency measurement
      const { result: response, latency } = await this.measureLatency(
        () =>
          this.withTimeout(
            executeClaude(fullPrompt, claudeOptions),
            mergedOptions.timeout || 60000,
          ),
      );

      // Format the response
      const llmResponse: LLMResponse = {
        content: typeof response.result === 'string'
          ? response.result
          : JSON.stringify(response.result),
        provider: this.name,
        model: claudeOptions.model || 'sonnet',
        latency,
        metadata: {
          raw: response.raw,
        },
      };

      if (response.error) {
        llmResponse.error = response.error;
      }

      return llmResponse;
    } catch (error) {
      if (error instanceof LLMProviderError) {
        throw error;
      }

      throw new LLMProviderError(
        this.name,
        `Claude completion failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'COMPLETION_FAILED',
        { originalError: error },
      );
    }
  }

  protected getDefaultModel(): string {
    return 'sonnet';
  }
}
