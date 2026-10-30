interface ZentiaMarkProps {
  className?: string;
}

export function ZentiaMark({ className }: ZentiaMarkProps) {
  return (
    <img
      src="/brand/zentia-mark.png"
      alt=""
      aria-hidden="true"
      className={['object-contain', className].filter(Boolean).join(' ')}
    />
  );
}
