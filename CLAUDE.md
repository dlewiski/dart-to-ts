# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development with file watching
deno task dev [project-path]

# Run standard analysis (defaults to ./frontend_release_dashboard)
deno task start [project-path]

# Run comprehensive analysis (slower but more thorough)
deno task start [project-path] --comprehensive

# Testing
deno task test                    # Run all tests
deno task test:watch              # Run tests with file watching

# Code Quality
deno task lint                    # Lint the code
deno task fmt                     # Format code
deno task fmt:check               # Check formatting
deno task check                   # Run lint + format check + type check

# Git Hooks (for automated formatting)
deno task hook:install            # Install pre-commit hooks
deno task precommit               # Manual pre-commit check
```

## Core Architecture

This is a **Deno-based TypeScript application** that analyzes Dart Flutter/web projects and generates migration plans to React 18 + TypeScript. The system operates in phases:

### Phase 1: Functional Analysis

- **Scanner** (`src/scanner.ts`): Categorizes Dart files by type (components, services, state management)
- **Extractor** (`src/extractor.ts`): Extracts relevant code chunks for analysis
- **Analyzer** (`src/analyzer.ts`): Uses Claude AI to understand app functionality
- **Analysis Service** (`src/services/analysis-service.ts`): Orchestrates the entire workflow

### Phase 2: Architecture Planning

- Component hierarchy design (Pages → Layouts → Features → Shared)
- Redux Toolkit store architecture planning
- React Router v6 setup
- Dependency mapping (Dart packages → npm packages)

### Key Data Flow

```
Dart Project → Scanner → Extractor → Claude Analysis → Functional Understanding → Architecture Plan
```

## Project Structure

```
src/
├── analyzer.ts              # Core Claude AI analysis logic
├── scanner.ts               # Dart project file scanning
├── extractor.ts             # Code extraction utilities
├── claude-cli.ts            # Claude CLI subprocess integration
├── services/
│   └── analysis-service.ts  # Main orchestration service
├── core/parallel/           # Parallel processing system
│   ├── ParallelAnalyzer.ts  # Parallel analysis coordinator
│   ├── WorkerPool.ts        # Deno worker management
│   └── MemoryManager.ts     # Memory optimization
├── migration/               # Phase 2+ migration logic
│   ├── patterns/            # Pattern detection and mapping
│   └── strategies/          # Migration strategies
├── types/                   # TypeScript definitions
└── utils/                   # Utility functions
```

## Deno-Specific Patterns

### Dependencies

- **Centralized in `deps.ts`** (Deno convention)
- Uses **JSR imports** (`@std/path`, `@cliffy/command`)
- No `node_modules` or `package.json`

### Permissions

All operations require explicit Deno permissions:

- `--allow-read` - Read project files and cache
- `--allow-write` - Write analysis results
- `--allow-env` - Access environment variables
- `--allow-net` - Claude CLI network access
- `--allow-run` - Execute Claude CLI subprocess

### File Operations

- Use Deno APIs instead of Node.js fs module
- `Deno.readTextFile()` / `Deno.writeTextFile()`
- Path operations via `@std/path`

## Claude AI Integration

The system integrates with Claude via **subprocess calls** to the Claude CLI:

### Analysis Types

- **Standard**: Quick functional analysis
- **Comprehensive**: Thorough analysis with detailed patterns (`--comprehensive`)
- **Parallel**: Multi-worker processing (`--parallel`)

### Caching

- Intelligent response caching to reduce API calls
- Cache location: `analysis/` directory
- Disable with `--no-cache`

## Testing Strategy

Uses **Deno's built-in test runner**:

- Integration tests for Claude API calls
- Parallel processing validation
- Worker mechanism verification
- BDD syntax with descriptive test names

## Development Guidelines

### TypeScript Configuration

- **Strict mode enabled** with extensive compiler options
- **No build step required** - Deno handles TypeScript natively
- Type checking via `deno check main.ts`

### Code Style

- **2-space indentation**
- **Single quotes**
- **80 character line width**
- Auto-formatting with `deno fmt`

### Error Handling

- Robust error handling throughout analysis pipeline
- Graceful degradation for missing dependencies
- Clear error messages for common failure modes

### Memory Management

- Intelligent memory management for large codebases
- Chunking strategies for large file analysis
- Worker pool optimization

## Migration Patterns

The analyzer recognizes these Dart → TypeScript patterns:

### State Management

- **Provider** → Redux Toolkit + React Redux
- **Bloc** → Custom RTK slices
- **StreamBuilder** → useQuery (RTK Query)

### Components

- **StatefulWidget** → React.FC with hooks
- **StatelessWidget** → Pure React.FC
- **FutureBuilder** → Suspense + useQuery

### Routing

- **go_router** → React Router v6
- **MaterialApp** → App component with Router

### Internal/Private Dependencies

**IMPORTANT**: When analyzing Dart projects, identify and handle internal company dependencies:

- **Design Systems** (e.g., `unify` → Material-UI wrapper): Use Material-UI + custom theme as placeholder
- **Internal Libraries** (company-specific packages): Create placeholder interfaces/types
- **Private APIs** (internal service packages): Mock with standard REST/GraphQL patterns
- **Company Tools** (build tools, utilities): Replace with standard npm equivalents

**Actions to take**:

1. **Flag for Review**: Mark any dependency that appears company-internal (not in pub.dev)
2. **Reasonable Placeholders**: Provide functional alternatives (e.g., unify → @mui/material)
3. **Documentation**: Note these dependencies require manual review in analysis output
4. **TODO Comments**: Add clear TODO comments in generated code for manual replacement

**Common Internal Patterns**:

- Design system packages → Material-UI
- Internal state management → Standard Redux Toolkit
- Company API clients → Axios with typed interfaces
- Build/deployment tools → Standard Vite configurations

## Output Structure

Analysis generates structured output in `analysis/`:

```
analysis/
├── raw/
│   └── file-categories.json     # Raw file categorization
├── functional/
│   └── analysis.json            # Structured functional analysis
└── report.md                   # Human-readable report
```

## Common Development Patterns

### Adding New Analysis Features

1. Extend types in `src/types/`
2. Add analysis logic to `src/analyzer.ts`
3. Update prompts in `src/prompts.ts`
4. Test with both standard and comprehensive modes

### Adding New Migration Patterns

1. Add pattern detection to `src/migration/patterns/`
2. Implement mapping logic in `PatternMapper.ts`
3. Update strategy analysis in `StrategyAnalyzer.ts`

### Debugging Claude Integration

- Use `--verbose` flag for detailed API usage
- Check `analysis/` directory for cached responses
- Verify Claude CLI configuration with subprocess tests
