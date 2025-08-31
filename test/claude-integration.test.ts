/**
 * Integration tests for Claude CLI
 */
import { assertEquals, describe, it } from '../deps.ts';
import { analyzeCode, executeClaude } from '../src/claude-cli.ts';
import { cleanJsonResponse } from '../src/utils/claude-utils.ts';

const TEST_OPTIONS = { model: 'sonnet' as const, maxRetries: 1 };

describe('Claude CLI Integration Tests', () => {
  it('should execute basic prompt', async () => {
    const result = await executeClaude(
      'What is 15 + 27? Return only the number.',
      TEST_OPTIONS,
    );

    assertEquals(result.error, undefined);
    const answer = parseInt(String(result.result).trim());
    assertEquals(answer, 42);
  });

  it('should analyze Dart code and return JSON', async () => {
    const dartCode =
      'class Dashboard { String title = "test"; void render() {} }';
    const prompt =
      'Return JSON: {"className": "string", "methods": ["array"], "properties": ["array"]}';

    const result = await analyzeCode(dartCode, prompt, undefined, TEST_OPTIONS);

    assertEquals(typeof result, 'object');
    assertEquals((result as { className: string }).className, 'Dashboard');
  });

  it('should clean JSON response correctly', () => {
    const messyJson = 'Here is: ```json\n{"test": "value"}\n```\nDone.';
    const cleaned = cleanJsonResponse(messyJson);

    assertEquals(typeof cleaned, 'object');
    assertEquals((cleaned as { test: string }).test, 'value');
  });
});

// Run tests if this file is executed directly
if (import.meta.main) {
  console.log('🧪 Running Claude CLI Integration Tests...\n');
  // Deno test runner will handle test execution
}
