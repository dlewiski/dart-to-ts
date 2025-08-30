/**
 * Centralized error handling utilities
 * Consolidates error handling patterns from across the application
 */

export interface ErrorContext {
  operation: string;
  fileName?: string;
  category?: string;
  details?: Record<string, unknown>;
}

/**
 * Standard error logging with context
 */
export function logError(error: unknown, context: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const contextInfo = [
    `Operation: ${context.operation}`,
    context.fileName && `File: ${context.fileName}`,
    context.category && `Category: ${context.category}`,
  ]
    .filter(Boolean)
    .join(' | ');

  console.error(`❌ ${contextInfo}: ${errorMessage}`);

  if (context.details) {
    console.error('Additional context:', context.details);
  }
}

/**
 * Standard warning logging with context
 */
export function logWarning(message: string, context: ErrorContext): void {
  const contextInfo = [
    `Operation: ${context.operation}`,
    context.fileName && `File: ${context.fileName}`,
    context.category && `Category: ${context.category}`,
  ]
    .filter(Boolean)
    .join(' | ');

  console.warn(`⚠️  ${contextInfo}: ${message}`);
}

/**
 * Wrap async operations with consistent error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  fallback?: T,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logError(error, context);
    return fallback ?? null;
  }
}

/**
 * Create a consistent error for failed operations
 */
export function createOperationError(
  operation: string,
  cause?: unknown,
): Error {
  const causeMessage = cause instanceof Error ? cause.message : String(cause);
  return new Error(`${operation}: ${causeMessage}`);
}
