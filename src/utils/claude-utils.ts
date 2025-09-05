import { join, resolve } from '../../deps.ts';
import {
  ensureDirectoryExists,
  filterDirectoryByExtension,
  pathExists,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from './file-operations.ts';
import {
  type CachedResponse,
  type CacheOptions,
  type ClaudeApiResponse,
  type UsageInfo,
} from '../types/index.ts';

/**
 * Cache for Claude responses to avoid redundant API calls
 */
export class ResponseCache {
  private cacheDir: string;
  private ttl: number; // Time to live in milliseconds

  constructor(cacheDir = '.claude-cache', ttlMinutes = 60) {
    this.cacheDir = resolve(cacheDir);
    this.ttl = ttlMinutes * 60 * 1000;

    // Ensure cache directory exists
    if (!pathExists(this.cacheDir)) {
      ensureDirectoryExists(this.cacheDir);
    }
  }

  /**
   * Generate a cache key from prompt
   */
  private async getCacheKey(
    prompt: string,
    options?: CacheOptions,
  ): Promise<string> {
    const content = JSON.stringify({ prompt, options });
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get cached response if available and not expired
   */
  async get<T = unknown>(
    prompt: string,
    options?: CacheOptions,
  ): Promise<T | null> {
    const key = await this.getCacheKey(prompt, options);
    const cachePath = join(this.cacheDir, `${key}.json`);

    if (!pathExists(cachePath)) {
      return null;
    }

    try {
      const cached: CachedResponse = JSON.parse(readFileSync(cachePath));
      const age = Date.now() - cached.timestamp;

      if (age > this.ttl) {
        // Cache expired
        try {
          unlinkSync(cachePath);
        } catch (unlinkError) {
          console.warn(
            '[Cache] Failed to remove expired cache file:',
            unlinkError,
          );
        }
        return null;
      }

      return cached.response as T;
    } catch (_e) {
      console.warn('[Cache] Failed to read cache file:', _e);
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(
    prompt: string,
    response: unknown,
    options?: CacheOptions,
  ): Promise<void> {
    const key = await this.getCacheKey(prompt, options);
    const cachePath = join(this.cacheDir, `${key}.json`);

    const cacheData: CachedResponse = {
      timestamp: Date.now(),
      response,
      metadata: options,
    };

    try {
      writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.error('[Cache] Failed to write cache file:', error);
      // Don't throw - caching is not critical to operation
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const jsonFiles = filterDirectoryByExtension(this.cacheDir, '.json');
    for (const file of jsonFiles) {
      unlinkSync(join(this.cacheDir, file));
    }
  }
}

/**
 * Split large code into manageable chunks for Claude
 */
export function chunkCode(
  code: string,
  maxChunkSize = 10000,
  overlap = 200,
): string[] {
  if (code.length <= maxChunkSize) {
    return [code];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < code.length) {
    let end = start + maxChunkSize;

    // Try to break at a natural boundary (newline)
    if (end < code.length) {
      const lastNewline = code.lastIndexOf('\n', end);
      if (lastNewline > start + maxChunkSize / 2) {
        end = lastNewline;
      }
    }

    chunks.push(code.substring(start, Math.min(end, code.length)));

    // Move start with overlap to maintain context
    start = end - overlap;
  }

  return chunks;
}

/**
 * Progress indicator for long-running analyses
 */
export class ProgressIndicator {
  private total: number;
  private startTime: number;
  private lastUpdate = 0;

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  async update(current: number, message?: string): Promise<void> {
    const now = Date.now();

    // Update at most once per second
    if (now - this.lastUpdate < 1000) {
      return;
    }

    this.lastUpdate = now;
    const percentage = Math.round((current / this.total) * 100);
    const elapsed = Math.round((now - this.startTime) / 1000);
    const rate = current / elapsed || 0;
    const remaining = rate > 0 ? Math.round((this.total - current) / rate) : 0;

    const progressBar = this.createProgressBar(percentage);
    const status = message || `Processing...`;

    // Use Deno's stdout.write instead of Node.js process.stdout.write
    const progressText =
      `\r${progressBar} ${percentage}% | ${current}/${this.total} | ${status} | ETA: ${remaining}s  `;
    await Deno.stdout.write(new TextEncoder().encode(progressText));
  }

  private createProgressBar(percentage: number): string {
    const width = 30;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  complete(message = 'Complete!'): void {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    console.log(`\n✅ ${message} (${elapsed}s)`);
  }
}

/**
 * Validate and clean JSON responses from Claude
 */
export function cleanJsonResponse(text: string): unknown {
  // Remove markdown code blocks
  text = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '');

  // Remove any text before the first { or [
  const jsonStart = Math.min(
    text.indexOf('{') !== -1 ? text.indexOf('{') : Infinity,
    text.indexOf('[') !== -1 ? text.indexOf('[') : Infinity,
  );

  if (jsonStart === Infinity) {
    throw new Error('No JSON found in response');
  }

  text = text.substring(jsonStart);

  // Remove any text after the last } or ]
  const jsonEnd = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));

  if (jsonEnd !== -1) {
    text = text.substring(0, jsonEnd + 1);
  }

  try {
    return JSON.parse(text);
  } catch (_e) {
    // Try to fix common issues
    text = text
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/,\s*]/g, ']')
      .replace(/'/g, '"') // Replace single quotes with double
      .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys

    return JSON.parse(text);
  }
}

/**
 * Estimate token count for a string (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Format token usage and cost information
 */
export function formatUsageInfo(usage: UsageInfo): string {
  const parts = [];

  if (usage.inputTokens) {
    parts.push(`Input: ${usage.inputTokens.toLocaleString()} tokens`);
  }

  if (usage.outputTokens) {
    parts.push(`Output: ${usage.outputTokens.toLocaleString()} tokens`);
  }

  if (usage.cost) {
    // Cost is already a string from UsageInfo type
    const costStr = usage.cost;
    // Add $ if not present
    const formattedCost = costStr.startsWith('$') ? costStr : `$${costStr}`;
    parts.push(`Cost: ${formattedCost}`);
  }

  return parts.join(' | ');
}

/**
 * Extract token usage and cost from Claude CLI JSON output
 */
export function extractUsageInfo(jsonResponse: unknown): UsageInfo {
  if (!jsonResponse || typeof jsonResponse !== 'object') {
    return {};
  }

  const response = jsonResponse as ClaudeApiResponse;
  const usage = response.usage || {};
  const cost = response.total_cost_usd;

  const result: UsageInfo = {};

  if (usage.input_tokens !== undefined) {
    result.inputTokens = usage.input_tokens;
  }

  if (usage.output_tokens !== undefined) {
    result.outputTokens = usage.output_tokens;
  }

  if (cost) {
    result.cost = String(cost);
  }

  return result;
}

/**
 * Extract and validate JSON from LLM response text
 */
export function extractAndValidateJson(text: string): unknown {
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
      console.warn('[JSON Extract] Failed to parse JSON from code block:', e);
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
      '[JSON Extract] Could not parse JSON from response, returning raw text',
    );
  }

  return text;
}
