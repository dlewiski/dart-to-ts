# 🚀 Dart to TypeScript Converter

A powerful tool for converting Dart code to modern TypeScript while eliminating technical debt and unnecessary dependencies. This converter doesn't just translate syntax - it modernizes your codebase by removing obsolete packages, inlining simple utilities, and applying current best practices.

## ✨ Key Features

- **🎯 Smart Package Elimination**: Automatically identifies and removes unnecessary Dart-specific packages
- **📦 Utility Inlining**: Extracts and inlines simple utilities instead of maintaining dependencies
- **🔄 Modern Replacements**: Replaces outdated packages with modern TypeScript alternatives
- **🧹 Tech Debt Reduction**: Identifies and fixes common code smells and anti-patterns
- **🤖 AI-Powered Enhancement**: Optional LLM integration for intelligent code improvements
- **📊 Comprehensive Reports**: Detailed migration guides and technical debt analysis

## 🎯 Philosophy

This tool takes an aggressive approach to modernization:

1. **Eliminate > Replace > Preserve**: Remove what's not needed, replace what has better alternatives, preserve only what's essential
2. **Inline Simple Code**: Why maintain a dependency for 10 lines of code?
3. **Embrace Native Features**: Use TypeScript/JavaScript native features over third-party libraries
4. **Reduce Complexity**: Simpler code is better code

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and PNPM
- AWS Account (optional, for AI features)
- Dart project to convert

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dart-to-ts.git
cd dart-to-ts

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# (Optional) Configure AWS credentials for AI features
# Edit .env and add your AWS credentials
```

### Basic Usage

```bash
# 1. Analyze your Dart project first
pnpm run analyze /path/to/dart/project

# 2. Convert the project
pnpm run convert /path/to/dart/project

# 3. Generate reports
pnpm run report
```

## 📋 Commands

### `pnpm run analyze <path>`

Analyzes a Dart project for package usage and technical debt.

**Options:**
- `-o, --output <path>` - Output directory for analysis (default: `./decisions`)
- `--no-tech-debt` - Skip technical debt analysis
- `--no-packages` - Skip package analysis
- `-v, --verbose` - Verbose output

**Example:**
```bash
pnpm run analyze ~/my-dart-app --output ./analysis
```

### `pnpm run convert <path>`

Converts Dart files to TypeScript with intelligent optimization.

**Options:**
- `-o, --output <path>` - Output directory (default: `./output`)
- `--aggressive` - Enable aggressive optimization
- `--no-modernize` - Skip modernization patterns
- `--no-llm` - Disable AI enhancement
- `--dry-run` - Analyze without converting
- `--concurrency <n>` - Max parallel conversions (default: 5)

**Example:**
```bash
pnpm run convert ~/my-dart-app --aggressive --output ./typescript-app
```

### `pnpm run report`

Generates comprehensive migration reports.

**Options:**
- `-d, --decisions <path>` - Decisions directory (default: `./decisions`)
- `-f, --format <type>` - Output format: json|markdown|html (default: markdown)
- `--compare <before>` - Compare with previous analysis

**Example:**
```bash
pnpm run report --format html
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# AWS Configuration (for AI features)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Claude Model Selection
CLAUDE_MODEL=anthropic.claude-3-sonnet-20240229-v1:0

# Performance Settings
MAX_CONCURRENCY=5
MAX_TOKENS=4096
TEMPERATURE=0.3
```

## 📦 Package Strategy

The converter uses intelligent strategies for different package types:

### ❌ Eliminated Packages
Packages completely removed as they're not needed in TypeScript:
- `dart_dev`, `build_runner` - Build tools not needed
- `built_value_generator` - Code generation not required
- `over_react_format` - Formatting handled by Prettier

### 📥 Inlined Packages
Simple utilities extracted and inlined:
- `w_common` - Disposable patterns
- `w_flux` - Simple flux utilities
- `fluri` - URI building helpers

### 🔄 Replaced Packages
Modern alternatives used instead:
- `over_react` → `react`
- `redux` → `@reduxjs/toolkit`
- `w_transport` → `axios`
- `built_value` → TypeScript interfaces
- `built_collection` → Native arrays/maps

### ✅ Preserved Packages
Complex packages that need manual review:
- `unify_ui` - Internal UI libraries
- Domain-specific packages

## 📊 Reports Generated

After conversion, you'll get:

1. **📈 Tech Debt Report** (`tech-debt-report.md`)
   - Identified code smells
   - Severity breakdown
   - Specific fixes recommended

2. **📦 Package Report** (`package-report.md`)
   - Package migration decisions
   - Dependency reduction metrics
   - Replacement mappings

3. **📚 Migration Guide** (`migration-guide.md`)
   - Step-by-step migration instructions
   - Code pattern replacements
   - Testing recommendations

## 🎯 Example Transformations

### Built Value → TypeScript Interface

**Before (Dart):**
```dart
abstract class User implements Built<User, UserBuilder> {
  String get name;
  int get age;
  BuiltList<String> get tags;
}
```

**After (TypeScript):**
```typescript
interface User {
  readonly name: string;
  readonly age: number;
  readonly tags: ReadonlyArray<string>;
}
```

### Over React → React

**Before (Dart):**
```dart
import 'package:over_react/over_react.dart';

@Factory()
UiFactory<ButtonProps> Button = _$Button;

@Component()
class ButtonComponent extends UiComponent<ButtonProps> {
  @override
  render() {
    return Dom.button()..onClick = props.onClick)(
      props.children
    );
  }
}
```

**After (TypeScript):**
```typescript
import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ onClick, children }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

## 🏗️ Architecture

```
dart-to-ts/
├── src/
│   ├── analyzer/        # Code analysis and pattern detection
│   ├── converter/       # Core conversion logic
│   ├── intelligence/    # AI/LLM integration
│   ├── reports/         # Report generation
│   └── config/          # Package mappings and settings
├── scripts/             # CLI tools
├── tests/              # Test suite
└── output/             # Generated TypeScript code
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test -- --coverage
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Adding Package Mappings

Edit `src/config/package-mappings.ts` to add new package strategies:

```typescript
export const packageStrategies = {
  eliminate: {
    'your_package': true,
  },
  replace: {
    'old_package': {
      replacement: 'new-package',
      reason: 'Better alternative available'
    }
  }
};
```

## 📈 Performance

- **Parallel Processing**: Converts multiple files concurrently
- **Incremental Conversion**: Supports file-by-file migration
- **Memory Efficient**: Streams large projects
- **Smart Caching**: Reuses analysis results

## 🐛 Troubleshooting

### AWS Credentials Not Working
```bash
# Test AWS credentials
aws sts get-caller-identity

# Ensure Bedrock access is enabled in your AWS account
```

### Out of Memory Errors
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=8192" pnpm run convert large-project/
```

### Conversion Errors
- Check `decisions/conversion-decisions.json` for detailed error logs
- Run with `--no-llm` to disable AI features and use basic conversion
- Use `--dry-run` to preview changes without modifying files

## 📚 Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Dart to JavaScript Migration Guide](https://dart.dev/web/js-interop)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need to modernize legacy Dart codebases
- Built with TypeScript, Node.js, and AWS Bedrock
- Special thanks to the open-source community

---

**Note**: This tool is designed for aggressive modernization. Always review the converted code and test thoroughly before deploying to production.