import { join } from '../deps.ts';
import { getStats, readDirectory } from './utils/file-operations.ts';
import { type FileCategories } from './types/index.ts';

/**
 * Scan Dart project and categorize files by functionality
 */
export function scanDartProject(projectPath: string): FileCategories {
  const categories: FileCategories = initializeEmptyCategories();
  const scanner = new ProjectScanner(projectPath, categories);

  scanner.scanDirectory(projectPath);
  return categories;
}

/**
 * Initialize empty file categories structure
 */
function initializeEmptyCategories(): FileCategories {
  return {
    components: [],
    state: [],
    services: [],
    utils: [],
    entry: null,
    models: [],
    tests: [],
    other: [],
  };
}

/**
 * Project scanner class for organized file categorization
 */
class ProjectScanner {
  private readonly projectPath: string;
  private readonly categories: FileCategories;
  private readonly fileClassifier: FileClassifier;

  constructor(projectPath: string, categories: FileCategories) {
    this.projectPath = projectPath;
    this.categories = categories;
    this.fileClassifier = new FileClassifier();
  }

  /**
   * Recursively scan directory for Dart files
   */
  scanDirectory(dirPath: string): void {
    try {
      const directoryItems = readDirectory(dirPath);

      for (const item of directoryItems) {
        const fullPath = join(dirPath, item);
        this.processFileSystemItem(fullPath, item);
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dirPath}:`, error);
    }
  }

  /**
   * Process individual file system item (file or directory)
   */
  private processFileSystemItem(fullPath: string, itemName: string): void {
    try {
      const itemStats = getStats(fullPath);

      if (itemStats.isDirectory && this.shouldScanDirectory(itemName)) {
        this.scanDirectory(fullPath);
      } else if (this.isDartFile(itemName)) {
        this.categorizeFile(fullPath);
      }
    } catch (error) {
      console.warn(`Warning: Could not process item ${fullPath}:`, error);
    }
  }

  /**
   * Determine if directory should be scanned
   */
  private shouldScanDirectory(directoryName: string): boolean {
    const excludedDirs = ['.', 'build', 'node_modules', '.git'];
    return !directoryName.startsWith('.') &&
      !excludedDirs.includes(directoryName);
  }

  /**
   * Check if file is a Dart source file
   */
  private isDartFile(fileName: string): boolean {
    return fileName.endsWith('.dart');
  }

  /**
   * Categorize file based on path and content patterns
   */
  private categorizeFile(filePath: string): void {
    const relativePath = this.getRelativePath(filePath);
    const category = this.fileClassifier.classifyFile(relativePath);

    this.addFileToCategory(relativePath, category);
  }

  /**
   * Get relative path from project root
   */
  private getRelativePath(fullPath: string): string {
    return fullPath.replace(this.projectPath + '/', '');
  }

  /**
   * Add file to appropriate category
   */
  private addFileToCategory(relativePath: string, category: string): void {
    switch (category) {
      case 'entry':
        this.categories.entry = relativePath;
        break;
      case 'components':
        this.categories.components.push(relativePath);
        break;
      case 'state':
        this.categories.state.push(relativePath);
        break;
      case 'services':
        this.categories.services.push(relativePath);
        break;
      case 'utils':
        this.categories.utils.push(relativePath);
        break;
      case 'models':
        this.categories.models.push(relativePath);
        break;
      case 'tests':
        this.categories.tests.push(relativePath);
        break;
      default:
        this.categories.other.push(relativePath);
    }
  }
}

/**
 * File classification logic separated for better maintainability
 */
class FileClassifier {
  private readonly patterns = {
    entry: ['web/main.dart', 'lib/main.dart'],
    components: ['/components/', '_ui.dart', '_widget.dart'],
    state: ['/redux/', '/state/', '/bloc/', 'reducer', 'action'],
    services: ['/service', '_service.dart', '/api/', '_api.dart'],
    utils: ['/utils/', '_utils.dart', '/helpers/', '_helper.dart'],
    models: ['/models/', '.g.dart', '_model.dart', '/entities/'],
    tests: ['_test.dart', '/test/'],
  };

  /**
   * Classify file based on path patterns
   */
  classifyFile(relativePath: string): string {
    // Check for entry point first (exact match)
    if (this.patterns.entry.includes(relativePath)) {
      return 'entry';
    }

    // Check other categories by pattern matching
    for (const [category, patterns] of Object.entries(this.patterns)) {
      if (category === 'entry') continue; // Already checked

      if (this.matchesAnyPattern(relativePath, patterns)) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Check if relative path matches any of the given patterns
   */
  private matchesAnyPattern(relativePath: string, patterns: string[]): boolean {
    return patterns.some((pattern) => relativePath.includes(pattern));
  }
}
