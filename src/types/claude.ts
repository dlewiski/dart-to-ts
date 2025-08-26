/**
 * Type definitions for Claude CLI integration
 */

export type ClaudeModel = 'sonnet' | 'opus';

export interface ClaudeOptions {
  model?: ClaudeModel;
  outputFormat?: 'text' | 'json';
  maxRetries?: number;
  verbose?: boolean;
  timeout?: number; // in milliseconds
}

export interface ClaudeResponse {
  result: unknown;
  raw?: string;
  error?: string;
}

export interface AnalysisSchema {
  [key: string]: string | number | boolean | AnalysisSchema | AnalysisSchema[];
}

export interface CacheOptions {
  category?: string;
  model?: ClaudeModel;
}

export interface UsageInfo {
  inputTokens?: number;
  outputTokens?: number;
  cost?: string;
}

export interface CachedResponse {
  timestamp: number;
  response: unknown;
  metadata?: {
    model?: ClaudeModel;
    category?: string;
  };
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
}

export interface SchemaDefinition {
  type: 'object' | 'array';
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  required?: string[];
}