import type { FieldError, FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '../../../core/errors';

const ZOD_ISSUE_KEYS = new Set([
  'invalid_type',
  'invalid_format',
  'invalid_value',
  'too_small',
  'too_big',
]);

const FALLBACK_KEY = 'validation.invalid_value';

function issueKey(code: string): string {
  return ZOD_ISSUE_KEYS.has(code) ? `validation.${code}` : FALLBACK_KEY;
}

export function fieldErrorKey(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  if (error.message?.startsWith('validation.')) return error.message;
  // Los refine de shared usan el código de zod como mensaje (p. ej. `percentString` → too_big).
  if (error.type === 'custom' && error.message) return issueKey(error.message);
  return issueKey(error.type);
}

export function applyServerIssues<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
  customMessages: Partial<Record<string, string>> = {},
): boolean {
  if (!isApiError(error) || error.code !== 'VALIDATION_ERROR' || !error.issues) return false;
  const issues = error.issues.filter((issue) => fields.includes(issue.path));
  for (const issue of issues) {
    setError(issue.path as Path<T>, {
      type: issue.code,
      message: (issue.code === 'custom' && customMessages[issue.path]) || issueKey(issue.code),
    });
  }
  return issues.length > 0;
}
