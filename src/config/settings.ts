import { z } from 'zod';
import * as dotenv from 'dotenv';
import { ConversionConfig } from '../types.js';

dotenv.config();

export const ConfigSchema = z.object({
  awsRegion: z.string().default('us-east-1'),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  awsSessionToken: z.string().optional(),
  claudeModel: z.string().default('anthropic.claude-3-sonnet-20240229-v1:0'),
  maxConcurrency: z.number().default(5),
  maxTokens: z.number().default(4096),
  temperature: z.number().default(0.3),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse({
    awsRegion: process.env.AWS_REGION,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsSessionToken: process.env.AWS_SESSION_TOKEN,
    claudeModel: process.env.CLAUDE_MODEL,
    maxConcurrency: process.env.MAX_CONCURRENCY ? parseInt(process.env.MAX_CONCURRENCY) : undefined,
    maxTokens: process.env.MAX_TOKENS ? parseInt(process.env.MAX_TOKENS) : undefined,
    temperature: process.env.TEMPERATURE ? parseFloat(process.env.TEMPERATURE) : undefined,
    logLevel: process.env.LOG_LEVEL,
  });
}

export const defaultConversionConfig: Partial<ConversionConfig> = {
  outputPath: './output',
  extractPath: './extracted',
  decisionsPath: './decisions',
  aggressive: false,
  preserveComments: true,
  modernize: true,
  useLLM: true,
  maxConcurrency: 5,
};

export const fileExtensions = {
  dart: ['.dart'],
  typescript: ['.ts', '.tsx'],
  javascript: ['.js', '.jsx'],
  json: ['.json'],
  yaml: ['.yaml', '.yml'],
};

export const ignoredPaths = [
  '**/node_modules/**',
  '**/.dart_tool/**',
  '**/build/**',
  '**/dist/**',
  '**/.git/**',
  '**/coverage/**',
  '**/tmp/**',
  '**/*.g.dart', // Generated files
  '**/*.freezed.dart',
  '**/*.chopper.dart',
];

export const preservedCommentPatterns = [
  /\/\/\s*@/, // Annotations
  /\/\*\*/, // JSDoc style
  /\/\/\s*#/, // Directives
];

export const importPriority = {
  react: 1,
  'react-dom': 2,
  '@types': 10,
  'node:': 20,
  './': 100,
  '../': 101,
};

export function getImportPriority(importPath: string): number {
  for (const [pattern, priority] of Object.entries(importPriority)) {
    if (importPath.startsWith(pattern)) {
      return priority;
    }
  }
  return 50; // Default priority for external packages
}
