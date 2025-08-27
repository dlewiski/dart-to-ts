# Dart to TypeScript Analyzer - Deno Edition

A modern Deno application that analyzes Dart Flutter/web applications and provides comprehensive insights for TypeScript conversion planning. Built with TypeScript, Deno's secure runtime, and Claude AI for intelligent code analysis.

## 🚀 Features

- **Comprehensive Code Analysis**: Scans and categorizes Dart project structure
- **AI-Powered Understanding**: Uses Claude AI to analyze code functionality
- **Structured Output**: Generates organized JSON analysis and Markdown reports
- **Efficient Caching**: Reduces redundant API calls with intelligent response caching
- **TypeScript-Ready**: Built with TypeScript and modern Deno best practices
- **Zero Configuration**: No build step, no package.json, just run

## Prerequisites

- [Deno](https://deno.com/) 2.0 or higher
- [Claude CLI](https://github.com/anthropics/claude-cli) installed and configured
- A Dart Flutter/web project to analyze

## Installation

No installation needed! Deno will automatically download dependencies on first run.

```bash
# Clone the repository
git clone https://github.com/yourusername/dart-to-ts-analyzer
cd dart-to-ts-analyzer

# Run the analyzer (dependencies auto-install)
deno task start [path-to-dart-project]
```

## 🎯 Quick Start

### Basic Analysis

```bash
# Analyze a Dart project (defaults to ./frontend_release_dashboard)
deno task start

# Analyze a specific project
deno task start /path/to/dart/project

# Run with comprehensive analysis (slower but more thorough)
deno task start /path/to/dart/project --comprehensive
```

### CLI Options

- `-c, --comprehensive`: Use comprehensive analysis mode
- `-m, --model <model>`: Choose Claude model: `sonnet` (default) or `opus`
- `-v, --verbose`: Show detailed progress and API usage
- `--no-cache`: Don't use cached responses
- `-t, --timeout <seconds>`: Set timeout for analysis (default: 600)

### Development Commands

```bash
# Run with file watching (auto-restart on changes)
deno task dev [path-to-dart-project]

# Run tests
deno task test

# Run tests with file watching
deno task test:watch

# Lint the code
deno task lint

# Format the code
deno task fmt

# Type check and verify code quality
deno task check

# Direct execution with custom permissions
deno run --allow-read --allow-write --allow-env --allow-net --allow-run main.ts
```

## 📦 Project Structure

```
├── main.ts                 # Entry point and CLI setup
├── deps.ts                 # Centralized dependencies (Deno convention)
├── deno.json              # Deno configuration and tasks
├── src/
│   ├── analyzer.ts        # Core analysis logic
│   ├── scanner.ts         # Dart project scanner
│   ├── extractor.ts       # Code extraction utilities
│   ├── prompts.ts         # Claude AI prompts
│   ├── claude-cli.ts      # Claude CLI integration (Deno subprocess)
│   ├── services/
│   │   └── analysis-service.ts  # Analysis orchestration
│   ├── types/
│   │   ├── index.ts       # Type definitions
│   │   ├── analysis.ts    # Analysis-specific types
│   │   └── claude.ts      # Claude API types
│   └── utils/
│       ├── file-operations.ts  # Deno file system utilities
│       ├── error-handling.ts   # Error handling utilities
│       └── claude-utils.ts     # Claude-specific utilities
├── test/
│   └── claude-integration.test.ts  # Integration tests
└── analysis/              # Generated analysis output
    ├── raw/              # Raw categorization data
    ├── functional/       # Functional analysis JSON
    └── report.md         # Human-readable report
```

## 🔒 Permissions

This application requires the following Deno permissions:

| Permission | Reason |
|------------|--------|
| `--allow-read` | Read project files and cache |
| `--allow-write` | Write analysis results and cache |
| `--allow-env` | Access environment variables |
| `--allow-net` | Claude CLI may need network access |
| `--allow-run` | Execute Claude CLI subprocess |

## 📊 Output

The analyzer generates three main outputs in the `analysis/` directory:

### 1. file-categories.json
Raw categorization of Dart files by type (components, services, state, etc.)

### 2. analysis.json
Structured functional analysis including:
- Application purpose
- Core features
- User workflows
- State management patterns
- Data flow
- Dependencies and TypeScript equivalents

### 3. report.md
Human-readable Markdown report with comprehensive analysis

## 🔄 Migration from Node.js

This project has been migrated from Node.js to Deno with significant improvements:

### Key Improvements

- **Zero Configuration TypeScript**: No tsconfig.json needed
- **Built-in Toolchain**: Integrated linter, formatter, and test runner
- **Better Security**: Explicit permission model
- **Simplified Dependencies**: No node_modules, using import maps
- **Modern ES Modules**: No CommonJS complications
- **Native Subprocess API**: Better process management
- **Web Standards**: Using Web Crypto API and other standards

### Technical Changes

| Component | Node.js Version | Deno Version |
|-----------|----------------|--------------|
| Entry Point | `src/index.ts` | `main.ts` |
| Dependencies | `package.json` + `node_modules` | `deps.ts` + `deno.json` |
| CLI Framework | Commander | Cliffy |
| File Operations | Node.js fs module | Deno APIs |
| Process Management | child_process | Deno.Command |
| Testing | Custom runner | Deno's built-in test runner |
| Crypto | Node crypto module | Web Crypto API |
| Path Operations | Node path module | @std/path |

## 🧪 Testing

The test suite uses Deno's built-in test runner with BDD syntax:

```bash
# Run all tests
deno task test

# Run tests with coverage
deno test --coverage

# Run specific test file
deno test test/claude-integration.test.ts
```

## 🌐 Dart Web Pattern Support

The analyzer recognizes and converts these Dart web patterns:

### Web Application Entry Points
```dart
// web/main.dart
import 'dart:html' as html;
void main() {
  final app = MyWebApp();
  html.querySelector('#app')?.append(app.element);
}
```

### HTTP Services
```dart
// Converts w_transport to axios/fetch patterns
class ApiService {
  Future<Response> get(String endpoint) async {
    // Analysis identifies HTTP patterns
  }
}
```

### State Management
```dart
// Redux pattern analysis and conversion guidance
final store = Store<AppState>(
  appReducer,
  initialState: AppState(),
);
```

## 🛠️ Configuration

The `deno.json` file contains all configuration:

```json
{
  "tasks": {
    "start": "deno run --allow-read --allow-write --allow-env --allow-net --allow-run main.ts",
    "dev": "deno run --watch --allow-read --allow-write --allow-env --allow-net --allow-run main.ts",
    "test": "deno test --allow-read --allow-write --allow-env"
  },
  "imports": {
    "@std/path": "jsr:@std/path@^1.0.0",
    "@cliffy/command": "jsr:@cliffy/command@^1.0.0"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests: `deno task test`
5. Check code quality: `deno task check`
6. Commit your changes
7. Push to the branch
8. Open a Pull Request

### Development Guidelines

- Follow Deno style guide
- Add tests for new features
- Update documentation
- Use conventional commits

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/dart-to-ts-analyzer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/dart-to-ts-analyzer/discussions)

## 🙏 Acknowledgments

- Built with [Deno](https://deno.com/) - The secure JavaScript/TypeScript runtime
- CLI powered by [Cliffy](https://cliffy.io/) - Command line framework for Deno
- AI analysis by [Claude](https://claude.ai/) - Anthropic's AI assistant
- Originally migrated from Node.js to demonstrate Deno's modern capabilities

---

**Made with ❤️ using Deno's modern runtime**