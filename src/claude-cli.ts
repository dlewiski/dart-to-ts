import { execSync, ExecSyncOptions } from 'child_process';

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

/**
 * Execute a prompt using Claude CLI
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

  // Escape the prompt for shell execution
  const escapedPrompt = escapeForShell(prompt);
  
  // Build the command
  const outputFlag = outputFormat === 'json' ? '--output-format=json' : '';
  const modelFlag = `--model ${model}`;
  const verboseFlag = verbose ? '' : '2>/dev/null';
  
  const command = `echo '${escapedPrompt}' | claude --print ${modelFlag} ${outputFlag} ${verboseFlag}`;
  
  // Execute with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (verbose) {
        console.log(`[Claude CLI] Attempt ${attempt}/${maxRetries}...`);
      }
      
      const execOptions: ExecSyncOptions = {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large responses
        stdio: ['pipe', 'pipe', verbose ? 'inherit' : 'pipe']
      };
      
      const result = execSync(command, execOptions) as string;
      
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
 * Analyze code with a specific analysis type
 */
export async function analyzeCode(
  code: string,
  analysisType: string,
  schema?: any,
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
  
  // Try to extract JSON from the response
  const jsonMatch = response.result.match(/```json\n?([\s\S]*?)\n?```/) || 
                    response.result.match(/({[\s\S]*})/);
  
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.warn('[Claude CLI] Failed to parse JSON response:', e);
      return response.result;
    }
  }
  
  // Try direct JSON parse as last resort
  try {
    return JSON.parse(response.result);
  } catch {
    return response.result;
  }
}

/**
 * Escape string for shell execution
 */
function escapeForShell(str: string): string {
  // Replace single quotes with escaped version
  return str.replace(/'/g, "'\\''");
}

/**
 * Sleep helper for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

