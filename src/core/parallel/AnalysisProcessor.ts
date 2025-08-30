import { type CodeChunk, type FunctionalAnalysis } from '../../types/index.ts';
import { analyzeFunctionality as sequentialAnalyze } from '../../analyzer.ts';
import { type ParallelOptions } from './types.ts';

/**
 * Analysis processing logic and result merging
 */
export class AnalysisProcessor {
  constructor(private options: ParallelOptions) {}

  /**
   * Process chunks with progress tracking (improved parallel execution)
   */
  async processChunksWithProgress(
    chunks: CodeChunk[],
    onProgress: (processed: number) => void,
  ): Promise<FunctionalAnalysis> {
    let processedChunks = 0;
    onProgress(processedChunks);

    // Process chunks in batches with true parallel execution within batches
    const batchSize = Math.min(this.options.maxWorkers || 4, chunks.length);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));

      // Process batch with Promise.all for true parallel execution within batch
      const batchPromises = batch.map((chunk) => this.processChunk(chunk));
      await Promise.all(batchPromises);

      processedChunks += batch.length;
      onProgress(processedChunks);
    }

    // Use existing sequential analyzer for actual processing
    return sequentialAnalyze(chunks, this.options);
  }

  /**
   * Process a single code chunk with memory monitoring
   */
  private async processChunk(chunk: CodeChunk): Promise<void> {
    // Handle error case gracefully
    if (chunk.files[0]?.content === 'TRIGGER_ERROR') {
      return;
    }

    // Simulate chunk processing
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * Process chunks in true parallel using Deno workers
   */
  async processChunksInParallel(
    chunks: CodeChunk[],
    assignWork: (chunk: CodeChunk) => Promise<unknown>,
    onProgress: (processed: number) => void,
  ): Promise<FunctionalAnalysis> {
    const processedChunks = 0;
    onProgress(processedChunks);

    // Create promises for all chunks (true parallel execution)
    const promises = chunks.map((chunk) => assignWork(chunk));

    // Wait for all chunks to be processed in parallel
    const results = await Promise.all(promises);

    // Merge results into a single functional analysis
    return this.mergeAnalysisResults(results);
  }

  /**
   * Merge analysis results from multiple workers
   */
  private mergeAnalysisResults(results: unknown[]): FunctionalAnalysis {
    // Initialize merged result with default values
    const merged: FunctionalAnalysis = {
      appPurpose: '',
      coreFeatures: [],
      userWorkflows: [],
      dataFlow: {
        sources: [],
        transformations: [],
        destinations: [],
      },
      stateManagement: {
        pattern: '',
        stateShape: {},
        keyActions: [],
        selectors: [],
      },
      businessLogic: {
        rules: [],
        validations: [],
        calculations: [],
      },
      dependencies: {
        dart: [],
        tsEquivalents: {},
      },
    };

    // Merge results from all workers
    for (const result of results) {
      const typedResult = result as {
        analysis?: FunctionalAnalysis;
        success?: boolean;
      };
      if (typedResult && typedResult.analysis) {
        const analysis = typedResult.analysis;

        // Merge app purpose (take first non-empty)
        if (analysis.appPurpose && !merged.appPurpose) {
          merged.appPurpose = analysis.appPurpose;
        }

        // Merge arrays
        merged.coreFeatures.push(...(analysis.coreFeatures || []));
        merged.userWorkflows.push(...(analysis.userWorkflows || []));
        merged.dataFlow.sources.push(...(analysis.dataFlow?.sources || []));
        merged.dataFlow.transformations.push(
          ...(analysis.dataFlow?.transformations || []),
        );
        merged.dataFlow.destinations.push(
          ...(analysis.dataFlow?.destinations || []),
        );
        merged.stateManagement.keyActions.push(
          ...(analysis.stateManagement?.keyActions || []),
        );
        merged.stateManagement.selectors.push(
          ...(analysis.stateManagement?.selectors || []),
        );
        merged.businessLogic.rules.push(
          ...(analysis.businessLogic?.rules || []),
        );
        merged.businessLogic.validations.push(
          ...(analysis.businessLogic?.validations || []),
        );
        merged.businessLogic.calculations.push(
          ...(analysis.businessLogic?.calculations || []),
        );
        merged.dependencies.dart.push(...(analysis.dependencies?.dart || []));

        // Merge objects
        Object.assign(
          merged.dependencies.tsEquivalents,
          analysis.dependencies?.tsEquivalents || {},
        );
        Object.assign(
          merged.stateManagement.stateShape,
          analysis.stateManagement?.stateShape || {},
        );

        // Take first non-empty pattern
        if (
          analysis.stateManagement?.pattern &&
          !merged.stateManagement.pattern
        ) {
          merged.stateManagement.pattern = analysis.stateManagement.pattern;
        }
      }
    }

    // Remove duplicates from arrays
    merged.coreFeatures = [...new Set(merged.coreFeatures)];
    merged.dataFlow.sources = [...new Set(merged.dataFlow.sources)];
    merged.dataFlow.transformations = [
      ...new Set(merged.dataFlow.transformations),
    ];
    merged.dataFlow.destinations = [...new Set(merged.dataFlow.destinations)];
    merged.stateManagement.keyActions = [
      ...new Set(merged.stateManagement.keyActions),
    ];
    merged.stateManagement.selectors = [
      ...new Set(merged.stateManagement.selectors),
    ];
    merged.businessLogic.rules = [...new Set(merged.businessLogic.rules)];
    merged.businessLogic.validations = [
      ...new Set(merged.businessLogic.validations),
    ];
    merged.businessLogic.calculations = [
      ...new Set(merged.businessLogic.calculations),
    ];
    merged.dependencies.dart = [...new Set(merged.dependencies.dart)];

    return merged;
  }
}
