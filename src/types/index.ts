/**
 * Central export for all type definitions
 */

export * from './analysis.ts';
export * from './claude.ts';

// File-related types
export interface CodeFile {
  path: string;
  content: string;
}

export interface CodeChunk {
  category: string;
  files: CodeFile[];
  context: string;
}

export interface FileCategories {
  entry: string | null;
  components: string[];
  state: string[];
  services: string[];
  utils: string[];
  models: string[];
  tests: string[];
  other: string[];
}

// Configuration types
export interface CLIOptions {
  comprehensive?: boolean;
  model?: 'sonnet' | 'opus';
  verbose?: boolean;
  noCache?: boolean;
  timeout?: number;
  parallel?: boolean;
  workers?: number;
}

// Security constraints
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB per file
  MAX_TOTAL_SIZE: 100 * 1024 * 1024, // 100MB total
  MAX_FILES_PER_CHUNK: 10,
} as const;

// Timing constraints
export const TIMEOUTS = {
  CLAUDE_CLI: 60000, // 60 seconds per Claude API call
  FILE_READ: 5000, // 5 seconds
  CACHE_TTL: 120 * 60 * 1000, // 2 hours
  ANALYSIS_DEFAULT: 600000, // 10 minutes default for full analysis
} as const;

// Error types
export class AnalysisError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export class FileSizeError extends Error {
  constructor(fileName: string, size: number, maxSize: number) {
    super(`File ${fileName} exceeds maximum size: ${size} > ${maxSize}`);
    this.name = 'FileSizeError';
  }
}

export class TimeoutError extends Error {
  constructor(operation: string, timeout: number) {
    super(`Operation ${operation} timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
