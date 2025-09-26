import { PackageDecision, ExtractedUtility } from '../types.js';
import * as fs from 'fs-extra';
import * as path from 'path';

export class Inliner {
  private inlinedUtilities = new Map<string, ExtractedUtility[]>();

  async inline(
    typescript: string,
    decisions: PackageDecision[]
  ): Promise<{ code: string; inlinedCount: number }> {
    let code = typescript;
    let inlinedCount = 0;

    for (const decision of decisions) {
      if (decision.action === 'inline' && decision.extractedUtilities) {
        for (const utility of decision.extractedUtilities) {
          code = await this.inlineUtility(code, utility);
          inlinedCount++;

          // Track inlined utilities
          if (!this.inlinedUtilities.has(decision.packageName)) {
            this.inlinedUtilities.set(decision.packageName, []);
          }
          this.inlinedUtilities.get(decision.packageName)!.push(utility);
        }
      }
    }

    return { code, inlinedCount };
  }

  private async inlineUtility(
    code: string,
    utility: ExtractedUtility
  ): Promise<string> {
    // Find where the utility is used
    const usagePattern = new RegExp(`\\b${utility.name}\\b`, 'g');

    if (usagePattern.test(code)) {
      // Add the utility definition at the top of the file (after imports)
      const importEndIndex = this.findImportEndIndex(code);
      const beforeImports = code.slice(0, importEndIndex);
      const afterImports = code.slice(importEndIndex);

      // Add utility with a comment
      const inlinedCode = `
// Inlined from package - ${utility.name}
${utility.code}
`;

      return beforeImports + inlinedCode + afterImports;
    }

    return code;
  }

  private findImportEndIndex(code: string): number {
    const lines = code.split('\n');
    let lastImportIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || line.startsWith('export ') || line.startsWith('//')) {
        lastImportIndex = i;
      } else if (line.length > 0) {
        break;
      }
    }

    return lines.slice(0, lastImportIndex + 1).join('\n').length + 1;
  }

  async saveInlinedUtilities(outputPath: string): Promise<void> {
    const utilsPath = path.join(outputPath, 'utils');
    await fs.ensureDir(utilsPath);

    for (const [packageName, utilities] of this.inlinedUtilities) {
      const fileName = `${packageName.replace('/', '_')}_utils.ts`;
      const filePath = path.join(utilsPath, fileName);

      const content = this.generateUtilityFile(packageName, utilities);
      await fs.writeFile(filePath, content);
    }

    // Create an index file
    await this.createUtilityIndex(utilsPath);
  }

  private generateUtilityFile(
    packageName: string,
    utilities: ExtractedUtility[]
  ): string {
    const header = `/**
 * Utilities inlined from package: ${packageName}
 * These utilities were extracted to reduce dependencies
 * Generated on: ${new Date().toISOString()}
 */

`;

    const utilityCode = utilities
      .map(utility => {
        return `// ${utility.type}: ${utility.name}
${utility.code}
`;
      })
      .join('\n');

    return header + utilityCode;
  }

  private async createUtilityIndex(utilsPath: string): Promise<void> {
    const files = await fs.readdir(utilsPath);
    const exports = files
      .filter(f => f.endsWith('.ts') && f !== 'index.ts')
      .map(f => `export * from './${f.slice(0, -3)}';`)
      .join('\n');

    const indexContent = `/**
 * Inlined utilities from eliminated packages
 * Auto-generated index file
 */

${exports}
`;

    await fs.writeFile(path.join(utilsPath, 'index.ts'), indexContent);
  }

  generateInlineReport(): Record<string, any> {
    const report: Record<string, any> = {
      totalPackagesInlined: this.inlinedUtilities.size,
      totalUtilitiesExtracted: 0,
      byPackage: {},
    };

    for (const [packageName, utilities] of this.inlinedUtilities) {
      report.totalUtilitiesExtracted += utilities.length;
      report.byPackage[packageName] = {
        utilitiesExtracted: utilities.length,
        types: utilities.map(u => u.type),
        names: utilities.map(u => u.name),
      };
    }

    return report;
  }
}