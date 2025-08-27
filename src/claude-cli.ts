import {
  type ClaudeOptions,
  type ClaudeResponse,
  type AnalysisSchema,
  TIMEOUTS,
  TimeoutError,
} from './types/index.ts';

/**
 * Execute a prompt using Claude CLI with Deno subprocess
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
    timeout = TIMEOUTS.CLAUDE_CLI,
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

      const result = await executeClaudeSubprocess(prompt, args, verbose, timeout);

      if (outputFormat === 'json') {
        try {
          const jsonResponse = JSON.parse(result);
          return {
            result: jsonResponse.result
              ? JSON.parse(jsonResponse.result)
              : jsonResponse,
            raw: result,
          };
        } catch (_parseError) {
          // If JSON parsing fails, return raw result
          return { result: result.trim(), raw: result };
        }
      }

      return { result: result.trim(), raw: result };
    } catch (error) {
      if (attempt === maxRetries) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          result: null,
          error: `Failed after ${maxRetries} attempts: ${errorMessage}`,
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
 * Execute Claude CLI using Deno subprocess
 */
async function executeClaudeSubprocess(
  prompt: string,
  args: string[],
  verbose: boolean,
  timeout: number = TIMEOUTS.CLAUDE_CLI
): Promise<string> {
  const command = new Deno.Command('claude', {
    args,
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  });

  const process = command.spawn();

  // Write prompt to stdin
  const writer = process.stdin.getWriter();
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(prompt));
  await writer.close();

  // Set up timeout
  let timeoutId: number | null = null;
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      try {
        process.kill();
      } catch (e) {
        if (verbose) {
          console.error('[Claude CLI] Error killing process:', e);
        }
      }
    }, timeout);
  }

  try {
    const { code, stdout, stderr } = await process.output();

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const decoder = new TextDecoder();
    const stdoutStr = decoder.decode(stdout);
    const stderrStr = decoder.decode(stderr);

    if (verbose && stderrStr) {
      console.error('[Claude CLI stderr]:', stderrStr);
    }

    if (code !== 0) {
      throw new Error(`Claude CLI exited with code ${code}: ${stderrStr}`);
    }

    return stdoutStr;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (error instanceof Error && error.message.includes('timed out')) {
      throw new TimeoutError('Claude CLI execution', timeout);
    }
    throw error;
  }
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

  const response = await executeClaude(prompt, {
    ...options,
    outputFormat: 'text',
  });

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
  const jsonMatch =
    text.match(/```json\n?([\s\S]*?)\n?```/) ||
    text.match(/```\n?([\s\S]*?)\n?```/) ||
    text.match(/({[\s\S]*})/);

  if (jsonMatch && jsonMatch[1]) {
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
    console.warn(
      '[Claude CLI] Could not parse JSON from response, returning raw text'
    );
  }
  
  return text;
}

/**
 * Sleep helper for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}