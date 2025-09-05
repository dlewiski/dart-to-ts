/**
 * Result Aggregator for combining and analyzing multiple LLM responses
 */

import { type AggregatedLLMResponse, type LLMResponse } from '../types/llm.ts';

export class ResultAggregator {
  /**
   * Aggregate multiple LLM responses based on strategy
   */
  aggregate(
    responses: LLMResponse[],
    strategy: 'first' | 'consensus' | 'best' | 'all',
  ): AggregatedLLMResponse {
    if (responses.length === 0) {
      throw new Error('No responses to aggregate');
    }

    switch (strategy) {
      case 'first':
        return this.aggregateFirst(responses);

      case 'consensus':
        return this.aggregateConsensus(responses);

      case 'best':
        return this.aggregateBest(responses);

      case 'all':
        return this.aggregateAll(responses);

      default:
        throw new Error(`Unknown aggregation strategy: ${strategy}`);
    }
  }

  /**
   * Return the first successful response
   */
  private aggregateFirst(responses: LLMResponse[]): AggregatedLLMResponse {
    if (responses.length === 0) {
      throw new Error('Cannot aggregate empty response array');
    }
    return {
      primary: responses[0]!,
      alternatives: responses.slice(1),
      confidence: 1.0 / responses.length,
      latency: Math.max(...responses.map((r) => r.latency || 0)),
    };
  }

  /**
   * Find consensus among responses
   */
  private aggregateConsensus(responses: LLMResponse[]): AggregatedLLMResponse {
    if (responses.length === 1) {
      return {
        primary: responses[0]!,
        confidence: 1.0,
        latency: responses[0]!.latency || 0,
      };
    }

    // Calculate similarity scores between responses
    const similarityMatrix = this.calculateSimilarityMatrix(responses);

    // Find the response with highest average similarity to others
    let bestIndex = 0;
    let bestScore = 0;

    for (let i = 0; i < responses.length; i++) {
      const row = similarityMatrix[i];
      if (!row) continue;
      const avgScore = row.reduce((a, b) => a + b, 0) / (responses.length - 1);
      if (avgScore && avgScore > bestScore) {
        bestScore = avgScore;
        bestIndex = i;
      }
    }

    // Check if there's strong consensus
    const consensusThreshold = 0.7;
    const hasConsensus = bestScore >= consensusThreshold;

    // If there's consensus, try to merge similar content
    let consensusContent: string | undefined;
    if (hasConsensus) {
      consensusContent = this.mergeConsensusContent(
        responses,
        similarityMatrix,
        bestIndex,
      );
    }

    return {
      primary: responses[bestIndex]!,
      alternatives: responses.filter((_, i) => i !== bestIndex),
      consensus: consensusContent ?? undefined,
      confidence: bestScore,
      latency: Math.max(...responses.map((r) => r.latency ?? 0)),
    };
  }

  /**
   * Select the best response based on quality metrics
   */
  private aggregateBest(responses: LLMResponse[]): AggregatedLLMResponse {
    // Score each response based on various metrics
    const scores = responses.map((response) => this.scoreResponse(response));

    // Find the best scoring response
    let bestIndex = 0;
    let bestScore = scores[0] ?? 0;

    for (let i = 1; i < scores.length; i++) {
      const currentScore = scores[i] ?? 0;
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestIndex = i;
      }
    }

    return {
      primary: responses[bestIndex]!,
      alternatives: responses.filter((_, i) => i !== bestIndex),
      confidence: bestScore,
      latency: Math.max(...responses.map((r) => r.latency ?? 0)),
    };
  }

  /**
   * Return all responses without aggregation
   */
  private aggregateAll(responses: LLMResponse[]): AggregatedLLMResponse {
    return {
      primary: responses[0]!,
      alternatives: responses.slice(1),
      latency: Math.max(...responses.map((r) => r.latency ?? 0)),
    };
  }

  /**
   * Calculate similarity matrix between responses
   */
  private calculateSimilarityMatrix(responses: LLMResponse[]): number[][] {
    const matrix: number[][] = [];

    for (let i = 0; i < responses.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < responses.length; j++) {
        if (i === j) {
          matrix[i]![j] = 1.0;
        } else {
          matrix[i]![j] = this.calculateSimilarity(
            responses[i]!.content,
            responses[j]!.content,
          );
        }
      }
    }

    return matrix;
  }

  /**
   * Calculate similarity between two text strings
   * Uses Jaccard similarity on word tokens
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(this.tokenize(text1));
    const tokens2 = new Set(this.tokenize(text2));

    if (tokens1.size === 0 && tokens2.size === 0) {
      return 1.0;
    }

    if (tokens1.size === 0 || tokens2.size === 0) {
      return 0.0;
    }

    // Calculate Jaccard similarity
    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Tokenize text for similarity comparison
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2);
  }

  /**
   * Merge content from similar responses
   */
  private mergeConsensusContent(
    responses: LLMResponse[],
    similarityMatrix: number[][],
    primaryIndex: number,
  ): string {
    const threshold = 0.7;
    const similarResponses = responses.filter((_, i) =>
      i === primaryIndex ||
      (similarityMatrix[primaryIndex]?.[i] ?? 0) >= threshold
    );

    if (similarResponses.length === 1) {
      return similarResponses[0]!.content;
    }

    // For now, return the primary content
    // In the future, this could implement more sophisticated merging
    return responses[primaryIndex]!.content;
  }

  /**
   * Score a response based on quality metrics
   */
  private scoreResponse(response: LLMResponse): number {
    let score = 0.5; // Base score

    // Penalize errors
    if (response.error) {
      score -= 0.3;
    }

    // Reward faster responses (normalized)
    if (response.latency) {
      const maxAcceptableLatency = 60000; // 60 seconds
      const latencyScore = Math.max(
        0,
        1 - (response.latency / maxAcceptableLatency),
      );
      score += latencyScore * 0.2;
    }

    // Reward responses with usage data (indicates successful completion)
    if (response.usage) {
      score += 0.1;
    }

    // Check content quality (basic heuristics)
    const contentLength = response.content.length;
    if (contentLength > 0) {
      // Reward reasonable length responses
      if (contentLength > 50 && contentLength < 10000) {
        score += 0.1;
      }

      // Check for JSON validity if it looks like JSON
      if (
        response.content.trim().startsWith('{') ||
        response.content.trim().startsWith('[')
      ) {
        try {
          JSON.parse(response.content);
          score += 0.1; // Valid JSON
        } catch {
          score -= 0.1; // Invalid JSON
        }
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Compare responses and generate analysis
   */
  compareResponses(responses: LLMResponse[]): {
    consensusContent?: string;
    similarity: number;
    differences: string[];
    recommendations: string[];
  } {
    if (responses.length < 2) {
      return {
        similarity: 1.0,
        differences: [],
        recommendations: [
          'Only one response available, no comparison possible',
        ],
      };
    }

    const similarityMatrix = this.calculateSimilarityMatrix(responses);
    const avgSimilarity = this.calculateAverageSimilarity(similarityMatrix);

    const differences: string[] = [];
    const recommendations: string[] = [];

    // Identify major differences
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = similarityMatrix[i]?.[j] ?? 0;
        if (similarity < 0.5) {
          differences.push(
            `Significant difference between ${responses[i]!.provider} and ${
              responses[j]!.provider
            } (similarity: ${(similarity * 100).toFixed(1)}%)`,
          );
        }
      }
    }

    // Generate recommendations
    if (avgSimilarity > 0.8) {
      recommendations.push(
        'High consensus among providers - results are reliable',
      );
    } else if (avgSimilarity > 0.6) {
      recommendations.push(
        'Moderate consensus - consider reviewing differences',
      );
    } else {
      recommendations.push('Low consensus - manual review recommended');
      recommendations.push(
        'Consider re-running with different prompts or parameters',
      );
    }

    // Check for provider-specific issues
    const errorProviders = responses.filter((r) => r.error).map((r) =>
      r.provider
    );
    if (errorProviders.length > 0) {
      recommendations.push(
        `Providers with errors: ${errorProviders.join(', ')}`,
      );
    }

    return {
      similarity: avgSimilarity,
      differences,
      recommendations,
    };
  }

  /**
   * Calculate average similarity across all response pairs
   */
  private calculateAverageSimilarity(matrix: number[][]): number {
    let sum = 0;
    let count = 0;

    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix.length; j++) {
        sum += matrix[i]?.[j] ?? 0;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }
}
