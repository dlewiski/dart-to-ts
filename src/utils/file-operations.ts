import * as fs from 'fs';
import * as path from 'path';
import { FILE_SIZE_LIMITS, FileSizeError } from '../types';

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
  const fullPath = path.resolve(projectPath, relativePath);
  const projectRealPath = path.resolve(projectPath);

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
  const stats = await fs.promises.stat(filePath);
  if (stats.size > FILE_SIZE_LIMITS.MAX_FILE_SIZE) {
    throw new FileSizeError(
      path.basename(filePath),
      stats.size,
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
  return fs.promises.readFile(fullPath, 'utf-8');
}

/**
 * Check if file exists (async)
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure directory exists, creating if necessary
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Safely write file with directory creation
 */
export function safeWriteFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDirectoryExists(dir);
  fs.writeFileSync(filePath, content);
}

/**
 * Safely write JSON file with proper formatting
 */
export function safeWriteJsonFile(filePath: string, data: unknown): void {
  const content = JSON.stringify(data, null, 2);
  safeWriteFile(filePath, content);
}

/**
 * Check if path exists synchronously
 */
export function pathExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Read directory contents synchronously
 */
export function readDirectory(dirPath: string): string[] {
  return fs.readdirSync(dirPath);
}

/**
 * Get file/directory stats synchronously
 */
export function getStats(filePath: string): fs.Stats {
  return fs.statSync(filePath);
}

/**
 * Read file synchronously
 */
export function readFileSync(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
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
  fs.writeFileSync(filePath, content);
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
  fs.unlinkSync(filePath);
}
