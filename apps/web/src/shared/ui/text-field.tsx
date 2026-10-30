import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { controlClasses, type FieldVariant } from './field-shell';
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from './icons';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: ReactNode;
  error?: string | undefined;
  hint?: ReactNode;
  endAdornment?: ReactNode;
  variant?: FieldVariant;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  error,
  hint,
  endAdornment,
  required,
  id,
  className,
  variant,
  ref,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-body-sm font-medium text-neutral-700">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-danger-fg">
            *
          </span>
        ) : null}
      </label>
      <div className="relative">
        <input
          id={inputId}
          ref={ref}
          required={required}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-10 ${controlClasses(error, variant)} ${endAdornment ? 'pr-11' : ''}`}
          {...inputProps}
        />
        {endAdornment ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">{endAdornment}</div>
        ) : null}
      </div>
      {error ? (
        <p
          id={`${inputId}-error`}
          className="mt-1.5 flex items-start gap-1 text-caption text-danger-fg"
        >
          <AlertCircleIcon size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-caption text-neutral-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'endAdornment'> {
  showLabel: string;
  hideLabel: string;
}

export function PasswordField({ showLabel, hideLabel, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="inline-flex size-9 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-800"
        >
          {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      }
    />
  );
}
