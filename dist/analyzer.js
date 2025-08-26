"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisPrompts = void 0;
exports.analyzeFunctionality = analyzeFunctionality;
// Prompts designed for Claude to extract functional understanding
exports.analysisPrompts = {
    appFunctionality: (code) => `
Analyze this Dart application entry point and return a JSON object with:
1. appPurpose: One sentence describing what this application does
2. initialization: Key setup steps performed on app start
3. services: What services/data sources are configured

Code:
${code}

Return ONLY valid JSON.`,
    stateStructure: (code) => `
Analyze this Redux state management code and return a JSON object with:
1. stateShape: The complete state structure
2. keyActions: List of main user actions (5-10 most important)
3. dataTransformations: How state changes in response to actions

Code:
${code}

Return ONLY valid JSON.`,
    componentFunctionality: (code) => `
Analyze these React/OverReact components and return a JSON object with:
1. userFeatures: What can users do with these components?
2. dataDisplayed: What information is shown to users?
3. interactions: User interactions handled (clicks, inputs, etc.)

Code:
${code}

Return ONLY valid JSON.`,
    serviceLayer: (code) => `
Analyze this service layer code and return a JSON object with:
1. dataSource: Where does data come from (APIs, endpoints)?
2. operations: What operations are performed?
3. dataFormat: Structure of data being fetched/sent

Code:
${code}

Return ONLY valid JSON.`,
    dependencies: (pubspec) => `
Analyze this pubspec.yaml and return a JSON object with:
1. coreDependencies: List the 5-10 most important Dart packages
2. tsEquivalents: For each, suggest TypeScript equivalent:
   - over_react -> react
   - redux -> @reduxjs/toolkit
   - built_value -> TypeScript interfaces
   - etc.

Content:
${pubspec}

Return ONLY valid JSON.`
};
// Mock LLM call - in real implementation, this would call Claude API
async function analyzeFunctionality(chunks) {
    console.log('Analyzing', chunks.length, 'code chunks...');
    // This is where you would make actual API calls to Claude
    // For now, returning a structured template
    return {
        appPurpose: 'Dashboard displaying deployed versions of frontend applications across environments',
        coreFeatures: [
            'Real-time version display across multiple environments',
            'Package dependency tracking',
            'Search and filter by package name',
            'Bookmark frequently used searches',
            'Toggle between card and table view'
        ],
        userWorkflows: [
            {
                name: 'Search for Package',
                steps: [
                    'User types in search box',
                    'Redux action dispatched',
                    'State filtered by query',
                    'UI updates to show matching packages'
                ]
            },
            {
                name: 'View Dependencies',
                steps: [
                    'User clicks on package card',
                    'Accordion expands',
                    'Dependencies fetched if not cached',
                    'Dependency list displayed'
                ]
            }
        ],
        dataFlow: {
            sources: ['FEWS API', 'Dependencies Service', 'Local Storage'],
            transformations: ['Version parsing', 'Dependency resolution', 'Filter application'],
            destinations: ['Card components', 'Table view', 'Local storage cache']
        },
        stateManagement: {
            pattern: 'Redux with middleware',
            stateShape: {
                query: 'string',
                deploys: 'Map<Deploy, DeployState>',
                bookmarks: 'List<Bookmark>',
                recentSearches: 'List<string>',
                viewMode: 'cards | table'
            },
            keyActions: [
                'SET_QUERY',
                'FETCH_VERSIONS',
                'ADD_BOOKMARK',
                'TOGGLE_VIEW'
            ],
            selectors: [
                'filteredPackages',
                'appVersionSelector',
                'packagesSelector'
            ]
        },
        businessLogic: {
            rules: [
                'Version comparison using semantic versioning',
                'Environment-specific version display',
                'Dependency resolution and filtering'
            ],
            validations: [
                'Valid package names',
                'Version format validation',
                'Bookmark uniqueness'
            ],
            calculations: [
                'Version difference detection',
                'Dependency graph resolution'
            ]
        },
        dependencies: {
            dart: [
                'over_react',
                'redux',
                'built_value',
                'w_transport',
                'unify_ui'
            ],
            tsEquivalents: {
                'over_react': 'react',
                'redux': '@reduxjs/toolkit',
                'built_value': 'TypeScript interfaces + immer',
                'w_transport': 'axios',
                'unify_ui': 'Custom component library or MUI'
            }
        }
    };
}
