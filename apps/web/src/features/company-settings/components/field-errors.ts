import type { FieldError, FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '../../../core/errors';

const ZOD_ISSUE_KEYS = new Set([
  'invalid_type',
  'invalid_format',
  'invalid_value',
  'too_small',
  'too_big',
]);

/** Clave de `lang/` para un error de campo: el mensaje propio o `validation.<código de Zod>`. */
export function fieldErrorKey(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  if (error.message?.startsWith('validation.')) return error.message;
  return ZOD_ISSUE_KEYS.has(error.type) ? `validation.${error.type}` : 'validation.invalid_value';
}

/** Ubica los issues del servidor en sus campos; devuelve false si no había ninguno. */
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
      message:
        (issue.code === 'custom' && customMessages[issue.path]) || `validation.${issue.code}`,
    });
  }
  return issues.length > 0;
}
