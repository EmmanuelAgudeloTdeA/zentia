import { useId, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import { controlClasses, describedById, FieldShell, type FieldVariant } from './field-shell';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  error?: string | undefined;
  hint?: ReactNode;
  variant?: FieldVariant;
  ref?: Ref<HTMLTextAreaElement>;
}

export function TextArea({
  label,
  error,
  hint,
  required,
  id,
  className,
  variant,
  ref,
  rows = 3,
  ...textareaProps
}: TextAreaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <FieldShell
      id={textareaId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <textarea
        id={textareaId}
        ref={ref}
        rows={rows}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById(textareaId, error, hint)}
        className={`field-sizing-content max-h-52 min-h-20 resize-y py-2 ${controlClasses(error, variant)}`}
        {...textareaProps}
      />
    </FieldShell>
  );
}
