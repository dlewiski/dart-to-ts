/**
 * Integration tests for Claude CLI
 */
import { assertEquals, describe, it } from '../deps.ts';
import { analyzeCode, executeClaude } from '../src/claude-cli.ts';
import { analysisPrompts } from '../src/prompts.ts';
import { cleanJsonResponse } from '../src/utils/claude-utils.ts';

// Test-specific type definitions
interface ClassAnalysisResult {
  className: string;
  methods: string[];
  properties: string[];
}

describe('Claude CLI Integration Tests', () => {
  it('should execute basic prompt', async () => {
    const result = await executeClaude(
      'What is 15 + 27? Return only the number.',
      {
        model: 'sonnet',
        maxRetries: 1,
      },
    );

    assertEquals(result.error, undefined);
    const answer = parseInt(String(result.result).trim());
    assertEquals(answer, 42);
  });

  it('should analyze Dart code and return JSON', async () => {
    const dartCode = `
class Dashboard extends Component {
  String title = 'Release Dashboard';
  List<Package> packages = [];
  
  void render() {
    return Container(
      child: Column(
        children: [
          Text(title),
          PackageList(packages: packages)
        ]
      )
    );
  }
  
  void loadPackages() {
    packages = fetchPackagesFromApi();
  }
}`;

    const prompt = `
Analyze this Dart class and return ONLY a JSON object with this structure:
{
  "className": "string",
  "methods": ["array", "of", "method", "names"],
  "properties": ["array", "of", "property", "names"]
}

Code:
${dartCode}
`;

    const result = await analyzeCode(dartCode, prompt, undefined, {
      model: 'sonnet',
      maxRetries: 1,
    });

    const parsed = result as ClassAnalysisResult;
    assertEquals(typeof parsed, 'object');
    assertEquals(parsed.className, 'Dashboard');
    assertEquals(Array.isArray(parsed.methods), true);
    assertEquals(Array.isArray(parsed.properties), true);
  });

  it('should extract comprehensive analysis from complex code', async () => {
    const complexCode = `
// Entry point
void main() {
  final app = AppShell();
  app.initialize();
  app.run();
}

// State management
class AppState {
  Map<String, dynamic> state = {};
  List<Function> listeners = [];
  
  void setState(String key, dynamic value) {
    state[key] = value;
    notifyListeners();
  }
}

// Component
class UserProfile extends Component {
  final User user;
  
  Widget build() {
    return Card(
      child: Column(
        children: [
          Avatar(user.photoUrl),
          Text(user.name),
          Text(user.email)
        ]
      )
    );
  }
}`;

    const prompt = analysisPrompts.appFunctionality(complexCode);
    const result = await analyzeCode(complexCode, prompt, undefined, {
      model: 'sonnet',
      maxRetries: 1,
    });

    assertEquals(typeof result, 'object');
    assertEquals(result !== null, true);
  });

  it('should clean JSON response correctly', () => {
    const messyJson = `
Here's the analysis:
\`\`\`json
{
  "test": "value",
  "nested": {
    "field": 123
  }
}
\`\`\`
Some trailing text
`;

    const cleaned = cleanJsonResponse(messyJson);
    assertEquals(typeof cleaned, 'object');
    const cleanedObj = cleaned as Record<string, unknown>;
    assertEquals(cleanedObj.test, 'value');
    assertEquals((cleanedObj.nested as Record<string, unknown>).field, 123);
  });
});

// Run tests if this file is executed directly
if (import.meta.main) {
  console.log('🧪 Running Claude CLI Integration Tests...\n');
  // Deno test runner will handle test execution
}
