import { basename, dirname, ensureDir, exists, resolve } from '../../deps.ts';
import { FILE_SIZE_LIMITS, FileSizeError } from '../types/index.ts';

/**
 * Centralized file operations utility
 * Consolidates file handling logic from across the application
 */

/**
 * Validate that a path is safe and within the project directory
 */
export function validatePath(
  projectPath: string,
  relativePath: string,
): string {
  const fullPath = resolve(projectPath, relativePath);
  const projectRealPath = resolve(projectPath);

  // Ensure the resolved path is within the project directory
  if (!fullPath.startsWith(projectRealPath)) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  return fullPath;
}

/**
 * Validate file size is within acceptable limits
 */
export async function validateFileSize(filePath: string): Promise<void> {
  const fileInfo = await Deno.stat(filePath);
  if (fileInfo.size > FILE_SIZE_LIMITS.MAX_FILE_SIZE) {
    throw new FileSizeError(
      basename(filePath),
      fileInfo.size,
      FILE_SIZE_LIMITS.MAX_FILE_SIZE,
    );
  }
}

/**
 * Safely read file with path validation and size checks
 */
export async function safeReadFile(
  projectPath: string,
  relativePath: string,
): Promise<string> {
  const fullPath = validatePath(projectPath, relativePath);
  await validateFileSize(fullPath);
  const decoder = new TextDecoder('utf-8');
  const data = await Deno.readFile(fullPath);
  return decoder.decode(data);
}

/**
 * Check if file exists (async)
 * Alias for exists from std/fs for consistency
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return await exists(filePath);
}

/**
 * Ensure directory exists, creating if necessary
 * Wrapper for ensureDir from std/fs
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await ensureDir(dirPath);
}

/**
 * Safely write file with directory creation
 */
export async function safeWriteFile(
  filePath: string,
  content: string,
): Promise<void> {
  const dir = dirname(filePath);
  await ensureDirectoryExists(dir);
  const encoder = new TextEncoder();
  await Deno.writeFile(filePath, encoder.encode(content));
}

/**
 * Safely write JSON file with proper formatting
 */
export async function safeWriteJsonFile(
  filePath: string,
  data: unknown,
): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await safeWriteFile(filePath, content);
}

/**
 * Check if path exists synchronously
 * @deprecated Use pathExistsAsync for better performance
 */
export function pathExists(filePath: string): boolean {
  try {
    Deno.statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if path exists asynchronously (recommended)
 */
export async function pathExistsAsync(filePath: string): Promise<boolean> {
  try {
    await Deno.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read directory contents synchronously
 * Returns array of entry names
 */
export function readDirectory(dirPath: string): string[] {
  const entryNames: string[] = [];
  for (const dirEntry of Deno.readDirSync(dirPath)) {
    entryNames.push(dirEntry.name);
  }
  return entryNames;
}

/**
 * Get file/directory stats synchronously
 * Wrapper for Deno.statSync with better error context
 */
export function getStats(filePath: string): Deno.FileInfo {
  try {
    return Deno.statSync(filePath);
  } catch (error) {
    throw new Error(`Failed to get stats for ${filePath}: ${error}`);
  }
}

/**
 * Read file synchronously with UTF-8 encoding
 */
export function readFileSync(filePath: string): string {
  try {
    const textDecoder = new TextDecoder('utf-8');
    const fileData = Deno.readFileSync(filePath);
    return textDecoder.decode(fileData);
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

/**
 * Read JSON file synchronously
 */
export function readJsonFileSync(filePath: string): unknown {
  const content = readFileSync(filePath);
  return JSON.parse(content);
}

/**
 * Write file synchronously with UTF-8 encoding
 */
export function writeFileSync(filePath: string, content: string): void {
  try {
    const textEncoder = new TextEncoder();
    Deno.writeFileSync(filePath, textEncoder.encode(content));
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Filter directory for specific file types by extension
 */
export function filterDirectoryByExtension(
  dirPath: string,
  fileExtension: string,
): string[] {
  const allEntries = readDirectory(dirPath);
  return allEntries.filter((fileName) => fileName.endsWith(fileExtension));
}

/**
 * Delete file synchronously
 */
export function unlinkSync(filePath: string): void {
  Deno.removeSync(filePath);
}
