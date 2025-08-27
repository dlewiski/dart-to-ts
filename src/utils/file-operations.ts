import { 
  resolve, 
  dirname, 
  basename,
  ensureDir,
  exists
} from '../../deps.ts';
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
  relativePath: string
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
      FILE_SIZE_LIMITS.MAX_FILE_SIZE
    );
  }
}

/**
 * Safely read file with path validation and size checks
 */
export async function safeReadFile(
  projectPath: string,
  relativePath: string
): Promise<string> {
  const fullPath = validatePath(projectPath, relativePath);
  await validateFileSize(fullPath);
  const decoder = new TextDecoder('utf-8');
  const data = await Deno.readFile(fullPath);
  return decoder.decode(data);
}

/**
 * Check if file exists (async)
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return await exists(filePath);
}

/**
 * Ensure directory exists, creating if necessary
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await ensureDir(dirPath);
}

/**
 * Safely write file with directory creation
 */
export async function safeWriteFile(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath);
  await ensureDirectoryExists(dir);
  const encoder = new TextEncoder();
  await Deno.writeFile(filePath, encoder.encode(content));
}

/**
 * Safely write JSON file with proper formatting
 */
export async function safeWriteJsonFile(filePath: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await safeWriteFile(filePath, content);
}

/**
 * Check if path exists synchronously
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
 * Read directory contents synchronously
 */
export function readDirectory(dirPath: string): string[] {
  const entries: string[] = [];
  for (const entry of Deno.readDirSync(dirPath)) {
    entries.push(entry.name);
  }
  return entries;
}

/**
 * Get file/directory stats synchronously
 */
export function getStats(filePath: string): Deno.FileInfo {
  return Deno.statSync(filePath);
}

/**
 * Read file synchronously
 */
export function readFileSync(filePath: string): string {
  const decoder = new TextDecoder('utf-8');
  const data = Deno.readFileSync(filePath);
  return decoder.decode(data);
}

/**
 * Read JSON file synchronously
 */
export function readJsonFileSync(filePath: string): unknown {
  const content = readFileSync(filePath);
  return JSON.parse(content);
}

/**
 * Write file synchronously
 */
export function writeFileSync(filePath: string, content: string): void {
  const encoder = new TextEncoder();
  Deno.writeFileSync(filePath, encoder.encode(content));
}

/**
 * Filter directory for specific file types
 */
export function filterDirectory(dirPath: string, extension: string): string[] {
  return readDirectory(dirPath).filter((file) => file.endsWith(extension));
}

/**
 * Delete file synchronously
 */
export function unlinkSync(filePath: string): void {
  Deno.removeSync(filePath);
}