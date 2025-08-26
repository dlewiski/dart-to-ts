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

export function extractCodeForAnalysis(
  projectPath: string, 
  categories: FileCategories
): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  // Extract entry point for app initialization understanding
  if (categories.entry) {
    chunks.push({
      category: 'entry',
      files: [{
        path: categories.entry,
        content: readFile(projectPath, categories.entry)
      }],
      context: 'Main entry point - app initialization and setup'
    });
  }

  // Group state management files together for holistic analysis
  if (categories.state.length > 0) {
    chunks.push({
      category: 'state',
      files: categories.state.slice(0, 5).map(file => ({
        path: file,
        content: readFile(projectPath, file)
      })),
      context: 'Redux state management - actions, reducers, selectors'
    });
  }

  // Sample key components for UI functionality understanding
  if (categories.components.length > 0) {
    chunks.push({
      category: 'components',
      files: categories.components.slice(0, 3).map(file => ({
        path: file,
        content: readFile(projectPath, file)
      })),
      context: 'UI components - user interactions and data display'
    });
  }

  // Extract services for data flow understanding
  if (categories.services.length > 0) {
    chunks.push({
      category: 'services',
      files: categories.services.slice(0, 3).map(file => ({
        path: file,
        content: readFile(projectPath, file)
      })),
      context: 'Service layer - API calls and data fetching'
    });
  }

  // Include pubspec.yaml for dependency understanding
  const pubspecPath = path.join(projectPath, 'pubspec.yaml');
  if (fs.existsSync(pubspecPath)) {
    chunks.push({
      category: 'dependencies',
      files: [{
        path: 'pubspec.yaml',
        content: fs.readFileSync(pubspecPath, 'utf-8')
      }],
      context: 'Project dependencies and configuration'
    });
  }

  return chunks;
}

function readFile(projectPath: string, relativePath: string): string {
  const fullPath = path.join(projectPath, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}