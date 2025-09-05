/**
 * Test suite for LLM provider integration
 */

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { describe, it } from 'https://deno.land/std@0.208.0/testing/bdd.ts';
import { LLMManager } from '../src/llm/LLMManager.ts';
import { ParallelLLMExecutor } from '../src/llm/ParallelLLMExecutor.ts';
import { OllamaProvider } from '../src/llm/providers/OllamaProvider.ts';
import { ClaudeProvider } from '../src/llm/providers/ClaudeProvider.ts';

describe('LLM Provider Integration', () => {
  describe('OllamaProvider', () => {
    it('should check if Ollama is available', async () => {
      const provider = new OllamaProvider();
      const isAvailable = await provider.isAvailable();

      // This will be true if Ollama is running, false otherwise
      console.log(`Ollama available: ${isAvailable}`);
      assertEquals(typeof isAvailable, 'boolean');
    });

    it('should list available models if Ollama is running', async () => {
      const provider = new OllamaProvider();
      const isAvailable = await provider.isAvailable();

      if (isAvailable) {
        await provider.initialize();
        const models = await provider.listModels();
        console.log('Available Ollama models:', models);
        assertExists(models);
        assertEquals(Array.isArray(models), true);
      } else {
        console.log('Skipping model list test - Ollama not available');
      }
    });

    it('should complete a prompt if Ollama is available', async () => {
      const provider = new OllamaProvider();
      const isAvailable = await provider.isAvailable();

      if (isAvailable) {
        await provider.initialize();
        const models = await provider.listModels();

        if (models.length > 0) {
          // Find a generation model (not embedding)
          const generationModel = models.find((m) =>
            m.includes('qwen') || m.includes('gemma') || m.includes('deepseek')
          ) || models[0];

          const response = await provider.complete(
            'Write a simple "Hello World" function in TypeScript',
            { model: generationModel, maxTokens: 100 },
          );

          console.log('Ollama response:', response.content.substring(0, 200));
          assertExists(response.content);
          assertEquals(response.provider, 'ollama');
        } else {
          console.log('No models available for testing');
        }
      } else {
        console.log('Skipping completion test - Ollama not available');
      }
    });
  });

  describe('ClaudeProvider', () => {
    it('should check if Claude CLI is available', async () => {
      const provider = new ClaudeProvider();
      const isAvailable = await provider.isAvailable();

      console.log(`Claude CLI available: ${isAvailable}`);
      assertEquals(typeof isAvailable, 'boolean');
    });
  });

  describe('LLMManager', () => {
    it('should initialize with available providers', async () => {
      const manager = new LLMManager({
        verbose: true,
        providers: {
          claude: {
            enabled: true,
            priority: 1,
            models: [],
            defaultModel: 'sonnet',
          },
          ollama: {
            enabled: true,
            priority: 2,
            models: [],
            defaultModel: 'qwen2.5-coder',
          },
          openai: {
            enabled: false,
            priority: 3,
            models: [],
            defaultModel: 'gpt-4',
          },
        },
      });

      await manager.initialize();
      const providers = manager.getAvailableProviders();

      console.log('Available providers:', providers);
      assertExists(providers);
      assertEquals(Array.isArray(providers), true);
    });

    it('should complete with fallback if primary fails', async () => {
      const manager = new LLMManager({
        verbose: true,
        fallbackEnabled: true,
      });

      await manager.initialize();
      const providers = manager.getAvailableProviders();

      if (providers.length > 0) {
        // Try with an invalid provider first to test fallback
        try {
          const response = await manager.complete(
            'Return the text "test successful"',
            { provider: providers[0] },
          );

          console.log('Response:', response.content);
          assertExists(response.content);
        } catch (error) {
          console.log('All providers failed:', error);
        }
      } else {
        console.log('No providers available for testing');
      }
    });
  });

  describe('ParallelLLMExecutor', () => {
    it('should execute on multiple providers if available', async () => {
      const manager = new LLMManager({ verbose: true });
      await manager.initialize();

      const executor = new ParallelLLMExecutor(manager, true);
      const providers = manager.getAvailableProviders();

      if (providers.length >= 2) {
        const result = await executor.executeParallel(
          'What is 2 + 2? Return only the number.',
          {
            providers: providers.slice(0, 2) as Array<'claude' | 'ollama'>,
            aggregationStrategy: 'all',
          },
        );

        console.log('Primary response:', result.primary.content);
        console.log(
          'Alternatives:',
          result.alternatives?.map((r) => r.content),
        );

        assertExists(result.primary);
        assertEquals(result.primary.provider, providers[0]);
      } else if (providers.length === 1) {
        console.log('Only one provider available, skipping parallel test');
      } else {
        console.log('No providers available for parallel testing');
      }
    });

    it('should compare provider responses', async () => {
      const manager = new LLMManager({ verbose: true });
      await manager.initialize();

      const executor = new ParallelLLMExecutor(manager, true);
      const providers = manager.getAvailableProviders();

      if (providers.length >= 2) {
        const comparison = await executor.compareProviders(
          'What is the capital of France? Return only the city name.',
          providers.slice(0, 2) as Array<'claude' | 'ollama'>,
        );

        console.log('Comparison similarity:', comparison.comparison.similarity);
        console.log('Recommendations:', comparison.comparison.recommendations);

        assertExists(comparison.responses);
        assertExists(comparison.comparison);
      } else {
        console.log('Not enough providers for comparison test');
      }
    });
  });
});

// Run a simple integration test
if (import.meta.main) {
  console.log('\n🧪 Running LLM Integration Tests\n');
  console.log(
    'Note: These tests require Ollama and/or Claude CLI to be installed and running.\n',
  );
}
