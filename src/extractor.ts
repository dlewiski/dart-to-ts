import * as fs from 'fs';
import * as path from 'path';
import { FileCategories } from './scanner';

export interface CodeChunk {
  category: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  context: string;
}

/**
 * Validate that a path is safe and within the project directory
 */
function validatePath(projectPath: string, relativePath: string): string {
  const fullPath = path.resolve(projectPath, relativePath);
  const projectRealPath = path.resolve(projectPath);
  
  // Ensure the resolved path is within the project directory
  if (!fullPath.startsWith(projectRealPath)) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }
  
  return fullPath;
}

/**
 * Async read file with path validation
 */
async function readFileAsync(projectPath: string, relativePath: string): Promise<string> {
  const fullPath = validatePath(projectPath, relativePath);
  return fs.promises.readFile(fullPath, 'utf-8');
}

/**
 * Check if file exists (async)
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract code chunks for analysis with async file operations
 */
export async function extractCodeForAnalysis(
  projectPath: string, 
  categories: FileCategories
): Promise<CodeChunk[]> {
  const chunks: CodeChunk[] = [];

  // Extract entry point for app initialization understanding
  if (categories.entry) {
    try {
      chunks.push({
        category: 'entry',
        files: [{
          path: categories.entry,
          content: await readFileAsync(projectPath, categories.entry)
        }],
        context: 'Main entry point - app initialization and setup'
      });
    } catch (error) {
      console.warn(`Warning: Could not read entry file ${categories.entry}:`, error);
    }
  }

  // Group state management files together for holistic analysis
  if (categories.state.length > 0) {
    const stateFiles = await Promise.all(
      categories.state.slice(0, 5).map(async (file) => {
        try {
          return {
            path: file,
            content: await readFileAsync(projectPath, file)
          };
        } catch (error) {
          console.warn(`Warning: Could not read state file ${file}:`, error);
          return null;
        }
      })
    );
    
    const validStateFiles = stateFiles.filter(f => f !== null) as Array<{path: string; content: string}>;
    if (validStateFiles.length > 0) {
      chunks.push({
        category: 'state',
        files: validStateFiles,
        context: 'Redux state management - actions, reducers, selectors'
      });
    }
  }

  // Sample key components for UI functionality understanding
  if (categories.components.length > 0) {
    const componentFiles = await Promise.all(
      categories.components.slice(0, 3).map(async (file) => {
        try {
          return {
            path: file,
            content: await readFileAsync(projectPath, file)
          };
        } catch (error) {
          console.warn(`Warning: Could not read component file ${file}:`, error);
          return null;
        }
      })
    );
    
    const validComponentFiles = componentFiles.filter(f => f !== null) as Array<{path: string; content: string}>;
    if (validComponentFiles.length > 0) {
      chunks.push({
        category: 'components',
        files: validComponentFiles,
        context: 'UI components - user interactions and data display'
      });
    }
  }

  // Extract services for data flow understanding
  if (categories.services.length > 0) {
    const serviceFiles = await Promise.all(
      categories.services.slice(0, 3).map(async (file) => {
        try {
          return {
            path: file,
            content: await readFileAsync(projectPath, file)
          };
        } catch (error) {
          console.warn(`Warning: Could not read service file ${file}:`, error);
          return null;
        }
      })
    );
    
    const validServiceFiles = serviceFiles.filter(f => f !== null) as Array<{path: string; content: string}>;
    if (validServiceFiles.length > 0) {
      chunks.push({
        category: 'services',
        files: validServiceFiles,
        context: 'Service layer - API calls and data fetching'
      });
    }
  }

  // Include pubspec.yaml for dependency understanding
  const pubspecPath = path.join(projectPath, 'pubspec.yaml');
  if (await fileExists(pubspecPath)) {
    try {
      chunks.push({
        category: 'dependencies',
        files: [{
          path: 'pubspec.yaml',
          content: await fs.promises.readFile(pubspecPath, 'utf-8')
        }],
        context: 'Project dependencies and configuration'
      });
    } catch (error) {
      console.warn(`Warning: Could not read pubspec.yaml:`, error);
    }
  }

  return chunks;
}