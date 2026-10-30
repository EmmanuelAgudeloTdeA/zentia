import { useId, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';
import { controlClasses, describedById, FieldShell, type FieldVariant } from './field-shell';
import { ChevronDownIcon } from './icons';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: ReactNode;
  options: readonly SelectOption[];
  error?: string | undefined;
  hint?: ReactNode;
  variant?: FieldVariant;
  ref?: Ref<HTMLSelectElement>;
}

export function Select({
  label,
  options,
  error,
  hint,
  required,
  id,
  className,
  variant,
  ref,
  ...selectProps
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <FieldShell
      id={selectId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          required={required}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById(selectId, error, hint)}
          className={`h-10 appearance-none pr-10 ${controlClasses(error, variant)}`}
          {...selectProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          size={16}
          className="pointer-events-none absolute inset-y-0 right-3 my-auto text-neutral-500"
        />
      </div>
    </FieldShell>
  );
}
