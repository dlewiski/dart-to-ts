#!/bin/bash

# Test runner script for parallel processing tests

echo "🚀 Running Parallel Processing Tests"
echo "===================================="

# Run individual test suites
echo ""
echo "📦 Running Unit Tests..."
deno run --allow-all test/parallel-unit.test.ts

echo ""
echo "📦 Running Worker Mechanism Tests..."
deno run --allow-all test/worker-mechanism.test.ts

echo ""
echo "📦 Running Integration Tests..."
deno run --allow-all test/parallel-integration.test.ts

# Optional: Run performance tests (can be slow)
if [ "$1" == "--with-perf" ]; then
    echo ""
    echo "📦 Running Performance Tests..."
    deno run --allow-all test/parallel-performance.test.ts
else
    echo ""
    echo "ℹ️  Skipping performance tests (use --with-perf to include)"
fi

echo ""
echo "✅ Test run complete!"