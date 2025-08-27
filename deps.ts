// deps.ts - All dependencies in one place (Deno best practice)

// Deno Standard Library
export { basename, dirname, extname, join, resolve } from '@std/path';
export { ensureDir, exists, walk, walkSync } from '@std/fs';
export { assertEquals, assertExists, assertRejects } from '@std/assert';
export { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
export * as colors from '@std/fmt/colors';

// CLI Framework - Cliffy
export { Command } from '@cliffy/command';
export { Checkbox, Confirm, Input, prompt, Select } from '@cliffy/prompt';

// Schema Validation
export { z } from 'zod';

// Re-export common types
export type { WalkEntry } from '@std/fs';
