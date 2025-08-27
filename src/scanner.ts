import { join } from '../deps.ts';
import { readDirectory, getStats } from './utils/file-operations.ts';
import { type FileCategories } from './types/index.ts';

export function scanDartProject(projectPath: string): FileCategories {
  const categories: FileCategories = {
    components: [],
    state: [],
    services: [],
    utils: [],
    entry: null,
    models: [],
    tests: [],
    other: [],
  };

  function scanDirectory(dirPath: string) {
    const items = readDirectory(dirPath);

    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = getStats(fullPath);

      if (stat.isDirectory && !item.startsWith('.') && item !== 'build') {
        scanDirectory(fullPath);
      } else if (item.endsWith('.dart')) {
        categorizeFile(fullPath, categories);
      }
    }
  }

  function categorizeFile(filePath: string, cats: FileCategories) {
    const relativePath = filePath.replace(projectPath + '/', '');

    // Entry point
    if (relativePath === 'web/main.dart') {
      cats.entry = relativePath;
      return;
    }

    // Categorize by path and filename patterns
    if (
      relativePath.includes('/components/') ||
      relativePath.includes('_ui.dart')
    ) {
      cats.components.push(relativePath);
    } else if (
      relativePath.includes('/redux/') ||
      relativePath.includes('state') ||
      relativePath.includes('reducer') ||
      relativePath.includes('action')
    ) {
      cats.state.push(relativePath);
    } else if (
      relativePath.includes('/service') ||
      relativePath.includes('_service')
    ) {
      cats.services.push(relativePath);
    } else if (
      relativePath.includes('/utils/') ||
      relativePath.includes('_utils')
    ) {
      cats.utils.push(relativePath);
    } else if (
      relativePath.includes('/models/') ||
      relativePath.includes('.g.dart')
    ) {
      cats.models.push(relativePath);
    }
  }

  scanDirectory(projectPath);
  return categories;
}
