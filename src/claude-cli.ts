import { spawn } from 'child_process';
import { 
  ClaudeOptions, 
  ClaudeResponse, 
  AnalysisSchema,
  TIMEOUTS,
  TimeoutError 
} from './types';

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
    verbose = false,
    timeout = TIMEOUTS.CLAUDE_CLI
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
      
      const result = await executeClaudeSpawn(prompt, args, verbose, options.timeout);
      
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
      
    } catch (error) {
      if (attempt === maxRetries) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          result: null,
          error: `Failed after ${maxRetries} attempts: ${errorMessage}`
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
  verbose: boolean,
  timeout: number = TIMEOUTS.CLAUDE_CLI
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      env: process.env,
      shell: false, // Prevent shell injection
      stdio: ['pipe', 'pipe', 'pipe'] // Explicit stdio configuration
    });

    let stdout = '';
    let stderr = '';
    const maxOutputSize = 10 * 1024 * 1024; // 10MB limit
    let outputSize = 0;
    let timeoutHandle: NodeJS.Timeout | null = null;

    // Set up timeout
    if (timeout > 0) {
      timeoutHandle = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new TimeoutError('Claude CLI execution', timeout));
      }, timeout);
    }

    // Handle stdin errors
    child.stdin.on('error', (error) => {
      console.error('[Claude CLI] stdin error:', error);
      reject(error);
    });

    // Write prompt to stdin with proper encoding
    child.stdin.write(prompt, 'utf-8', (err) => {
      if (err) {
        console.error('[Claude CLI] Failed to write to stdin:', err);
        reject(err);
      } else {
        child.stdin.end();
      }
    });

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
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
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
): Promise<unknown> {
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
  return extractAndValidateJson(String(response.result));
}

/**
 * Extract and validate JSON from Claude's response
 */
function extractAndValidateJson(text: string): unknown {
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