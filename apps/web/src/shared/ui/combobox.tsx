import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { controlClasses, describedById, FieldShell } from './field-shell';
import { SpinnerIcon } from './icons';

const DEBOUNCE_MS = 250;

export interface ComboboxLabels {
  loading: string;
  noResults: string;
  error: string;
  /** Texto de la opción para crear un valor nuevo, si se permite. */
  create?: (value: string) => string;
}

interface ComboboxProps<T> {
  label: ReactNode;
  inputValue: string;
  onInputChange: (value: string) => void;
  loadOptions: (query: string, signal: AbortSignal) => Promise<readonly T[]>;
  getOptionKey: (option: T) => string;
  getOptionLabel: (option: T) => string;
  renderOption?: (option: T) => ReactNode;
  onSelect: (option: T) => void;
  /** Se llama al elegir la opción "Crear «x»". */
  onCreate?: (value: string) => void;
  labels: ComboboxLabels;
  minChars?: number;
  maxOptions?: number;
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

/** Autocompletado accesible (combobox + listbox) con búsqueda asíncrona y espera de 250 ms. */
export function Combobox<T>({
  label,
  inputValue,
  onInputChange,
  loadOptions,
  getOptionKey,
  getOptionLabel,
  renderOption,
  onSelect,
  onCreate,
  labels,
  minChars = 2,
  maxOptions = 8,
  error,
  hint,
  required,
  placeholder,
  name,
  disabled,
  className,
  onBlur,
}: ComboboxProps<T>) {
  const inputId = useId();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [options, setOptions] = useState<readonly T[]>([]);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState<string | null>(null);
  const loadRef = useRef(loadOptions);
  loadRef.current = loadOptions;

  useEffect(() => {
    if (query === null || query.trim().length < minChars) {
      setStatus('idle');
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    setStatus('loading');
    const timer = setTimeout(() => {
      loadRef
        .current(query.trim(), controller.signal)
        .then((result) => {
          setOptions(result.slice(0, maxOptions));
          setStatus('ready');
          setActive(-1);
        })
        .catch(() => {
          if (!controller.signal.aborted) setStatus('error');
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, minChars, maxOptions]);

  const trimmed = inputValue.trim();
  const exactMatch = options.some(
    (option) => getOptionLabel(option).toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
  );
  const showCreate =
    onCreate !== undefined &&
    labels.create !== undefined &&
    status === 'ready' &&
    trimmed !== '' &&
    !exactMatch;
  const itemCount = options.length + (showCreate ? 1 : 0);
  const expanded = open && status !== 'idle';

  const choose = (index: number) => {
    const option = options[index];
    if (option !== undefined) {
      onSelect(option);
    } else if (showCreate) {
      onCreate?.(trimmed);
    }
    setOpen(false);
    setQuery(null);
  };

  const optionId = (index: number) => `${listboxId}-${index}`;

  return (
    <FieldShell
      id={inputId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-invalid={error ? true : undefined}
          aria-required={required}
          aria-describedby={describedById(inputId, error, hint)}
          placeholder={placeholder}
          disabled={disabled}
          value={inputValue}
          className={`h-10 ${controlClasses(error)}`}
          onChange={(event) => {
            onInputChange(event.target.value);
            setQuery(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
            onBlur?.();
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }
              if (itemCount === 0) return;
              const step = event.key === 'ArrowDown' ? 1 : -1;
              setActive((index) => (index + step + itemCount) % itemCount);
            } else if (event.key === 'Enter' && expanded && active >= 0) {
              event.preventDefault();
              choose(active);
            } else if (event.key === 'Escape' && expanded) {
              event.preventDefault();
              setOpen(false);
            }
          }}
        />
        {expanded ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-40 mt-1 max-h-72 w-full min-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-0 p-1 shadow-md"
          >
            {status === 'loading' ? (
              <li className="flex items-center gap-2 px-3 py-2 text-body-sm text-neutral-500">
                <SpinnerIcon size={16} className="animate-spin" />
                {labels.loading}
              </li>
            ) : null}
            {status === 'error' ? (
              <li className="px-3 py-2 text-body-sm text-danger-fg">{labels.error}</li>
            ) : null}
            {status === 'ready' && itemCount === 0 ? (
              <li className="px-3 py-2 text-body-sm text-neutral-500">{labels.noResults}</li>
            ) : null}
            {status === 'ready'
              ? options.map((option, index) => (
                  <li
                    key={getOptionKey(option)}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === active}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(index)}
                    className={`cursor-pointer rounded-md px-3 py-2 text-body ${
                      index === active
                        ? 'bg-primary-50 text-primary-800'
                        : 'text-neutral-800 hover:bg-neutral-50'
                    }`}
                  >
                    {renderOption ? renderOption(option) : getOptionLabel(option)}
                  </li>
                ))
              : null}
            {showCreate ? (
              <li
                id={optionId(options.length)}
                role="option"
                aria-selected={active === options.length}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(options.length)}
                className={`cursor-pointer rounded-md border-t border-neutral-100 px-3 py-2 text-body font-medium text-primary-600 ${
                  active === options.length ? 'bg-primary-50' : 'hover:bg-neutral-50'
                }`}
              >
                {labels.create?.(trimmed)}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </FieldShell>
  );
}
