import type { CompanySettingsDto } from '@zentia/shared';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBrandingStore } from '../../../core/branding';
import { ApiError } from '../../../core/errors';
import { BrandMark, PrivateLayout, PublicLayout } from '../../../core/layout';
import { ProtectedRoute } from '../../../core/router';
import es from '../../../lang/es.json';
import { signIn } from '../../../test/session-fixture';
import { routes as settingsRoutes, SETTINGS_PATH } from '../routes';
import { loadBranding } from '../services/branding.service';
import { companyService } from '../services/company.service';

function settingsFixture(overrides: Partial<CompanySettingsDto> = {}): CompanySettingsDto {
  return {
    name: 'Acme SAS',
    taxId: null,
    address: null,
    city: null,
    phone: null,
    email: null,
    website: null,
    bankAccounts: null,
    commercialTerms: null,
    documentLocale: 'es',
    hasLogo: false,
    logoVersion: 0,
    defaultVatRate: 'GENERAL_19',
    validityDays: 15,
    discountLimitSeller: '10',
    discountLimitManager: '30',
    discountLimitAdmin: '30',
    shippingTaxable: false,
    expiringAlertDays: 3,
    followUpDays: 5,
    coldStartThreshold: 30,
    updatedAt: '2026-10-30T10:00:00.000Z',
    ...overrides,
  };
}

function renderSettings() {
  const router = createMemoryRouter(
    [
      {
        element: <ProtectedRoute />,
        children: [{ element: <PrivateLayout navItems={[]} />, children: settingsRoutes }],
      },
    ],
    { initialEntries: [SETTINGS_PATH] },
  );
  render(<RouterProvider router={router} />);
}

function fill(label: string, value: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const input = screen.getByLabelText(new RegExp(`^${escaped}`));
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function pngFile(size = 64): File {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new File([bytes], 'logo.png', { type: 'image/png' });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CompanySettingsPage access', () => {
  it('shows the forbidden page to non-admin roles', () => {
    signIn('MANAGER');
    renderSettings();
    expect(screen.getByText(es.forbidden.title)).toBeTruthy();
  });
});

describe('Company profile tab', () => {
  it('saves the profile and updates the brand name in the header', async () => {
    signIn('ADMIN');
    useBrandingStore.getState().setBranding({ name: 'Acme SAS', hasLogo: false, logoVersion: 0 });
    vi.spyOn(companyService, 'getSettings').mockResolvedValue(settingsFixture());
    const update = vi
      .spyOn(companyService, 'updateProfile')
      .mockResolvedValue(settingsFixture({ name: 'Nueva SAS' }));
    renderSettings();

    await screen.findByDisplayValue('Acme SAS');
    fill(es.settings.profile.name, 'Nueva SAS');
    fireEvent.click(screen.getByRole('button', { name: es.settings.profile.submit }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]?.[0]).toMatchObject({ name: 'Nueva SAS', email: null, city: null });
    expect(await screen.findByRole('link', { name: /Nueva SAS/ })).toBeTruthy();
  });

  it('sends city, website and bank accounts', async () => {
    signIn('ADMIN');
    vi.spyOn(companyService, 'getSettings').mockResolvedValue(settingsFixture());
    const update = vi.spyOn(companyService, 'updateProfile').mockResolvedValue(settingsFixture());
    renderSettings();

    await screen.findByDisplayValue('Acme SAS');
    fill(es.settings.profile.city, 'Medellín');
    fill(es.settings.profile.website, 'www.acme.co');
    fill(es.settings.profile.bankAccounts, 'Ahorros Bancolombia | 236 279 66075');
    fireEvent.click(screen.getByRole('button', { name: es.settings.profile.submit }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      city: 'Medellín',
      website: 'www.acme.co',
      bankAccounts: 'Ahorros Bancolombia | 236 279 66075',
    });
  });

  it('validates the email format before calling the API', async () => {
    signIn('ADMIN');
    vi.spyOn(companyService, 'getSettings').mockResolvedValue(settingsFixture());
    const update = vi.spyOn(companyService, 'updateProfile');
    renderSettings();

    await screen.findByDisplayValue('Acme SAS');
    fill(es.settings.profile.email, 'no-es-correo');
    fireEvent.click(screen.getByRole('button', { name: es.settings.profile.submit }));

    expect(await screen.findByText(es.validation.invalid_format)).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('asks before leaving a tab with unsaved changes', async () => {
    signIn('ADMIN');
    vi.spyOn(companyService, 'getSettings').mockResolvedValue(settingsFixture());
    renderSettings();

    await screen.findByDisplayValue('Acme SAS');
    fill(es.settings.profile.name, 'Otra');
    fireEvent.click(screen.getByRole('tab', { name: es.settings.tabs.parameters }));

    const dialog = await screen.findByRole('dialog', { name: es.settings.discard.title });
    fireEvent.click(within(dialog).getByRole('button', { name: es.settings.discard.confirm }));
    expect(await screen.findByText(es.settings.parameters.futureOnlyNotice)).toBeTruthy();
  });
});

describe('LogoUploader', () => {
  it('rejects unsupported types and files over 512 KB in the browser', async () => {
    signIn('ADMIN');
    vi.spyOn(companyService, 'getSettings').mockResolvedValue(settingsFixture());
    const upload = vi.spyOn(companyService, 'uploadLogo');
    renderSettings();

    const input = await screen.findByLabelText(es.settings.logo.upload);
    fireEvent.change(input, {
      target: { files: [new File(['GIF89a'], 'logo.gif', { type: 'image/gif' })] },
    });
    expect(await screen.findByText(es.errors.LOGO_INVALID_TYPE)).toBeTruthy();

    fireEvent.change(input, { target: { files: [pngFile(512 * 1024 + 1)] } });
    expect(await screen.findByText(es.errors.LOGO_TOO_LARGE)).toBeTruthy();
    expect(upload).not.toHaveBeenCalled();
  });

  it('previews, uploads and refreshes the branding without reloading', async () => {
    signIn('ADMIN');
    useBrandingStore.getState().setBranding({ name: 'Acme SAS', hasLogo: false, logoVersion: 0 });
    vi.spyOn(companyService, 'getSettings').mockResolvedValue(settingsFixture());
    const upload = vi
      .spyOn(companyService, 'uploadLogo')
      .mockResolvedValue({ hasLogo: true, logoVersion: 1 });
    renderSettings();

    fireEvent.change(await screen.findByLabelText(es.settings.logo.upload), {
      target: { files: [pngFile()] },
    });
    expect(await screen.findByRole('img', { name: es.settings.logo.preview })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: es.settings.logo.save }));

    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0].mimeType).toBe('image/png');
    expect(useBrandingStore.getState()).toMatchObject({ hasLogo: true, logoVersion: 1 });
    expect(document.querySelector('header img')?.getAttribute('src')).toBe('/api/company/logo?v=1');
  });

  it('confirms before removing the logo', async () => {
    signIn('ADMIN');
    useBrandingStore.getState().setBranding({ name: 'Acme SAS', hasLogo: true, logoVersion: 3 });
    vi.spyOn(companyService, 'getSettings').mockResolvedValue(settingsFixture({ hasLogo: true }));
    const remove = vi.spyOn(companyService, 'deleteLogo').mockResolvedValue(undefined);
    renderSettings();

    fireEvent.click(await screen.findByRole('button', { name: es.settings.logo.remove }));
    const dialog = screen.getByRole('dialog', { name: es.settings.logo.confirmRemoveTitle });
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole('button', { name: es.settings.logo.confirmRemoveAction }),
    );

    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(useBrandingStore.getState()).toMatchObject({ hasLogo: false, logoVersion: 4 });
  });
});

describe('CommercialParametersForm', () => {
  async function openParameters() {
    signIn('ADMIN');
    vi.spyOn(companyService, 'getSettings').mockResolvedValue(settingsFixture());
    renderSettings();
    fireEvent.click(await screen.findByRole('tab', { name: es.settings.tabs.parameters }));
  }

  it('shows the future-only notice and validates X < N live', async () => {
    const update = vi.spyOn(companyService, 'updateParameters');
    await openParameters();

    expect(screen.getByText(es.settings.parameters.futureOnlyNotice)).toBeTruthy();
    fill(es.settings.parameters.validityDays, '3');
    fireEvent.click(screen.getByRole('button', { name: es.settings.parameters.submit }));

    expect(await screen.findByText('Debe ser menor que los días de vigencia (3).')).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('sends percent strings with a dot and places server issues on their field', async () => {
    const update = vi
      .spyOn(companyService, 'updateParameters')
      .mockRejectedValue(
        new ApiError('VALIDATION_ERROR', 400, undefined, [
          { path: 'followUpDays', code: 'too_big' },
        ]),
      );
    await openParameters();

    fill(es.settings.parameters.discountLimitSeller, '12,5');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: es.settings.parameters.submit }));
    });

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0]?.[0]).toMatchObject({ discountLimitSeller: '12.5' });
    expect(await screen.findByText(es.validation.too_big)).toBeTruthy();
  });
});

describe('BrandMark and branding', () => {
  function renderBrand(element: React.ReactNode) {
    const router = createMemoryRouter([{ path: '/', element }], { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
  }

  it('falls back to app.name when the company has no name', async () => {
    vi.spyOn(companyService, 'getBranding').mockResolvedValue({
      name: null,
      hasLogo: false,
      logoVersion: 0,
    });
    await loadBranding();
    renderBrand(<BrandMark />);
    expect(screen.getByRole('link', { name: new RegExp(es.app.name) })).toBeTruthy();
  });

  it('shows the logo and name on the login and hides a broken image', async () => {
    vi.spyOn(companyService, 'getBranding').mockResolvedValue({
      name: 'Acme SAS',
      hasLogo: true,
      logoVersion: 2,
    });
    await loadBranding();
    const router = createMemoryRouter(
      [{ element: <PublicLayout />, children: [{ path: '/', element: null }] }],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);

    expect(screen.getByText('Acme SAS')).toBeTruthy();
    const image = document.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/api/company/logo?v=2');
    fireEvent.error(image as HTMLImageElement);
    expect(document.querySelector('img')).toBeNull();
  });

  it('keeps the app name if the branding request fails', async () => {
    vi.spyOn(companyService, 'getBranding').mockRejectedValue(new ApiError('NETWORK_ERROR', 0));
    await loadBranding();
    expect(useBrandingStore.getState()).toMatchObject({ status: 'ready', name: null });
  });
});

describe('Error summary', () => {
  it('summarizes more than 3 invalid fields at the top of the form', async () => {
    signIn('ADMIN');
    vi.spyOn(companyService, 'getSettings').mockResolvedValue(settingsFixture());
    renderSettings();
    fireEvent.click(await screen.findByRole('tab', { name: es.settings.tabs.parameters }));

    fill(es.settings.parameters.validityDays, '0');
    fill(es.settings.parameters.followUpDays, '200');
    fill(es.settings.parameters.coldStartThreshold, '10');
    fill(es.settings.parameters.discountLimitSeller, '150');
    fireEvent.click(screen.getByRole('button', { name: es.settings.parameters.submit }));

    expect(await screen.findByText(/^Hay \d+ campos con errores/)).toBeTruthy();
  });
});
