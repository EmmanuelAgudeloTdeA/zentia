import type { FocusEvent, ReactNode, Ref } from 'react';
import { TextField } from './text-field';

interface NumberFieldProps {
  label: ReactNode;
  /** Decimal con punto (`1.5`), como lo envía la API. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  decimals?: number;
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  suffix?: ReactNode;
  className?: string;
  name?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Acepta coma o punto decimal y limita los decimales; muestra coma. */
export function NumberField({ value, onChange, decimals = 2, suffix, ...props }: NumberFieldProps) {
  return (
    <TextField
      {...props}
      inputMode="decimal"
      autoComplete="off"
      value={value.replace('.', ',')}
      onChange={(event) => {
        const raw = event.target.value.replace(/,/g, '.').replace(/[^\d.]/g, '');
        const [integer = '', ...rest] = raw.split('.');
        const fraction = rest.join('').slice(0, decimals);
        onChange(rest.length > 0 && decimals > 0 ? `${integer}.${fraction}` : integer);
      }}
      endAdornment={
        suffix ? <span className="pr-3 text-body-sm text-neutral-500">{suffix}</span> : undefined
      }
    />
  );
}
