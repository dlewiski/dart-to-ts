# Parallel Processing Test Suite

This directory contains the refactored test suite for the parallel processing functionality. The tests have been reorganized following DRY principles to eliminate duplication while maintaining clarity and comprehensive coverage.

## Test Structure

### Core Test Files

- **`parallel-unit.test.ts`** - Unit tests using mocks for fast, isolated testing
- **`parallel-integration.test.ts`** - Integration tests with the actual ParallelAnalyzer
- **`parallel-performance.test.ts`** - Performance benchmarks comparing parallel vs sequential
- **`worker-mechanism.test.ts`** - Tests for web worker infrastructure
- **`run-all-tests.ts`** - Main test runner that executes all test suites

### Shared Test Utilities (`helpers/`)

- **`test-fixtures.ts`** - Reusable mock data and chunk generators
  - `createMockChunks()` - Generate simple test chunks
  - `createRealisticChunks()` - Generate realistic Flutter/Dart code chunks
  
- **`test-runner.ts`** - Common test execution framework
  - `runTestSuite()` - Execute a suite of tests with error handling
  - `assert` - Assertion utilities (ok, equal, greaterThan, etc.)
  - `timing` - Timing utilities (measure, delay, timeout)
  - `trackProgressEvents()` - Progress event tracking helper

- **`mock-analyzer.ts`** - Mock implementations for unit testing
  - `MockParallelAnalyzer` - Mock analyzer for isolated testing
  - `DenoEventEmitter` - Deno-compatible event emitter
  - Worker creation and cleanup utilities

## Running Tests

### Run All Tests
```bash
# Run all test suites
deno run --allow-all test/run-all-tests.ts

# Or use the shell script
./test-runner.sh

# Include performance tests
./test-runner.sh --with-perf
```

### Run Individual Test Suites
```bash
# Unit tests only
deno run --allow-all test/parallel-unit.test.ts

# Integration tests only
deno run --allow-all test/parallel-integration.test.ts

# Worker mechanism tests
deno run --allow-all test/worker-mechanism.test.ts

# Performance benchmarks
deno run --allow-all test/parallel-performance.test.ts
```

## Test Coverage

### Unit Tests
- Basic functionality
- Parallel execution timing
- Progress event emission
- Error handling
- Concurrency limits
- Large dataset handling

### Integration Tests
- Real ParallelAnalyzer functionality
- Progress tracking with actual implementation
- Error resilience in production code
- Memory management
- Resource cleanup
- Realistic content processing

### Worker Mechanism Tests
- Worker creation and termination
- Message communication
- Multiple worker instances
- Error handling in workers
- Performance characteristics

### Performance Tests
- Sequential vs parallel comparison
- Speedup measurements
- Memory usage tracking
- Scalability testing

## Key Improvements from Refactoring

1. **Eliminated Duplication**
   - Extracted common mock chunk creation logic
   - Unified test runner framework
   - Shared assertion utilities
   - Centralized progress event tracking

2. **Improved Organization**
   - Clear separation between unit, integration, and performance tests
   - Logical grouping of test utilities
   - Consistent naming conventions

3. **Enhanced Maintainability**
   - Single source of truth for test fixtures
   - Reusable test patterns
   - Standardized error handling

4. **Better Test Coverage**
   - More comprehensive worker testing
   - Realistic content testing
   - Performance benchmarking

## Adding New Tests

When adding new tests:

1. Use the shared utilities in `helpers/`
2. Follow the established patterns for test structure
3. Add tests to the appropriate file based on type:
   - Unit tests → `parallel-unit.test.ts`
   - Integration tests → `parallel-integration.test.ts`
   - Performance tests → `parallel-performance.test.ts`
   - Worker tests → `worker-mechanism.test.ts`

Example:
```typescript
import { createMockChunks } from './helpers/test-fixtures.ts';
import { runTestSuite, assert } from './helpers/test-runner.ts';

await runTestSuite('My New Tests', [
  {
    name: 'Test Name',
    fn: async () => {
      // Test implementation
      assert.ok(result, 'Should work');
    },
    timeout: 5000 // Optional timeout
  }
]);
```