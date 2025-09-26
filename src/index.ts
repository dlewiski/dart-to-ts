export * from './types.js';
export * from './analyzer/index.js';
export * from './converter/index.js';
export * from './intelligence/index.js';
export * from './reports/index.js';
export * from './config/settings.js';
export * from './config/package-mappings.js';

// Main entry point for programmatic usage
import { ConversionOrchestrator } from './converter/index.js';
import { Analyzer } from './analyzer/index.js';
import { TechDebtReporter, PackageReporter } from './reports/index.js';
import type { ConversionConfig, DartFile } from './types.js';

export class DartToTypeScriptConverter {
  private config: ConversionConfig;

  constructor(config: ConversionConfig) {
    this.config = config;
  }

  async analyze(files: DartFile[]) {
    const analyzer = new Analyzer();
    return analyzer.analyze(files);
  }

  async convert(files: DartFile[]) {
    const orchestrator = new ConversionOrchestrator(this.config);
    return orchestrator.convertProject(files, this.config);
  }

  async generateReports(
    results: Map<string, any>,
    decisions: any[],
    techDebtPatterns: any[]
  ) {
    const debtReporter = new TechDebtReporter();
    const packageReporter = new PackageReporter();

    await debtReporter.generateReport(
      techDebtPatterns,
      results,
      this.config.decisionsPath
    );

    await packageReporter.generateReport(
      decisions,
      results,
      this.config.decisionsPath
    );
  }
}

export default DartToTypeScriptConverter;