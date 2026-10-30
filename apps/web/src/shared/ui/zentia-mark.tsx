interface ZentiaMarkProps {
  className?: string;
}

/** Isotipo de Zentia (la Z del logo oficial): se usa mientras la empresa no haya subido su logo. */
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
