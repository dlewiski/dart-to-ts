import { LLMPrompt } from '../types.js';

export class PromptBuilder {
  buildConversionPrompt(dartCode: string, filePath: string): LLMPrompt {
    return {
      system: `You are an expert Dart to TypeScript converter. Your goal is to:
1. Convert Dart code to idiomatic TypeScript
2. Eliminate technical debt and unnecessary complexity
3. Use modern TypeScript features and patterns
4. Remove or replace outdated dependencies
5. Ensure type safety without using 'any' where possible

Guidelines:
- Prefer interfaces over classes for data structures
- Use async/await instead of callbacks
- Leverage TypeScript's type system fully
- Remove unnecessary null checks when TypeScript's strict mode handles it
- Use optional chaining and nullish coalescing
- Prefer const assertions and readonly modifiers
- Use template literals for string formatting
- Apply destructuring where it improves readability`,
      user: `Convert the following Dart code to modern TypeScript.
File: ${filePath}

Dart Code:
\`\`\`dart
${dartCode}
\`\`\`

Provide the TypeScript equivalent, eliminating any technical debt and using modern patterns.`,
      context: {
        filePath,
        language: 'typescript',
        targetVersion: 'ES2022',
      },
    };
  }

  buildPackageDecisionPrompt(packageName: string, usage: any): LLMPrompt {
    return {
      system: `You are an expert in dependency management and code modernization.
Your task is to analyze package usage and recommend whether to:
1. Eliminate - Remove completely (not needed)
2. Inline - Extract only the used functions
3. Replace - Use a modern alternative
4. Preserve - Keep the dependency

Consider:
- How much of the package is actually used
- Whether native TypeScript/JavaScript can replace it
- Modern alternatives available
- Maintenance burden of keeping the dependency`,
      user: `Analyze the usage of package "${packageName}":

Usage Information:
- Functions used: ${usage.actuallyUsed.functions.join(', ') || 'none'}
- Classes used: ${usage.actuallyUsed.classes.join(', ') || 'none'}
- Constants used: ${usage.actuallyUsed.constants.join(', ') || 'none'}
- Types used: ${usage.actuallyUsed.types.join(', ') || 'none'}
- Complexity: ${usage.complexity}
- Lines of code: ${usage.linesOfCode}

Recommend an action (eliminate/inline/replace/preserve) and explain why.`,
      context: {
        packageName,
        usage,
      },
    };
  }

  buildCodeEnhancementPrompt(typescript: string): LLMPrompt {
    return {
      system: `You are a TypeScript expert focused on code quality and modernization.
Your task is to enhance TypeScript code by:
1. Improving type safety
2. Using modern ECMAScript features
3. Following best practices
4. Removing code smells
5. Optimizing performance where possible

Do not change the functionality, only improve the implementation.`,
      user: `Enhance the following TypeScript code to be more modern and maintainable:

\`\`\`typescript
${typescript}
\`\`\`

Provide the improved version with better types, modern syntax, and cleaner patterns.`,
      context: {
        language: 'typescript',
        rules: ['strict', 'no-any', 'prefer-const'],
      },
    };
  }

  buildTechDebtAnalysisPrompt(code: string, patterns: any[]): LLMPrompt {
    return {
      system: `You are a code quality expert specializing in identifying and fixing technical debt.
Analyze code for:
1. Code smells and anti-patterns
2. Performance issues
3. Security vulnerabilities
4. Maintainability problems
5. Outdated practices

Provide specific, actionable recommendations.`,
      user: `Analyze the following code for technical debt:

\`\`\`typescript
${code}
\`\`\`

Known issues found:
${patterns.map(p => `- ${p.description}: ${p.occurrences} occurrences`).join('\n')}

Provide recommendations to eliminate this technical debt.`,
      context: {
        patterns,
        severity: patterns.map(p => p.severity),
      },
    };
  }

  buildInliningPrompt(packageName: string, functionName: string): LLMPrompt {
    return {
      system: `You are an expert at extracting and simplifying utility functions.
Your task is to:
1. Create a standalone TypeScript implementation
2. Remove unnecessary dependencies
3. Simplify the logic where possible
4. Ensure the function is self-contained
5. Add proper TypeScript types`,
      user: `Create a standalone TypeScript implementation of the "${functionName}" utility from the "${packageName}" package.

The function should:
- Be self-contained (no external dependencies)
- Use modern TypeScript syntax
- Include proper type annotations
- Include JSDoc comments
- Handle edge cases

Provide a complete, production-ready implementation.`,
      context: {
        packageName,
        functionName,
        targetEnvironment: 'node',
      },
    };
  }

  buildValidationPrompt(original: string, converted: string): LLMPrompt {
    return {
      system: `You are a code validation expert. Your task is to verify that converted code maintains the same functionality as the original.
Check for:
1. Semantic equivalence
2. Correct type conversions
3. Preserved business logic
4. Proper error handling
5. No missing functionality`,
      user: `Validate that the TypeScript conversion preserves the functionality of the original Dart code:

Original Dart:
\`\`\`dart
${original}
\`\`\`

Converted TypeScript:
\`\`\`typescript
${converted}
\`\`\`

Identify any potential issues or missing functionality.`,
      context: {
        conversionType: 'dart-to-typescript',
        strictMode: true,
      },
    };
  }
}
