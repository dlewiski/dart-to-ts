/**
 * Type definitions for LLM provider abstraction
 */

export type LLMProvider = 'claude' | 'ollama' | 'openai';

export interface LLMOptions {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  stream?: boolean;
  systemPrompt?: string;
  baseUrl?: string; // For custom endpoints
  apiKey?: string; // For providers that need it
  format?: string; // For Ollama JSON format
  verbose?: boolean; // Enable verbose logging
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, unknown>;
  error?: string;
  latency?: number; // Response time in ms
}

export interface LLMProviderConfig {
  enabled: boolean;
  priority: number; // Lower number = higher priority
  models: string[];
  defaultModel: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ParallelLLMOptions {
  providers: LLMProvider[];
  aggregationStrategy?: 'first' | 'consensus' | 'best' | 'all';
  timeout?: number;
  fallbackEnabled?: boolean;
}

export interface AggregatedLLMResponse {
  primary: LLMResponse;
  alternatives?: LLMResponse[];
  consensus?: string | undefined;
  confidence?: number;
  latency: number;
}

export interface ProviderCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  maxContextLength: number;
  costPerToken?: {
    input: number;
    output: number;
  };
}

// Ollama-specific types
export interface OllamaOptions extends LLMOptions {
  format?: 'json';
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

// Claude-specific types (extending existing)
export interface ClaudeProviderOptions extends LLMOptions {
  outputFormat?: 'text' | 'json';
  verbose?: boolean;
}

// Provider interface that all providers must implement
export interface ILLMProvider {
  name: LLMProvider;
  capabilities: ProviderCapabilities;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Check if the provider is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * List available models
   */
  listModels(): Promise<string[]>;

  /**
   * Generate a completion
   */
  complete(prompt: string, options?: Partial<LLMOptions>): Promise<LLMResponse>;

  /**
   * Generate a streaming completion
   */
  streamComplete?(
    prompt: string,
    options?: Partial<LLMOptions>,
    onChunk?: (chunk: string) => void,
  ): Promise<LLMResponse>;

  /**
   * Shutdown the provider
   */
  shutdown?(): Promise<void>;
}

// Error types
export class LLMProviderError extends Error {
  constructor(
    public provider: LLMProvider,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

export class LLMTimeoutError extends LLMProviderError {
  constructor(provider: LLMProvider, timeout: number) {
    super(
      provider,
      `Provider ${provider} timed out after ${timeout}ms`,
      'TIMEOUT',
    );
    this.name = 'LLMTimeoutError';
  }
}

export class LLMModelNotFoundError extends LLMProviderError {
  constructor(provider: LLMProvider, model: string) {
    super(
      provider,
      `Model ${model} not found for provider ${provider}`,
      'MODEL_NOT_FOUND',
    );
    this.name = 'LLMModelNotFoundError';
  }
}
