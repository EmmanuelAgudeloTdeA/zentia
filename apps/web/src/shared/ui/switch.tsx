import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: ReactNode;
  hint?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Switch({ label, hint, id, className, ref, ...inputProps }: SwitchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div
      className={['flex items-start justify-between gap-4', className].filter(Boolean).join(' ')}
    >
      <div className="min-w-0">
        <label htmlFor={inputId} className="block text-body-sm font-medium text-neutral-700">
          {label}
        </label>
        {hint ? (
          <p id={`${inputId}-hint`} className="mt-0.5 text-caption text-neutral-600">
            {hint}
          </p>
        ) : null}
      </div>
      <span className="relative inline-flex shrink-0">
        <input
          id={inputId}
          ref={ref}
          type="checkbox"
          role="switch"
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
          {...inputProps}
        />
        <span
          aria-hidden="true"
          className="h-6 w-11 rounded-full bg-neutral-300 transition-colors duration-150 peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50"
        />
        <span
          aria-hidden="true"
          className="absolute top-0.5 left-0.5 size-5 rounded-full bg-neutral-0 shadow-sm transition-transform duration-150 peer-checked:translate-x-5"
        />
      </span>
    </div>
  );
}
