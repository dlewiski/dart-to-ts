/**
 * LLM Service - Integrates the new LLM abstraction with existing analysis
 */

import { LLMManager, type LLMManagerConfig } from '../llm/LLMManager.ts';
import { ParallelLLMExecutor } from '../llm/ParallelLLMExecutor.ts';
import type { AnalysisSchema, CLIOptions } from '../types/index.ts';
import type {
  AggregatedLLMResponse,
  LLMOptions,
  LLMResponse,
  ParallelLLMOptions,
} from '../types/llm.ts';
// import { extractAndValidateJson } from '../utils/claude-utils.ts'; // Using local version

export class LLMService {
  private manager: LLMManager;
  private parallelExecutor: ParallelLLMExecutor;
  private options: CLIOptions;

  constructor(options: CLIOptions) {
    this.options = options;

    // Configure LLM manager based on CLI options
    const config = this.buildManagerConfig(options);
    this.manager = new LLMManager(config);
    this.parallelExecutor = new ParallelLLMExecutor(
      this.manager,
      options.verbose,
    );
  }

  /**
   * Initialize the LLM service
   */
  async initialize(): Promise<void> {
    await this.manager.initialize();
  }

  /**
   * Analyze code using configured LLM provider(s)
   */
  async analyzeCode(
    code: string,
    analysisType: string,
    schema?: AnalysisSchema,
  ): Promise<unknown> {
    const schemaInstruction = schema
      ? `Return ONLY a valid JSON object matching this schema: ${
        JSON.stringify(schema)
      }`
      : 'Return ONLY valid JSON';

    const prompt = `
${analysisType}

${schemaInstruction}

Code:
\`\`\`
${code}
\`\`\`
`;

    // Determine execution strategy based on provider option
    let response: LLMResponse | AggregatedLLMResponse;

    if (this.options.provider === 'parallel') {
      // Use parallel execution
      const parallelOptions: ParallelLLMOptions & Partial<LLMOptions> = {
        providers: this.parseParallelProviders(),
        aggregationStrategy: this.options.aggregation || 'consensus',
        ...(this.options.timeout && { timeout: this.options.timeout }),
        ...(this.options.verbose && { verbose: this.options.verbose }),
      };

      // Add format option for Ollama to ensure JSON output
      if (this.parseParallelProviders().includes('ollama')) {
        parallelOptions.format = 'json';
      }

      response = await this.parallelExecutor.executeParallel(
        prompt,
        parallelOptions,
      );

      // Use the primary response content
      response = response.primary;
    } else {
      // Use single provider
      const providerOptions: Partial<LLMOptions> = {
        provider: this.mapProvider(),
        model: this.mapModel(),
        ...(this.options.timeout && { timeout: this.options.timeout }),
        ...(this.options.verbose && { verbose: this.options.verbose }),
      };

      // Add format option for Ollama to ensure JSON output
      if (this.mapProvider() === 'ollama') {
        providerOptions.format = 'json';
      }

      response = await this.manager.complete(prompt, providerOptions);
    }

    if (response.error) {
      throw new Error(response.error);
    }

    // Extract and validate JSON from the response
    return localExtractAndValidateJson(response.content);
  }

  /**
   * Complete a general prompt
   */
  async complete(
    prompt: string,
    options?: Partial<LLMOptions>,
  ): Promise<LLMResponse> {
    if (this.options.provider === 'parallel') {
      const parallelOptions: ParallelLLMOptions & Partial<LLMOptions> = {
        providers: this.parseParallelProviders(),
        aggregationStrategy: this.options.aggregation || 'first',
        ...(this.options.timeout && { timeout: this.options.timeout }),
        ...options,
      };

      // Add format option for Ollama if not already specified
      if (
        this.parseParallelProviders().includes('ollama') && !options?.format
      ) {
        parallelOptions.format = 'json';
      }

      const result = await this.parallelExecutor.executeParallel(
        prompt,
        parallelOptions,
      );
      return result.primary;
    }

    const providerOptions: Partial<LLMOptions> = {
      provider: this.mapProvider(),
      model: this.mapModel(),
      ...(this.options.timeout && { timeout: this.options.timeout }),
      ...options,
    };

    // Add format option for Ollama if not already specified
    if (this.mapProvider() === 'ollama' && !options?.format) {
      providerOptions.format = 'json';
    }

    return await this.manager.complete(prompt, providerOptions);
  }

  /**
   * Compare responses from multiple providers
   */
  async compareProviders(prompt: string): Promise<{
    responses: LLMResponse[];
    comparison: unknown;
  }> {
    const providers = this.parseParallelProviders();
    return await this.parallelExecutor.compareProviders(prompt, providers);
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    await this.manager.shutdown();
  }

  /**
   * Build LLM manager configuration from CLI options
   */
  private buildManagerConfig(options: CLIOptions): Partial<LLMManagerConfig> {
    const config: Partial<LLMManagerConfig> = {
      ...(options.verbose && { verbose: options.verbose }),
      fallbackEnabled: true,
    };

    // Configure providers based on options
    config.providers = {
      claude: {
        enabled: options.provider !== 'ollama',
        priority: 1,
        models: ['sonnet', 'opus'],
        defaultModel: options.model || 'sonnet',
        ...(options.timeout && { timeout: options.timeout }),
        maxRetries: 3,
      },
      ollama: {
        enabled: options.provider === 'ollama' ||
          options.provider === 'parallel',
        priority: 2,
        models: [],
        defaultModel: options.ollamaModel || 'qwen2.5-coder:14b-instruct',
        baseUrl: options.ollamaUrl || 'http://localhost:11434',
        ...(options.timeout && { timeout: options.timeout }),
        maxRetries: 2,
      },
      openai: {
        enabled: false,
        priority: 3,
        models: [],
        defaultModel: 'gpt-4',
        ...(options.timeout && { timeout: options.timeout }),
        maxRetries: 3,
      },
    };

    // Set default provider
    if (options.provider === 'ollama') {
      config.defaultProvider = 'ollama';
    } else if (options.provider !== 'parallel') {
      config.defaultProvider = 'claude';
    }

    return config;
  }

  /**
   * Map CLI provider option to LLM provider
   */
  private mapProvider(): 'claude' | 'ollama' {
    if (this.options.provider === 'ollama') {
      return 'ollama';
    }
    return 'claude';
  }

  /**
   * Map CLI model option to appropriate model name
   */
  private mapModel(): string {
    if (this.options.provider === 'ollama') {
      return this.options.ollamaModel || 'qwen2.5-coder:14b-instruct';
    }
    return this.options.model || 'sonnet';
  }

  /**
   * Parse parallel providers from CLI options
   */
  private parseParallelProviders(): Array<'claude' | 'ollama'> {
    if (
      this.options.parallelProviders &&
      this.options.parallelProviders.length > 0
    ) {
      return this.options.parallelProviders
        .filter((p) => p === 'claude' || p === 'ollama') as Array<
          'claude' | 'ollama'
        >;
    }
    // Default to all available providers
    return ['claude', 'ollama'];
  }
}

/**
 * Local helper function to extract and validate JSON from LLM response
 */
function localExtractAndValidateJson(text: string): unknown {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
    text.match(/```\n?([\s\S]*?)\n?```/) ||
    text.match(/({[\s\S]*})/);

  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      // Basic validation - ensure it's an object
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (e) {
      console.warn('[LLMService] Failed to parse JSON from code block:', e);
    }
  }

  // Try direct JSON parse as last resort
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch {
    // Return the raw text if all parsing attempts fail
    console.warn(
      '[LLMService] Could not parse JSON from response, returning raw text',
    );
  }

  return text;
}
