/**
 * Integration tests for Claude CLI
 */
import { executeClaude, analyzeCode } from '../src/claude-cli';
import { analysisPrompts } from '../src/prompts';
import { cleanJsonResponse } from '../src/utils/claude-utils';

async function testBasicPrompt() {
  console.log('📝 Test 1: Basic prompt execution');
  
  const result = await executeClaude('What is 15 + 27? Return only the number.', {
    model: 'haiku', // Use faster model for tests
    maxRetries: 1
  });
  
  if (result.error) {
    console.error('❌ Failed:', result.error);
    return false;
  }
  
  const answer = parseInt(result.result.trim());
  const success = answer === 42;
  console.log(`   Result: ${result.result}`);
  console.log(`   ${success ? '✅' : '❌'} Test ${success ? 'passed' : 'failed'}`);
  return success;
}

async function testCodeAnalysis() {
  console.log('\n📝 Test 2: Dart code analysis with JSON response');
  
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
  
  void fetchPackages() async {
    packages = await api.getPackages();
    setState();
  }
}`;
  
  const analysisPrompt = `
Analyze this Dart class and return a JSON object with EXACTLY this structure:
{
  "className": "string",
  "purpose": "string",
  "methods": ["method1", "method2"],
  "properties": ["prop1", "prop2"]
}

Code: ${dartCode}

Return ONLY the JSON object.`;
  
  const result = await analyzeCode(dartCode, analysisPrompt, undefined, {
    model: 'sonnet',
    maxRetries: 2
  });
  
  const success = result && 
                  result.className === 'Dashboard' &&
                  Array.isArray(result.methods) &&
                  Array.isArray(result.properties);
  
  console.log('   Result:', JSON.stringify(result, null, 2));
  console.log(`   ${success ? '✅' : '❌'} Test ${success ? 'passed' : 'failed'}`);
  return success;
}

async function testPromptTemplates() {
  console.log('\n📝 Test 3: Prompt template for dependencies');
  
  const pubspecContent = `
name: frontend_release_dashboard
dependencies:
  over_react: ^4.0.0
  redux: ^5.0.0
  built_value: ^8.0.0
  w_transport: ^3.0.0`;
  
  const prompt = analysisPrompts.dependencies(pubspecContent);
  
  // Just verify the prompt is constructed correctly
  const success = prompt.includes('pubspec.yaml') && 
                  prompt.includes('TypeScript equivalent');
  
  console.log(`   Prompt length: ${prompt.length} characters`);
  console.log(`   ${success ? '✅' : '❌'} Prompt template ${success ? 'valid' : 'invalid'}`);
  return success;
}

async function testJsonCleaning() {
  console.log('\n📝 Test 4: JSON response cleaning');
  
  const messyResponse = `
Here is the JSON you requested:
\`\`\`json
{
  "test": "value",
  "number": 123,
}
\`\`\`
`;
  
  try {
    const cleaned = cleanJsonResponse(messyResponse);
    const success = cleaned.test === 'value' && cleaned.number === 123;
    console.log('   Cleaned:', cleaned);
    console.log(`   ${success ? '✅' : '❌'} JSON cleaning ${success ? 'works' : 'failed'}`);
    return success;
  } catch (e) {
    console.error('   ❌ Failed to clean JSON:', e);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Running Claude CLI Integration Tests\n');
  console.log('=' .repeat(50));
  
  const tests = [
    testBasicPrompt,
    testCodeAnalysis,
    testPromptTemplates,
    testJsonCleaning
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) passed++;
      else failed++;
    } catch (error) {
      console.error(`\n❌ Test crashed:`, error);
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllTests };