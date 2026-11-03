import { useState, type FocusEvent, type ReactNode, type Ref } from 'react';
import { groupThousands } from '../../core/format';
import { TextField } from './text-field';

const MAX_DIGITS = 15;

interface MoneyFieldProps {
  label: ReactNode;
  /** Entero en pesos como string (`''` si está vacío). */
  value: string;
  onChange: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  name?: string;
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** Monto COP sin centavos: solo dígitos al editar y miles separados al salir del campo. */
export function MoneyField({ value, onChange, onBlur, ...props }: MoneyFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextField
      {...props}
      inputMode="numeric"
      autoComplete="off"
      value={focused ? value : groupThousands(value)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onChange={(event) =>
        onChange(
          event.target.value
            .replace(/\D/g, '')
            .replace(/^0+(?=\d)/, '')
            .slice(0, MAX_DIGITS),
        )
      }
      endAdornment={<span className="pr-3 text-body-sm text-neutral-500">COP</span>}
    />
  );
}
