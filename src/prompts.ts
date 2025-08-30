/**
 * Optimized prompts for Claude CLI code analysis
 * Each prompt is designed to return structured JSON data
 */

import { type SchemaDefinition } from './types/index.ts';

export const analysisPrompts = {
  /**
   * Analyze the main application entry point
   */
  appFunctionality: (code: string) => `
Analyze this Dart application entry point and identify its core functionality.

Return a JSON object with EXACTLY this structure:
{
  "appPurpose": "one sentence describing what this application does",
  "initialization": ["key setup step 1", "key setup step 2"],
  "services": ["service/data source 1", "service/data source 2"],
  "routing": "routing approach used (if any)",
  "dependencies": ["main dependency 1", "main dependency 2"]
}

Code to analyze:
${code}

Return ONLY the JSON object, no explanation.`,

  /**
   * Analyze Redux/state management patterns
   */
  stateStructure: (code: string) => `
Analyze this Redux/state management code and extract the state structure.

Return a JSON object with EXACTLY this structure:
{
  "stateShape": {
    "field1": "type description",
    "field2": "type description"
  },
  "keyActions": ["ACTION_TYPE_1", "ACTION_TYPE_2"],
  "dataTransformations": ["transformation 1", "transformation 2"],
  "selectors": ["selector1", "selector2"],
  "middleware": ["middleware type 1", "middleware type 2"]
}

Code to analyze:
${code}

Return ONLY the JSON object, no explanation.`,

  /**
   * Analyze UI components and their functionality
   */
  componentFunctionality: (code: string) => `
Analyze these React/OverReact UI components and identify user-facing features.

Return a JSON object with EXACTLY this structure:
{
  "userFeatures": ["what users can do 1", "what users can do 2"],
  "dataDisplayed": ["information shown 1", "information shown 2"],
  "interactions": ["click handlers", "form inputs", "other events"],
  "componentHierarchy": ["parent -> child relationships"],
  "props": ["key prop 1", "key prop 2"]
}

Code to analyze:
${code}

Return ONLY the JSON object, no explanation.`,

  /**
   * Analyze service layer and API interactions
   */
  serviceLayer: (code: string) => `
Analyze this service layer code and identify data flow patterns.

Return a JSON object with EXACTLY this structure:
{
  "dataSource": ["API endpoint 1", "API endpoint 2"],
  "operations": ["GET requests", "POST requests", "other operations"],
  "dataFormat": {
    "request": "request structure description",
    "response": "response structure description"
  },
  "errorHandling": ["error type 1", "error type 2"],
  "caching": "caching strategy if any"
}

Code to analyze:
${code}

Return ONLY the JSON object, no explanation.`,

  /**
   * Analyze dependencies and suggest TypeScript equivalents
   */
  dependencies: (pubspecContent: string) => `
Analyze this pubspec.yaml and map Dart packages to TypeScript equivalents.

Return a JSON object with EXACTLY this structure:
{
  "coreDependencies": ["package1", "package2"],
  "tsEquivalents": {
    "dart_package": "typescript_equivalent",
    "over_react": "react",
    "redux": "@reduxjs/toolkit",
    "built_value": "immer + TypeScript interfaces"
  },
  "missingEquivalents": ["packages without clear TS equivalent"],
  "customImplementations": ["features that need custom implementation"]
}

Pubspec content:
${pubspecContent}

Return ONLY the JSON object, no explanation.`,

  /**
   * Extract business logic and validation rules
   */
  businessLogic: (code: string) => `
Analyze this code and extract business logic, rules, and validations.

Return a JSON object with EXACTLY this structure:
{
  "rules": ["business rule 1", "business rule 2"],
  "validations": ["validation check 1", "validation check 2"],
  "calculations": ["calculation/formula 1", "calculation/formula 2"],
  "conditionalLogic": ["if X then Y", "when Z happens"],
  "dataConstraints": ["constraint 1", "constraint 2"]
}

Code to analyze:
${code}

Return ONLY the JSON object, no explanation.`,

  /**
   * Comprehensive analysis combining all aspects
   */
  comprehensiveAnalysis: (
    chunks: Array<{ category: string; code: string }>,
  ) => {
    const chunkSections = chunks
      .map((chunk) => `[${chunk.category.toUpperCase()}]\n${chunk.code}`)
      .join('\n\n---\n\n');

    return `
Analyze this Dart application codebase and provide a comprehensive functional understanding.

Return a JSON object with EXACTLY this structure:
{
  "summary": {
    "appPurpose": "main application purpose",
    "targetUsers": "who uses this app",
    "coreValue": "what value it provides"
  },
  "features": [
    {
      "name": "feature name",
      "description": "what it does",
      "userSteps": ["step 1", "step 2"]
    }
  ],
  "architecture": {
    "pattern": "architectural pattern (MVC, Redux, etc)",
    "layers": ["presentation", "business", "data"],
    "keyComponents": ["component 1", "component 2"]
  },
  "dataFlow": {
    "sources": ["data source 1"],
    "processing": ["transformation 1"],
    "storage": "how data is stored"
  },
  "dependencies": {
    "critical": ["must-have dependency 1"],
    "replaceable": ["can be swapped dependency 1"]
  },
  "migrationConsiderations": [
    "important consideration 1",
    "important consideration 2"
  ]
}

Code sections to analyze:
${chunkSections}

Return ONLY the JSON object, no explanation.`;
  },
};

/**
 * Create a custom prompt with a specific schema
 */
export function createCustomPrompt(
  instruction: string,
  code: string,
  schema: SchemaDefinition,
): string {
  return `
${instruction}

Return a JSON object matching EXACTLY this schema:
${JSON.stringify(schema, null, 2)}

Code to analyze:
${code}

Return ONLY the JSON object, no explanation or markdown formatting.`;
}
