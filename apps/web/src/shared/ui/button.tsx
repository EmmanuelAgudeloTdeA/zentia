import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { SpinnerIcon } from './icons';

export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline' | 'on-dark';

export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  secondary:
    'border border-neutral-300 bg-neutral-0 text-neutral-800 shadow-xs hover:bg-neutral-50 active:bg-neutral-100',
  ghost: 'text-primary-600 hover:bg-primary-50 active:bg-primary-100',
  danger: 'bg-danger-solid text-white hover:bg-danger-fg',
  'danger-outline':
    'border border-danger-border bg-neutral-0 text-danger-fg hover:bg-danger-bg active:bg-danger-bg',
  'on-dark': 'bg-neutral-0 text-primary-900 shadow-sm hover:bg-primary-50 active:bg-primary-100',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3',
  md: 'h-10 px-4',
  lg: 'h-11 px-5',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'text-button uppercase transition-colors duration-150 ease-standard',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
  ].join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[buttonClasses(variant, size), className].filter(Boolean).join(' ')}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <SpinnerIcon size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
