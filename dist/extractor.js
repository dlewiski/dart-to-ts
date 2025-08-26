"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCodeForAnalysis = extractCodeForAnalysis;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function extractCodeForAnalysis(projectPath, categories) {
    const chunks = [];
    // Extract entry point for app initialization understanding
    if (categories.entry) {
        chunks.push({
            category: 'entry',
            files: [{
                    path: categories.entry,
                    content: readFile(projectPath, categories.entry)
                }],
            context: 'Main entry point - app initialization and setup'
        });
    }
    // Group state management files together for holistic analysis
    if (categories.state.length > 0) {
        chunks.push({
            category: 'state',
            files: categories.state.slice(0, 5).map(file => ({
                path: file,
                content: readFile(projectPath, file)
            })),
            context: 'Redux state management - actions, reducers, selectors'
        });
    }
    // Sample key components for UI functionality understanding
    if (categories.components.length > 0) {
        chunks.push({
            category: 'components',
            files: categories.components.slice(0, 3).map(file => ({
                path: file,
                content: readFile(projectPath, file)
            })),
            context: 'UI components - user interactions and data display'
        });
    }
    // Extract services for data flow understanding
    if (categories.services.length > 0) {
        chunks.push({
            category: 'services',
            files: categories.services.slice(0, 3).map(file => ({
                path: file,
                content: readFile(projectPath, file)
            })),
            context: 'Service layer - API calls and data fetching'
        });
    }
    // Include pubspec.yaml for dependency understanding
    const pubspecPath = path.join(projectPath, 'pubspec.yaml');
    if (fs.existsSync(pubspecPath)) {
        chunks.push({
            category: 'dependencies',
            files: [{
                    path: 'pubspec.yaml',
                    content: fs.readFileSync(pubspecPath, 'utf-8')
                }],
            context: 'Project dependencies and configuration'
        });
    }
    return chunks;
}
function readFile(projectPath, relativePath) {
    const fullPath = path.join(projectPath, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
}
