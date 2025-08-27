// deps.ts - All dependencies in one place (Deno best practice)

// Deno Standard Library
export { join, dirname, resolve, basename, extname } from '@std/path';
export { exists, ensureDir, walk, walkSync } from '@std/fs';
export { assertEquals, assertExists, assertRejects } from '@std/assert';
export { describe, it, beforeEach, afterEach } from '@std/testing/bdd';
export * as colors from '@std/fmt/colors';

// CLI Framework - Cliffy
export { Command } from '@cliffy/command';
export { 
  Input, 
  Confirm, 
  Select,
  Checkbox,
  prompt 
} from '@cliffy/prompt';

// Schema Validation
export { z } from 'zod';

// Re-export common types
export type { WalkEntry } from '@std/fs';