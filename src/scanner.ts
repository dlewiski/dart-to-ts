import * as fs from 'fs';
import * as path from 'path';

export interface FileCategories {
  components: string[];
  state: string[];
  services: string[];
  utils: string[];
  entry: string | null;
  models: string[];
}

export function scanDartProject(projectPath: string): FileCategories {
  const categories: FileCategories = {
    components: [],
    state: [],
    services: [],
    utils: [],
    entry: null,
    models: [],
  };

  function scanDirectory(dirPath: string) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'build') {
        scanDirectory(fullPath);
      } else if (item.endsWith('.dart')) {
        categorizeFile(fullPath, categories);
      }
    }
  }

  function categorizeFile(filePath: string, cats: FileCategories) {
    const relativePath = path.relative(projectPath, filePath);

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
