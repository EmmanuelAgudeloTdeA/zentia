import type { ReactNode } from 'react';
import { AlertCircleIcon } from './icons';

interface FieldShellProps {
  id: string;
  label: ReactNode;
  required?: boolean | undefined;
  error?: string | undefined;
  hint?: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}

export function describedById(id: string, error?: string, hint?: ReactNode): string | undefined {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

/** Etiqueta, ayuda y error comunes a los campos de formulario. */
export function FieldShell({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-body-sm font-medium text-neutral-700">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-danger-fg">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1 text-caption text-danger-fg">
          <AlertCircleIcon size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-caption text-neutral-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type FieldVariant = 'outline' | 'filled';

const VARIANT_CLASSES: Record<FieldVariant, { base: string; idle: string }> = {
  outline: {
    base: 'bg-neutral-0 shadow-xs placeholder:text-neutral-500 hover:border-neutral-400 disabled:bg-neutral-100',
    idle: 'border-neutral-300',
  },
  filled: {
    base: 'bg-neutral-100 placeholder:text-neutral-400 hover:bg-neutral-50 focus:bg-neutral-0',
    idle: 'border-transparent',
  },
};

export function controlClasses(
  error: string | undefined,
  variant: FieldVariant = 'outline',
): string {
  const { base, idle } = VARIANT_CLASSES[variant];
  return `w-full rounded-md border px-3 text-body text-neutral-900 transition-colors duration-150 focus:border-primary-500 disabled:text-neutral-500 ${base} ${
    error ? 'border-danger-fg' : idle
  }`;
}
