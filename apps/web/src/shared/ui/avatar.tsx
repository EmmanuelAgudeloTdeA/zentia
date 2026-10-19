interface AvatarProps {
  name: string;
  tone?: 'dark' | 'light';
}

export function Avatar({ name, tone = 'light' }: AvatarProps) {
  const toneClasses =
    tone === 'dark'
      ? 'bg-white/15 text-white ring-1 ring-white/30'
      : 'bg-primary-100 text-primary-700';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold ${toneClasses}`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
