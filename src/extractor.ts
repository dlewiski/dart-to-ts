import { join, dirname } from '../deps.ts';
import { type FileCategories } from './types/index.ts';
import { safeReadFile, fileExists } from './utils/file-operations.ts';
import { type CodeChunk, type CodeFile, FILE_SIZE_LIMITS } from './types/index.ts';

/**
 * Extract code chunks for analysis with async file operations
 */
export async function extractCodeForAnalysis(
  projectPath: string,
  categories: FileCategories
): Promise<CodeChunk[]> {
  const chunks: CodeChunk[] = [];
  let totalSize = 0;

  // Extract entry point for app initialization understanding
  if (categories.entry) {
    try {
      chunks.push({
        category: 'entry',
        files: [
          {
            path: categories.entry,
            content: await safeReadFile(projectPath, categories.entry),
          },
        ],
        context: 'Main entry point - app initialization and setup',
      });
    } catch (error) {
      console.warn(
        `Warning: Could not read entry file ${categories.entry}:`,
        error
      );
    }
  }

  // Group state management files together for holistic analysis
  if (categories.state.length > 0) {
    const stateFiles = await Promise.all(
      categories.state.slice(0, 5).map(async (file) => {
        try {
          const content = await safeReadFile(projectPath, file);
          totalSize += new TextEncoder().encode(content).length;

          if (totalSize > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE) {
            console.warn(
              `Total size limit exceeded (${FILE_SIZE_LIMITS.MAX_TOTAL_SIZE} bytes). Stopping chunk extraction.`
            );
            return null;
          }

          return {
            path: file,
            content,
          };
        } catch (error) {
          console.warn(`Warning: Could not read state file ${file}:`, error);
          return null;
        }
      })
    );

    const validStateFiles = stateFiles.filter((f) => f !== null) as CodeFile[];
    if (validStateFiles.length > 0) {
      chunks.push({
        category: 'state',
        files: validStateFiles,
        context: 'Redux state management - actions, reducers, selectors',
      });
    }
  }

  // Sample key components for UI functionality understanding
  if (categories.components.length > 0) {
    const componentFiles = await Promise.all(
      categories.components.slice(0, 3).map(async (file) => {
        try {
          const content = await safeReadFile(projectPath, file);
          totalSize += new TextEncoder().encode(content).length;

          if (totalSize > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE) {
            console.warn(
              `Total size limit exceeded (${FILE_SIZE_LIMITS.MAX_TOTAL_SIZE} bytes). Stopping chunk extraction.`
            );
            return null;
          }

          return {
            path: file,
            content,
          };
        } catch (error) {
          console.warn(
            `Warning: Could not read component file ${file}:`,
            error
          );
          return null;
        }
      })
    );

    const validComponentFiles = componentFiles.filter(
      (f) => f !== null
    ) as CodeFile[];
    if (validComponentFiles.length > 0) {
      chunks.push({
        category: 'components',
        files: validComponentFiles,
        context: 'UI components - user interactions and data display',
      });
    }
  }

  // Extract services for data flow understanding
  if (categories.services.length > 0) {
    const serviceFiles = await Promise.all(
      categories.services.slice(0, 3).map(async (file) => {
        try {
          const content = await safeReadFile(projectPath, file);
          totalSize += new TextEncoder().encode(content).length;

          if (totalSize > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE) {
            console.warn(
              `Total size limit exceeded (${FILE_SIZE_LIMITS.MAX_TOTAL_SIZE} bytes). Stopping chunk extraction.`
            );
            return null;
          }

          return {
            path: file,
            content,
          };
        } catch (error) {
          console.warn(`Warning: Could not read service file ${file}:`, error);
          return null;
        }
      })
    );

    const validServiceFiles = serviceFiles.filter(
      (f) => f !== null
    ) as CodeFile[];
    if (validServiceFiles.length > 0) {
      chunks.push({
        category: 'services',
        files: validServiceFiles,
        context: 'Service layer - API calls and data fetching',
      });
    }
  }

  // Include pubspec.yaml for dependency understanding
  const pubspecPath = join(projectPath, 'pubspec.yaml');
  if (await fileExists(pubspecPath)) {
    try {
      chunks.push({
        category: 'dependencies',
        files: [
          {
            path: 'pubspec.yaml',
            content: await safeReadFile(
              dirname(pubspecPath),
              'pubspec.yaml'
            ),
          },
        ],
        context: 'Project dependencies and configuration',
      });
    } catch (error) {
      console.warn(`Warning: Could not read pubspec.yaml:`, error);
    }
  }

  return chunks;
}
