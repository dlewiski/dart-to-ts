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
exports.scanDartProject = scanDartProject;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function scanDartProject(projectPath) {
    const categories = {
        components: [],
        state: [],
        services: [],
        utils: [],
        entry: null,
        models: []
    };
    function scanDirectory(dirPath) {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'build') {
                scanDirectory(fullPath);
            }
            else if (item.endsWith('.dart')) {
                categorizeFile(fullPath, categories);
            }
        }
    }
    function categorizeFile(filePath, cats) {
        const relativePath = path.relative(projectPath, filePath);
        // Entry point
        if (relativePath === 'web/main.dart') {
            cats.entry = relativePath;
            return;
        }
        // Categorize by path and filename patterns
        if (relativePath.includes('/components/') || relativePath.includes('_ui.dart')) {
            cats.components.push(relativePath);
        }
        else if (relativePath.includes('/redux/') || relativePath.includes('state') ||
            relativePath.includes('reducer') || relativePath.includes('action')) {
            cats.state.push(relativePath);
        }
        else if (relativePath.includes('/service') || relativePath.includes('_service')) {
            cats.services.push(relativePath);
        }
        else if (relativePath.includes('/utils/') || relativePath.includes('_utils')) {
            cats.utils.push(relativePath);
        }
        else if (relativePath.includes('/models/') || relativePath.includes('.g.dart')) {
            cats.models.push(relativePath);
        }
    }
    scanDirectory(projectPath);
    return categories;
}
