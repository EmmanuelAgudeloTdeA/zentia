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

export function controlClasses(error: string | undefined): string {
  return `w-full rounded-md border bg-neutral-0 px-3 text-body text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-500 hover:border-neutral-400 focus:border-primary-500 disabled:bg-neutral-100 disabled:text-neutral-500 ${
    error ? 'border-danger-fg' : 'border-neutral-300'
  }`;
}
