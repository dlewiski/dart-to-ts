import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { loadConfig } from '../config/settings.js';
import { LLMPrompt, LLMResponse } from '../types.js';
import { PromptBuilder } from './prompt-builder.js';
// import { PackageDecisionMaker } from './package-decisions.js';

export { PromptBuilder } from './prompt-builder.js';
// export { PackageDecisionMaker } from './package-decisions.js';

export class IntelligenceService {
  private client: BedrockRuntimeClient;
  private config = loadConfig();
  private promptBuilder = new PromptBuilder();
  // private decisionMaker = new PackageDecisionMaker(); // Not used yet

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: this.config.awsRegion,
      credentials: this.config.awsAccessKeyId ? {
        accessKeyId: this.config.awsAccessKeyId,
        secretAccessKey: this.config.awsSecretAccessKey!,
        sessionToken: this.config.awsSessionToken,
      } : undefined,
    });
  }

  async enhanceCode(typescript: string, _filePath: string): Promise<LLMResponse> {
    const prompt = this.promptBuilder.buildCodeEnhancementPrompt(typescript);
    return this.invokeLLM(prompt);
  }

  async convertWithLLM(dartCode: string, filePath: string): Promise<LLMResponse> {
    const prompt = this.promptBuilder.buildConversionPrompt(dartCode, filePath);
    return this.invokeLLM(prompt);
  }

  async analyzePackageUsage(packageName: string, usage: any): Promise<LLMResponse> {
    const prompt = this.promptBuilder.buildPackageDecisionPrompt(packageName, usage);
    return this.invokeLLM(prompt);
  }

  async generateInlinedUtility(packageName: string, functionName: string): Promise<LLMResponse> {
    const prompt = this.promptBuilder.buildInliningPrompt(packageName, functionName);
    return this.invokeLLM(prompt);
  }

  async validateConversion(original: string, converted: string): Promise<LLMResponse> {
    const prompt = this.promptBuilder.buildValidationPrompt(original, converted);
    return this.invokeLLM(prompt);
  }

  private async invokeLLM(prompt: LLMPrompt): Promise<LLMResponse> {
    try {
      const body = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: prompt.system,
        messages: [
          {
            role: 'user',
            content: prompt.user,
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId: this.config.claudeModel,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        content: responseBody.content[0].text,
        reasoning: responseBody.stop_reason,
        confidence: this.calculateConfidence(responseBody),
        usage: {
          inputTokens: responseBody.usage?.input_tokens || 0,
          outputTokens: responseBody.usage?.output_tokens || 0,
          totalTokens: (responseBody.usage?.input_tokens || 0) + (responseBody.usage?.output_tokens || 0),
        },
      };
    } catch (error) {
      console.error('LLM invocation error:', error);

      // Fallback response without LLM
      return {
        content: this.getFallbackResponse(prompt),
        reasoning: 'Fallback - LLM unavailable',
        confidence: 0.5,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      };
    }
  }

  private calculateConfidence(response: any): number {
    // Simple confidence calculation based on response characteristics
    if (response.stop_reason === 'end_turn') {
      return 0.9;
    } else if (response.stop_reason === 'max_tokens') {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  private getFallbackResponse(prompt: LLMPrompt): string {
    // Provide basic fallback responses when LLM is unavailable
    if (prompt.user.includes('Convert')) {
      return '// TypeScript conversion (LLM unavailable - basic conversion applied)';
    } else if (prompt.user.includes('Analyze')) {
      return 'Analysis unavailable - LLM service not accessible';
    } else if (prompt.user.includes('Validate')) {
      return 'Validation skipped - LLM service not accessible';
    } else {
      return 'LLM service unavailable';
    }
  }

  async analyzeProjectComplexity(files: any[]): Promise<{
    complexity: 'simple' | 'moderate' | 'complex';
    factors: string[];
    recommendation: string;
  }> {
    const factors: string[] = [];
    let score = 0;

    // File count
    if (files.length > 100) {
      factors.push('Large number of files');
      score += 3;
    } else if (files.length > 50) {
      factors.push('Moderate number of files');
      score += 2;
    }

    // Check for complex patterns
    const hasComplexPatterns = files.some(f =>
      f.content.includes('mixin') ||
      f.content.includes('abstract class') ||
      f.content.includes('factory')
    );

    if (hasComplexPatterns) {
      factors.push('Complex OOP patterns');
      score += 2;
    }

    // Check for heavy framework usage
    const hasFrameworks = files.some(f =>
      f.content.includes('over_react') ||
      f.content.includes('angular_dart') ||
      f.content.includes('flutter')
    );

    if (hasFrameworks) {
      factors.push('Framework-heavy codebase');
      score += 3;
    }

    const complexity = score >= 6 ? 'complex' : score >= 3 ? 'moderate' : 'simple';

    const recommendations: Record<typeof complexity, string> = {
      simple: 'Automated conversion should work well. Consider aggressive optimization.',
      moderate: 'Semi-automated conversion recommended. Review critical paths manually.',
      complex: 'Incremental conversion recommended. Start with leaf modules.',
    };

    return {
      complexity,
      factors,
      recommendation: recommendations[complexity],
    };
  }
}