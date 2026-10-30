import { Outlet } from 'react-router';
import { LanguageSwitch } from '../i18n';
import { BrandBackdrop } from './brand-backdrop';
import { BrandLogo, useBrandName } from './brand-mark';

export function PublicLayout() {
  const brandName = useBrandName();

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-linear-120 from-primary-950 via-primary-800 to-primary-500 px-4 py-16">
      <BrandBackdrop />
      <div className="absolute top-4 right-4">
        <LanguageSwitch tone="dark" />
      </div>
      <main className="w-full max-w-100 rounded-2xl bg-neutral-0 px-6 pt-8 pb-7 shadow-lg sm:px-9">
        <div className="flex flex-col items-center gap-3">
          <span className="rounded-full p-1 shadow-md">
            <BrandLogo size="xl" />
          </span>
          <p className="text-h3 font-semibold text-neutral-700">{brandName}</p>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
