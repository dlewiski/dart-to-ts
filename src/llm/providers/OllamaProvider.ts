/**
 * Ollama LLM provider implementation
 * Uses Ollama's HTTP API for local model inference
 */

import { BaseLLMProvider } from './LLMProvider.ts';
import {
  LLMModelNotFoundError,
  type LLMOptions as _LLMOptions,
  LLMProviderError,
  type LLMResponse,
  type OllamaModel,
  type OllamaOptions,
  type OllamaResponse,
  type ProviderCapabilities,
} from '../../types/llm.ts';

export class OllamaProvider extends BaseLLMProvider {
  name = 'ollama' as const;

  capabilities: ProviderCapabilities = {
    streaming: true,
    functionCalling: false,
    vision: true, // Some models support vision
    maxContextLength: 32768, // Varies by model
    costPerToken: {
      input: 0, // Local inference is free
      output: 0,
    },
  };

  private baseUrl: string;
  private availableModels: string[] = [];

  constructor(config?: Partial<OllamaOptions>) {
    super(config);
    this.baseUrl = config?.baseUrl || 'http://localhost:11434';
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new LLMProviderError(
        this.name,
        `Ollama is not available at ${this.baseUrl}. Please ensure Ollama is running.`,
        'SERVICE_NOT_AVAILABLE',
      );
    }

    // Load available models
    this.availableModels = await this.listModels();
    if (this.availableModels.length === 0) {
      throw new LLMProviderError(
        this.name,
        'No models found in Ollama. Please pull a model first (e.g., ollama pull qwen2.5-coder)',
        'NO_MODELS_AVAILABLE',
      );
    }

    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json() as { models: OllamaModel[] };
      return data.models.map((model) => model.name);
    } catch (error) {
      throw new LLMProviderError(
        this.name,
        `Failed to list Ollama models: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'LIST_MODELS_FAILED',
      );
    }
  }

  async complete(
    prompt: string,
    options?: Partial<OllamaOptions>,
  ): Promise<LLMResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.validateOptions(options);
    const mergedOptions = this.mergeOptions(options) as OllamaOptions;

    // Validate model exists
    const model = mergedOptions.model || this.getDefaultModel();
    if (!this.availableModels.includes(model)) {
      throw new LLMModelNotFoundError(this.name, model);
    }

    try {
      const requestBody = {
        model,
        prompt: mergedOptions.systemPrompt
          ? `${mergedOptions.systemPrompt}\n\n${prompt}`
          : prompt,
        stream: false,
        format: mergedOptions.format,
        context: mergedOptions.context,
        options: {
          temperature: mergedOptions.temperature,
          num_predict: mergedOptions.maxTokens,
          ...mergedOptions.options,
        },
      };

      // Execute with latency measurement
      const { result: response, latency } = await this.measureLatency(
        () =>
          this.withTimeout(
            this.sendRequest(requestBody),
            mergedOptions.timeout || 60000,
          ),
      );

      return this.formatResponse(response, model, latency);
    } catch (error) {
      console.error('[OllamaProvider] Completion error:', error);
      if (error instanceof LLMProviderError) {
        throw error;
      }

      throw new LLMProviderError(
        this.name,
        `Ollama completion failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'COMPLETION_FAILED',
        { originalError: error },
      );
    }
  }

  override async streamComplete(
    prompt: string,
    options?: Partial<OllamaOptions>,
    onChunk?: (chunk: string) => void,
  ): Promise<LLMResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.validateOptions(options);
    const mergedOptions = this.mergeOptions(options) as OllamaOptions;

    // Validate model exists
    const model = mergedOptions.model || this.getDefaultModel();
    if (!this.availableModels.includes(model)) {
      throw new LLMModelNotFoundError(this.name, model);
    }

    try {
      const requestBody = {
        model,
        prompt: mergedOptions.systemPrompt
          ? `${mergedOptions.systemPrompt}\n\n${prompt}`
          : prompt,
        stream: true,
        format: mergedOptions.format,
        context: mergedOptions.context,
        options: {
          temperature: mergedOptions.temperature,
          num_predict: mergedOptions.maxTokens,
          ...mergedOptions.options,
        },
      };

      const startTime = performance.now();
      const fetchResponse = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(mergedOptions.timeout || 60000),
      });

      if (!fetchResponse.ok) {
        throw new Error(
          `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`,
        );
      }

      if (!fetchResponse.body) {
        throw new Error('No response body received');
      }

      // Process streaming response
      const reader = fetchResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let lastResponse: OllamaResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaResponse;
            if (data.response) {
              fullResponse += data.response;
              onChunk?.(data.response);
            }
            if (data.done) {
              lastResponse = data;
            }
          } catch {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      }

      const latency = performance.now() - startTime;

      const response: LLMResponse = {
        content: fullResponse,
        provider: this.name,
        model,
        latency,
      };

      // Add usage info if lastResponse exists
      if (lastResponse) {
        const usage: {
          promptTokens?: number;
          completionTokens?: number;
          totalTokens: number;
        } = {
          totalTokens: (lastResponse.prompt_eval_count || 0) +
            (lastResponse.eval_count || 0),
        };

        if (lastResponse.prompt_eval_count !== undefined) {
          usage.promptTokens = lastResponse.prompt_eval_count;
        }
        if (lastResponse.eval_count !== undefined) {
          usage.completionTokens = lastResponse.eval_count;
        }

        response.usage = usage;
        response.metadata = {
          context: lastResponse.context,
          total_duration: lastResponse.total_duration,
          load_duration: lastResponse.load_duration,
          eval_duration: lastResponse.eval_duration,
        };
      }

      return response;
    } catch (error) {
      if (error instanceof LLMProviderError) {
        throw error;
      }

      throw new LLMProviderError(
        this.name,
        `Ollama streaming failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'STREAMING_FAILED',
        { originalError: error },
      );
    }
  }

  protected getDefaultModel(): string {
    return 'qwen2.5-coder:14b-instruct';
  }

  private async sendRequest(body: unknown): Promise<OllamaResponse> {
    console.log(`[Ollama] Starting inference...`);

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as OllamaResponse;
    console.log(`[Ollama] Completed (${result.response?.length || 0} chars)`);
    return result;
  }

  private formatResponse(
    ollamaResponse: OllamaResponse,
    model: string,
    latency: number,
  ): LLMResponse {
    return {
      content: ollamaResponse.response,
      provider: this.name,
      model,
      latency,
      usage: (() => {
        const usage: {
          promptTokens?: number;
          completionTokens?: number;
          totalTokens: number;
        } = {
          totalTokens: (ollamaResponse.prompt_eval_count || 0) +
            (ollamaResponse.eval_count || 0),
        };

        if (ollamaResponse.prompt_eval_count !== undefined) {
          usage.promptTokens = ollamaResponse.prompt_eval_count;
        }
        if (ollamaResponse.eval_count !== undefined) {
          usage.completionTokens = ollamaResponse.eval_count;
        }

        return usage;
      })(),
      metadata: {
        context: ollamaResponse.context,
        total_duration: ollamaResponse.total_duration,
        load_duration: ollamaResponse.load_duration,
        eval_duration: ollamaResponse.eval_duration,
      },
    };
  }
}
