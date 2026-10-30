export function BrandBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-y-0 -right-1/4 w-3/4 -skew-x-24 bg-linear-to-b from-white/8 to-white/3" />
      <div className="absolute -top-24 -left-24 size-96 rounded-full bg-brand-teal/15 blur-3xl" />
      <div className="absolute -right-16 -bottom-32 size-96 rounded-full bg-brand-violet/20 blur-3xl" />
    </div>
  );
}
