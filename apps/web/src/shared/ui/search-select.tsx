import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { controlClasses, describedById, FieldShell } from './field-shell';
import { ChevronDownIcon, PlusIcon, SearchIcon, SpinnerIcon } from './icons';

const DEBOUNCE_MS = 250;
const VIEWPORT_MARGIN = 8;
const GAP = 4;
const PANEL_MAX_HEIGHT = 320;

export interface SearchSelectLabels {
  loading: string;
  noResults: string;
  error: string;
  search: string;
}

interface SearchSelectProps<T> {
  label: ReactNode;
  value: T | null;
  loadOptions: (query: string, signal: AbortSignal) => Promise<readonly T[]>;
  getOptionKey: (option: T) => string;
  getOptionLabel: (option: T) => string;
  renderOption?: (option: T) => ReactNode;
  onSelect: (option: T) => void;
  labels: SearchSelectLabels;
  placeholder: string;
  /** Acción fija al pie del panel (p. ej., "Crear categoría"); recibe lo buscado. */
  footerAction?: { label: string; onSelect: (query: string) => void };
  /** El disparador vuelve al placeholder tras elegir (p. ej., "Agregar producto"). */
  clearAfterSelect?: boolean;
  maxOptions?: number;
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

type Status = 'loading' | 'ready' | 'error';

interface Position {
  top: number;
  left: number;
  width: number;
}

/** Selector con búsqueda: muestra opciones sin escribir y filtra con la API mientras se busca. */
export function SearchSelect<T>({
  label,
  value,
  loadOptions,
  getOptionKey,
  getOptionLabel,
  renderOption,
  onSelect,
  labels,
  placeholder,
  footerAction,
  clearAfterSelect = false,
  maxOptions = 20,
  error,
  hint,
  required,
  disabled,
  className,
}: SearchSelectProps<T>) {
  const triggerId = useId();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const [options, setOptions] = useState<readonly T[]>([]);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadRef = useRef(loadOptions);
  loadRef.current = loadOptions;

  const close = (restoreFocus = true) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setStatus('loading');
    const timer = setTimeout(
      () => {
        loadRef
          .current(query.trim(), controller.signal)
          .then((result) => {
            setOptions(result.slice(0, maxOptions));
            setStatus('ready');
            setActive(result.length > 0 ? 0 : -1);
          })
          .catch(() => {
            if (!controller.signal.aborted) setStatus('error');
          });
      },
      query === '' ? 0 : DEBOUNCE_MS,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, maxOptions]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const below = rect.bottom + GAP;
    const fitsBelow = below + PANEL_MAX_HEIGHT <= window.innerHeight - VIEWPORT_MARGIN;
    const height = panelRef.current?.offsetHeight ?? PANEL_MAX_HEIGHT;
    setPosition({
      top: fitsBelow ? below : Math.max(VIEWPORT_MARGIN, rect.top - GAP - height),
      left: rect.left,
      width: rect.width,
    });
    searchRef.current?.focus({ preventScroll: true });
  }, [open, status]);

  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (panelRef.current?.contains(target) || triggerRef.current?.contains(target));
    const onPointerDown = (event: PointerEvent) => {
      if (!inside(event.target)) close(false);
    };
    const onScroll = (event: Event) => {
      if (!inside(event.target)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const choose = (option: T) => {
    onSelect(option);
    close();
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      // Solo cierra el panel: el diálogo que lo contiene no debe enterarse.
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + options.length) % options.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[active];
      if (option !== undefined) choose(option);
    }
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const selectedLabel = !clearAfterSelect && value !== null ? getOptionLabel(value) : null;
  const optionId = (index: number) => `${listboxId}-${index}`;

  return (
    <FieldShell
      id={triggerId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-invalid={error ? true : undefined}
        aria-required={required}
        aria-describedby={describedById(triggerId, error, hint)}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onTriggerKeyDown}
        className={`flex h-10 items-center justify-between gap-2 text-left ${controlClasses(error)}`}
      >
        <span className={`truncate ${selectedLabel ? 'text-neutral-900' : 'text-neutral-500'}`}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDownIcon size={16} className="shrink-0 text-neutral-500" />
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              style={
                position
                  ? { top: position.top, left: position.left, width: position.width }
                  : { top: 0, left: 0, visibility: 'hidden' }
              }
              className="fixed z-[55] flex max-h-80 min-w-64 flex-col rounded-lg border border-neutral-200 bg-neutral-0 shadow-md"
            >
              <div className="relative border-b border-neutral-200 p-2">
                <SearchIcon
                  size={16}
                  className="pointer-events-none absolute inset-y-0 left-5 my-auto text-neutral-400"
                />
                <input
                  ref={searchRef}
                  type="search"
                  role="searchbox"
                  aria-label={labels.search}
                  aria-controls={listboxId}
                  aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                  placeholder={labels.search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onSearchKeyDown}
                  className="h-9 w-full rounded-md border border-neutral-300 bg-neutral-0 pr-3 pl-9 text-body text-neutral-900 placeholder:text-neutral-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 focus:outline-none"
                />
              </div>
              <ul
                id={listboxId}
                role="listbox"
                aria-label={typeof label === 'string' ? label : undefined}
                className="min-h-0 flex-1 overflow-y-auto p-1"
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
                {status === 'ready' && options.length === 0 ? (
                  <li className="px-3 py-2 text-body-sm text-neutral-500">{labels.noResults}</li>
                ) : null}
                {status === 'ready'
                  ? options.map((option, index) => {
                      const selected =
                        value !== null && getOptionKey(option) === getOptionKey(value);
                      return (
                        <li
                          key={getOptionKey(option)}
                          id={optionId(index)}
                          role="option"
                          aria-selected={selected}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => choose(option)}
                          className={`cursor-pointer rounded-md px-3 py-2 text-body ${
                            index === active
                              ? 'bg-primary-50 text-primary-800'
                              : 'text-neutral-800 hover:bg-neutral-50'
                          } ${selected ? 'font-medium' : ''}`}
                        >
                          {renderOption ? renderOption(option) : getOptionLabel(option)}
                        </li>
                      );
                    })
                  : null}
              </ul>
              {footerAction ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const typed = query.trim();
                    close(false);
                    footerAction.onSelect(typed);
                  }}
                  className="flex items-center gap-2 border-t border-neutral-200 px-4 py-2.5 text-left text-body font-medium text-primary-600 hover:bg-primary-50"
                >
                  <PlusIcon size={16} />
                  {footerAction.label}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </FieldShell>
  );
}
