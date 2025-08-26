import { spawn } from 'child_process';

export interface ClaudeOptions {
  model?: 'sonnet' | 'opus' | 'haiku';
  outputFormat?: 'text' | 'json';
  maxRetries?: number;
  verbose?: boolean;
}

export interface ClaudeResponse {
  result: any;
  raw?: string;
  error?: string;
}

export interface AnalysisSchema {
  [key: string]: string | number | boolean | AnalysisSchema | AnalysisSchema[];
}

/**
 * Execute a prompt using Claude CLI with spawn for better security
 */
export async function executeClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<ClaudeResponse> {
  const {
    model = 'sonnet',
    outputFormat = 'text',
    maxRetries = 3,
    verbose = false
  } = options;

  // Build the command arguments
  const args = ['--print', '--model', model];
  if (outputFormat === 'json') {
    args.push('--output-format=json');
  }
  
  // Execute with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (verbose) {
        console.log(`[Claude CLI] Attempt ${attempt}/${maxRetries}...`);
      }
      
      const result = await executeClaudeSpawn(prompt, args, verbose);
      
      if (outputFormat === 'json') {
        try {
          const jsonResponse = JSON.parse(result);
          return {
            result: jsonResponse.result ? JSON.parse(jsonResponse.result) : jsonResponse,
            raw: result
          };
        } catch (parseError) {
          // If JSON parsing fails, return raw result
          return { result: result.trim(), raw: result };
        }
      }
      
      return { result: result.trim(), raw: result };
      
    } catch (error: any) {
      if (attempt === maxRetries) {
        return {
          result: null,
          error: `Failed after ${maxRetries} attempts: ${error.message}`
        };
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.pow(2, attempt) * 1000;
      if (verbose) {
        console.log(`[Claude CLI] Retry in ${waitTime}ms...`);
      }
      await sleep(waitTime);
    }
  }
  
  return { result: null, error: 'Unexpected error' };
}

/**
 * Execute Claude CLI using spawn for better security and control
 */
function executeClaudeSpawn(
  prompt: string, 
  args: string[], 
  verbose: boolean
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      env: process.env,
      shell: false // Prevent shell injection
    });

    let stdout = '';
    let stderr = '';
    const maxOutputSize = 10 * 1024 * 1024; // 10MB limit
    let outputSize = 0;

    // Write prompt to stdin
    child.stdin.write(prompt);
    child.stdin.end();

    child.stdout.on('data', (data) => {
      outputSize += data.length;
      if (outputSize > maxOutputSize) {
        child.kill();
        reject(new Error(`Output exceeded maximum size of ${maxOutputSize} bytes`));
        return;
      }
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      if (verbose) {
        console.error('[Claude CLI stderr]:', data.toString());
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Analyze code with a specific analysis type
 */
export async function analyzeCode(
  code: string,
  analysisType: string,
  schema?: AnalysisSchema,
  options: ClaudeOptions = {}
): Promise<any> {
  const schemaInstruction = schema 
    ? `Return ONLY a valid JSON object matching this schema: ${JSON.stringify(schema)}`
    : 'Return ONLY valid JSON';
  
  const prompt = `
${analysisType}

${schemaInstruction}

Code:
\`\`\`
${code}
\`\`\`
`;

  const response = await executeClaude(prompt, { ...options, outputFormat: 'text' });
  
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Try to extract and validate JSON from the response
  return extractAndValidateJson(response.result);
}

/**
 * Extract and validate JSON from Claude's response
 */
function extractAndValidateJson(text: string): any {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || 
                    text.match(/```\n?([\s\S]*?)\n?```/) ||
                    text.match(/({[\s\S]*})/);
  
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      // Basic validation - ensure it's an object
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (e) {
      console.warn('[Claude CLI] Failed to parse JSON from code block:', e);
    }
  }
  
  // Try direct JSON parse as last resort
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch {
    // Return the raw text if all parsing attempts fail
    console.warn('[Claude CLI] Could not parse JSON from response, returning raw text');
    return text;
  }
}

/**
 * Sleep helper for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}