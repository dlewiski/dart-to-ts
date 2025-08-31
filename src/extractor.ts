import { dirname, join } from '../deps.ts';
import { type FileCategories } from './types/index.ts';
import { fileExists, safeReadFile } from './utils/file-operations.ts';
import {
  type CodeChunk,
  type CodeFile,
  FILE_SIZE_LIMITS,
} from './types/index.ts';

/**
 * Extract code chunks for analysis with async file operations
 */
export async function extractCodeForAnalysis(
  projectPath: string,
  categories: FileCategories,
): Promise<CodeChunk[]> {
  const extractor = new CodeChunkExtractor(projectPath);
  return await extractor.extractAllChunks(categories);
}

/**
 * Code chunk extractor with organized extraction logic
 */
class CodeChunkExtractor {
  private readonly projectPath: string;
  private totalProcessedSize = 0;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Extract all code chunks from categorized files
   */
  async extractAllChunks(categories: FileCategories): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];

    // Extract entry point
    await this.extractEntryChunk(categories.entry, chunks);

    // Extract other category chunks
    await this.extractCategoryChunks('state', categories.state, chunks, 5);
    await this.extractCategoryChunks(
      'components',
      categories.components,
      chunks,
      3,
    );
    await this.extractCategoryChunks(
      'services',
      categories.services,
      chunks,
      3,
    );

    // Extract dependencies
    await this.extractDependencyChunk(chunks);

    return chunks;
  }

  /**
   * Extract entry point chunk
   */
  private async extractEntryChunk(
    entryPath: string | null,
    chunks: CodeChunk[],
  ): Promise<void> {
    if (!entryPath) return;

    try {
      const entryFile = await this.createCodeFile(entryPath);
      if (entryFile) {
        chunks.push({
          category: 'entry',
          files: [entryFile],
          context: 'Main entry point - app initialization and setup',
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not read entry file ${entryPath}:`, error);
    }
  }

  /**
   * Extract chunks for a specific category
   */
  private async extractCategoryChunks(
    category: string,
    filePaths: string[],
    chunks: CodeChunk[],
    maxFiles: number,
  ): Promise<void> {
    if (filePaths.length === 0) return;

    const categoryInfo = this.getCategoryInfo(category);
    const limitedPaths = filePaths.slice(0, maxFiles);

    const codeFiles = await this.processFileList(limitedPaths);

    if (codeFiles.length > 0) {
      chunks.push({
        category,
        files: codeFiles,
        context: categoryInfo.context,
      });
    }
  }

  /**
   * Extract dependency chunk from pubspec.yaml
   */
  private async extractDependencyChunk(chunks: CodeChunk[]): Promise<void> {
    const pubspecPath = join(this.projectPath, 'pubspec.yaml');

    if (await fileExists(pubspecPath)) {
      try {
        const dependencyFile = {
          path: 'pubspec.yaml',
          content: await safeReadFile(dirname(pubspecPath), 'pubspec.yaml'),
        };

        chunks.push({
          category: 'dependencies',
          files: [dependencyFile],
          context: 'Project dependencies and configuration',
        });
      } catch (error) {
        console.warn('Warning: Could not read pubspec.yaml:', error);
      }
    }
  }

  /**
   * Process list of file paths into CodeFile objects
   */
  private async processFileList(filePaths: string[]): Promise<CodeFile[]> {
    const filePromises = filePaths.map((path) => this.createCodeFile(path));
    const results = await Promise.all(filePromises);

    return results.filter((file): file is CodeFile => file !== null);
  }

  /**
   * Create a CodeFile object with size validation
   */
  private async createCodeFile(relativePath: string): Promise<CodeFile | null> {
    try {
      const content = await safeReadFile(this.projectPath, relativePath);
      const contentSize = new TextEncoder().encode(content).length;

      // Check total size limit
      if (
        this.totalProcessedSize + contentSize > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE
      ) {
        console.warn(
          `Total size limit exceeded (${FILE_SIZE_LIMITS.MAX_TOTAL_SIZE} bytes). Skipping ${relativePath}.`,
        );
        return null;
      }

      this.totalProcessedSize += contentSize;

      return {
        path: relativePath,
        content,
      };
    } catch (error) {
      console.warn(`Warning: Could not read file ${relativePath}:`, error);
      return null;
    }
  }

  /**
   * Get category-specific information
   */
  private getCategoryInfo(category: string): { context: string } {
    const categoryContexts: Record<string, string> = {
      state: 'Redux state management - actions, reducers, selectors',
      components: 'UI components - user interactions and data display',
      services: 'Service layer - API calls and data fetching',
      utils: 'Utility functions and helpers',
      models: 'Data models and entity definitions',
    };

    return {
      context: categoryContexts[category] || `${category} related files`,
    };
  }
}
