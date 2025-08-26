import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Cache for Claude responses to avoid redundant API calls
 */
export class ResponseCache {
  private cacheDir: string;
  private ttl: number; // Time to live in milliseconds

  constructor(cacheDir = '.claude-cache', ttlMinutes = 60) {
    this.cacheDir = path.resolve(cacheDir);
    this.ttl = ttlMinutes * 60 * 1000;
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a cache key from prompt
   */
  private getCacheKey(prompt: string, options?: any): string {
    const content = JSON.stringify({ prompt, options });
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Get cached response if available and not expired
   */
  get(prompt: string, options?: any): any | null {
    const key = this.getCacheKey(prompt, options);
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      const age = Date.now() - cached.timestamp;
      
      if (age > this.ttl) {
        // Cache expired
        fs.unlinkSync(cachePath);
        return null;
      }
      
      return cached.response;
    } catch (e) {
      return null;
    }
  }

  /**
   * Store response in cache
   */
  set(prompt: string, response: any, options?: any): void {
    const key = this.getCacheKey(prompt, options);
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    
    const cacheData = {
      timestamp: Date.now(),
      prompt,
      options,
      response
    };
    
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const files = fs.readdirSync(this.cacheDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    }
  }
}

/**
 * Split large code into manageable chunks for Claude
 */
export function chunkCode(
  code: string,
  maxChunkSize = 10000,
  overlap = 200
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
  private current = 0;
  private total: number;
  private startTime: number;
  private lastUpdate = 0;

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  update(current: number, message?: string): void {
    this.current = current;
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
    
    process.stdout.write(
      `\r${progressBar} ${percentage}% | ${current}/${this.total} | ${status} | ETA: ${remaining}s  `
    );
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
export function cleanJsonResponse(text: string): any {
  // Remove markdown code blocks
  text = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  
  // Remove any text before the first { or [
  const jsonStart = Math.min(
    text.indexOf('{') !== -1 ? text.indexOf('{') : Infinity,
    text.indexOf('[') !== -1 ? text.indexOf('[') : Infinity
  );
  
  if (jsonStart === Infinity) {
    throw new Error('No JSON found in response');
  }
  
  text = text.substring(jsonStart);
  
  // Remove any text after the last } or ]
  const jsonEnd = Math.max(
    text.lastIndexOf('}'),
    text.lastIndexOf(']')
  );
  
  if (jsonEnd !== -1) {
    text = text.substring(0, jsonEnd + 1);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
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
export function formatUsageInfo(usage: {
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}): string {
  const parts = [];
  
  if (usage.inputTokens) {
    parts.push(`Input: ${usage.inputTokens.toLocaleString()} tokens`);
  }
  
  if (usage.outputTokens) {
    parts.push(`Output: ${usage.outputTokens.toLocaleString()} tokens`);
  }
  
  if (usage.cost) {
    parts.push(`Cost: $${usage.cost.toFixed(4)}`);
  }
  
  return parts.join(' | ');
}

/**
 * Extract token usage and cost from Claude CLI JSON output
 */
export function extractUsageInfo(jsonResponse: any): {
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
} {
  if (!jsonResponse || typeof jsonResponse !== 'object') {
    return {};
  }
  
  const usage = jsonResponse.usage || {};
  const cost = jsonResponse.total_cost_usd;
  
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cost
  };
}