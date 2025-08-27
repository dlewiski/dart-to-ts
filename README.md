# Dart to TypeScript Web Transpiler v2

A sophisticated analyzer and converter specifically designed for **Dart web applications and services** to TypeScript. This tool intelligently analyzes Dart web codebases and provides comprehensive insights for TypeScript conversion, supporting modern Dart web development patterns including dart:html, web services, and server-side Dart applications.

**⚠️ Important**: This tool is specifically designed for Dart web applications and services only. It does **not** support Flutter mobile/desktop applications.

## 🌐 Web-Focused Features

- **Dart Web App Analysis**: Deep understanding of dart:html, DOM manipulation, and web-specific APIs
- **Service Layer Conversion**: REST APIs, HTTP services, and server-side Dart applications
- **State Management Transpilation**: Redux patterns, state management, and data flow analysis
- **Web Component Analysis**: Over_React components and web UI patterns
- **Dependency Mapping**: Intelligent mapping of Dart web packages to TypeScript equivalents
- **Build System Integration**: Analysis of web compilation and bundling requirements

## 📦 Installation

### Prerequisites

- **Node.js 18+** and **pnpm** for the TypeScript analyzer
- **Dart SDK 2.11+** for analyzing Dart web projects
- **Claude CLI** for AI-powered code analysis

### Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/dart-to-ts-v2.git
cd dart-to-ts-v2

# Install TypeScript analyzer dependencies
pnpm install

# Build the analyzer
pnpm build
```

### Install Claude CLI (Required)

This tool requires Claude CLI for intelligent code analysis:

```bash
# Install Claude CLI (follow official Anthropic documentation)
# Ensure 'claude' command is available in your PATH
```

## 🚀 Quick Start

### Analyze a Dart Web Project

```bash
# Analyze the included sample dashboard
pnpm analyze

# Analyze a custom Dart web project
pnpm build && node dist/src/index.js /path/to/your/dart/web/project

# Run with comprehensive analysis (slower, more detailed)
pnpm build && node dist/src/index.js /path/to/dart/project --comprehensive

# Use verbose output for debugging
pnpm build && node dist/src/index.js /path/to/dart/project --verbose
```

### Example: Analyzing a Dart Web Service

```dart
// Example Dart web service that the analyzer can process
import 'dart:html' as html;
import 'dart:convert';
import 'package:w_transport/w_transport.dart' as transport;

class ApiService {
  static const String baseUrl = 'https://api.example.com';
  
  Future<Map<String, dynamic>> fetchUserData(String userId) async {
    final request = transport.Http.get()
      ..uri = Uri.parse('$baseUrl/users/$userId')
      ..headers = {'Content-Type': 'application/json'};
    
    final response = await request.send();
    return json.decode(response.body.asString());
  }
  
  void updateDOM(Map<String, dynamic> userData) {
    final userElement = html.querySelector('#user-info');
    if (userElement != null) {
      userElement.text = 'Welcome, ${userData['name']}!';
    }
  }
}
```

The analyzer will identify web-specific patterns and suggest TypeScript equivalents:

```typescript
// Generated TypeScript equivalent suggestions
import axios from 'axios';

class ApiService {
  private static readonly baseUrl = 'https://api.example.com';
  
  async fetchUserData(userId: string): Promise<Record<string, any>> {
    const response = await axios.get(`${ApiService.baseUrl}/users/${userId}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }
  
  updateDOM(userData: Record<string, any>): void {
    const userElement = document.querySelector('#user-info');
    if (userElement) {
      userElement.textContent = `Welcome, ${userData.name}!`;
    }
  }
}
```

## 📖 API Documentation

### Core Analyzer Function

```typescript
import { analyzeDartApp } from 'dart-to-ts-v2';

// Analyze a Dart web project
const analysis = await analyzeDartApp('/path/to/dart/web/project', {
  comprehensive: false,    // Use chunk-by-chunk analysis (faster)
  verbose: true,          // Show detailed progress
  model: 'sonnet',        // Claude model: 'sonnet' or 'opus'
  timeout: 600000         // Analysis timeout in milliseconds
});

console.log(analysis.appPurpose);
console.log(analysis.dependencies.tsEquivalents);
```

### File Scanner

The scanner categorizes Dart files by their role in web applications:

```typescript
import { scanDartProject } from './src/scanner';

const categories = scanDartProject('./dart-web-project');
console.log(categories);
// Output:
// {
//   components: ['lib/src/ui/components/user_panel.dart'],
//   state: ['lib/src/redux/actions.dart', 'lib/src/redux/reducers.dart'],
//   services: ['lib/src/services/api_service.dart'],
//   utils: ['lib/src/utils/date_utils.dart'],
//   entry: 'web/main.dart',
//   models: ['lib/src/models/user.dart']
// }
```

### Code Extractor

Extract and analyze specific code patterns from Dart web applications:

```typescript
import { extractCodeForAnalysis } from './src/extractor';

const chunks = await extractCodeForAnalysis('./dart-project', categories);
// Returns structured code chunks ready for AI analysis
```

## 🏗️ Architecture

### Project Structure

```plaintext
src/
├── index.ts           # Main CLI entry point and orchestrator
├── scanner.ts         # Dart file discovery and categorization  
├── extractor.ts       # Code chunk extraction for analysis
├── analyzer.ts        # AI-powered functional analysis
├── claude-cli.ts      # Claude AI integration
├── prompts.ts         # Analysis prompt templates
├── types/
│   ├── analysis.ts    # Analysis result types
│   ├── claude.ts      # Claude API types
│   └── index.ts       # Type exports
└── utils/
    └── claude-utils.ts # Claude API utilities and caching

test/                   # Integration and unit tests
frontend_release_dashboard/  # Sample Dart web application
```

### Analysis Flow

1. **File Scanning**: Discovers and categorizes Dart files by role (components, services, state, etc.)
2. **Code Extraction**: Extracts relevant code chunks for analysis
3. **AI Analysis**: Uses Claude to understand functionality, patterns, and dependencies
4. **Report Generation**: Creates comprehensive analysis reports with TypeScript conversion guidance

## 🔧 Configuration

Create a `dart-to-ts.config.js` file for custom analysis settings:

```javascript
module.exports = {
  // Analysis options
  analysis: {
    includeTests: false,
    analyzeComments: true,
    generateReport: true,
    timeout: 600000  // 10 minutes
  },
  
  // Web-specific mappings for Dart packages to TypeScript
  webDependencyMapping: {
    'dart:html': 'DOM API',
    'over_react': 'react + react-dom',
    'w_transport': 'axios',
    'built_value': 'TypeScript interfaces + immer',
    'redux': '@reduxjs/toolkit'
  },
  
  // Files to ignore during analysis
  ignore: [
    '**/*.g.dart',        // Generated files
    '**/generated/**',    // Generated directories
    '**/*.test.dart'      // Test files (optional)
  ]
};
```

## 🧪 Testing

Run the test suite to verify analyzer functionality:

```bash
# Run integration tests
pnpm test

# Run with build verification
pnpm check

# Lint and format code
pnpm lint
pnpm format
```

### Test Structure

```plaintext
test/
└── claude-integration.test.ts  # Claude CLI integration tests
```

The test suite includes:

- Basic Claude prompt execution
- Dart code analysis with JSON responses
- Prompt template validation
- JSON response cleaning and parsing

## 🌐 Dart Web Patterns Supported

### Web Application Entry Points

```dart
// web/main.dart
import 'dart:html' as html;
import 'package:over_react/react_dom.dart' as react_dom;

Future<void> main() async {
  final app = MyWebApp();
  react_dom.render(app.render(), html.querySelector('#app'));
}
```

### HTTP Services and APIs

```dart
// lib/src/services/http_service.dart
import 'package:w_transport/w_transport.dart' as transport;

class HttpService {
  Future<Response> get(String endpoint) async {
    final request = transport.Http.get()..uri = Uri.parse(endpoint);
    return await request.send();
  }
}
```

### State Management with Redux

```dart
// lib/src/redux/store.dart
import 'package:redux/redux.dart';

final store = Store<AppState>(
  appReducer,
  initialState: AppState(),
  middleware: [
    fetchDataMiddleware,
    loggingMiddleware,
  ],
);
```

### DOM Manipulation

```dart
// lib/src/utils/dom_utils.dart
import 'dart:html' as html;

void updateElement(String selector, String content) {
  final element = html.querySelector(selector);
  element?.text = content;
}
```

## 🤝 Contributing

We welcome contributions focused on improving Dart web application analysis!

### Development Setup

1. **Fork and clone** the repository
2. **Install dependencies**: `pnpm install`
3. **Build the project**: `pnpm build`
4. **Run tests**: `pnpm test`
5. **Analyze sample project**: `pnpm analyze`

### Code Style Guidelines

- **TypeScript**: Use strict mode with comprehensive type definitions
- **ESLint + Prettier**: Follow configured linting and formatting rules
- **Testing**: Add tests for new analysis capabilities
- **Documentation**: Update README for new web-specific features

### Commit Convention

```bash
feat(analyzer): add support for dart:js interop analysis
fix(scanner): improve web service file categorization  
docs(readme): add examples for server-side Dart conversion
test(integration): add tests for Redux pattern analysis
```

### Pull Request Process

1. **Create feature branch** from `main`
2. **Implement changes** with comprehensive tests
3. **Run quality checks**: `pnpm check`
4. **Update documentation** for web-specific features
5. **Submit PR** with clear description of web conversion improvements

## 📊 Sample Analysis Output

The analyzer generates comprehensive reports for Dart web projects:

```markdown
# Dart Application Functional Analysis Report

## Application Purpose
A web dashboard application for tracking and displaying software release information

## Core Features
- Configure transport platform for browser
- DOM manipulation and event handling
- HTTP API integration with backend services
- Redux-based state management
- Interactive web components

## Dependency Mapping
- **dart:html** → DOM API + document/window globals
- **over_react** → react + react-dom  
- **w_transport** → axios + fetch API
- **redux** → @reduxjs/toolkit
- **built_value** → TypeScript interfaces + immer

## Conversion Strategy
1. Replace dart:html with native DOM APIs
2. Convert Over_React components to React functional components
3. Implement Redux Toolkit for state management  
4. Use Axios for HTTP transport layer
5. Create TypeScript interfaces for all data models
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & Resources

- **Documentation**: Comprehensive guides for web-specific conversions
- **Issues**: [GitHub Issues](https://github.com/your-username/dart-to-ts-v2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/dart-to-ts-v2/discussions)

### Supported Dart Web Technologies

| Dart Package | TypeScript Equivalent | Analysis Support |
|-------------|---------------------|-----------------|
| `dart:html` | DOM API | ✅ Full |
| `over_react` | React + React DOM | ✅ Full |
| `w_transport` | Axios | ✅ Full |
| `redux` | Redux Toolkit | ✅ Full |
| `built_value` | TypeScript + Immer | ✅ Full |
| `built_collection` | Immutable.js | ✅ Partial |

## 🗺️ Roadmap

- [ ] **Enhanced DOM Analysis**: Deeper dart:html to DOM API conversion patterns
- [ ] **Server-Side Dart**: Analysis support for Dart web servers and API backends  
- [ ] **WebSocket Support**: Analysis of dart:io WebSocket patterns
- [ ] **PWA Conversion**: Progressive Web App feature analysis
- [ ] **Build Integration**: Automated build.yaml to Vite conversion
- [ ] **CSS-in-Dart**: Analysis of inline styling patterns
- [ ] **Web Workers**: Dart Isolate to Web Worker conversion patterns

---

**Focus**: Dart Web Applications & Services → TypeScript  
**Not Supported**: Flutter mobile/desktop applications

Made with ❤️ for the Dart web development community
