import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchStorefrontConfig } from '../../features/storefront/model/storefront-config/storefrontConfigOrchestrator';
import PublicStorefrontQrCard from '../components/PublicStorefrontQrCard';
import {
  buildStorefrontQrAssets,
  printStorefrontQr,
} from '../services/publicStorefrontQrService';

vi.mock('../../features/storefront/model/storefront-config/storefrontConfigOrchestrator', () => ({
  fetchStorefrontConfig: vi.fn(),
}));

vi.mock('../services/publicStorefrontQrService', async () => {
  const actual = await vi.importActual('../services/publicStorefrontQrService');

  return {
    ...actual,
    buildStorefrontQrAssets: vi.fn(),
    printStorefrontQr: vi.fn(),
  };
});

describe('PublicStorefrontQrCard', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('shows a loading state while checking storefront availability', () => {
    fetchStorefrontConfig.mockReturnValue(new Promise(() => {}));

    render(
      <PublicStorefrontQrCard
        officeCode="OFF-1"
        officeName="Demo Office"
        nhName="NH"
      />,
    );

    expect(screen.getByTestId('public-storefront-qr-loading')).toBeInTheDocument();
  });

  it('shows an empty state when there is no saved storefront config', async () => {
    fetchStorefrontConfig.mockResolvedValue(null);

    render(
      <PublicStorefrontQrCard
        officeCode="OFF-1"
        officeName="Demo Office"
        nhName="NH"
      />,
    );

    expect(await screen.findByTestId('public-storefront-qr-empty')).toBeInTheDocument();
    expect(screen.getByTestId('public-storefront-qr-card')).toHaveTextContent(
      'Demo Office',
    );
  });

  it('shows the public storefront link and actions when a saved storefront exists', async () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://public.example.com/');
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      categoryConfigs: [{ productCategoryName: 'Fertilizer Upload' }],
      hiddenProducts: [],
    });
    buildStorefrontQrAssets.mockResolvedValue({
      previewSvgMarkup: '<svg viewBox="0 0 10 10"></svg>',
      printSvgMarkup: '<svg viewBox="0 0 10 10"></svg>',
      pngDataUrl: 'data:image/png;base64,abc',
      svgDownloadUrl: 'data:image/svg+xml;base64,abc',
    });

    render(
      <PublicStorefrontQrCard
        officeCode="OFF-1"
        officeName="Demo Office"
        nhName="NH"
      />,
    );

    const link = await screen.findByRole('link', { name: /public-storefront-link/i });
    expect(link).toHaveAttribute(
      'href',
      'https://public.example.com/?tool=store&office=OFF-1',
    );
    expect(screen.getByTestId('public-storefront-qr-ready')).toBeInTheDocument();
    expect(screen.getByTestId('public-storefront-qr-copy-link')).toBeInTheDocument();
    expect(screen.getByTestId('public-storefront-qr-print')).toBeInTheDocument();
  });

  it('shows an error state and retries after a failed fetch', async () => {
    fetchStorefrontConfig
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        officeCode: 'OFF-1',
        categoryConfigs: [{ productCategoryName: 'Fertilizer Upload' }],
        hiddenProducts: [],
      });
    buildStorefrontQrAssets.mockResolvedValue({
      previewSvgMarkup: '<svg viewBox="0 0 10 10"></svg>',
      printSvgMarkup: '<svg viewBox="0 0 10 10"></svg>',
      pngDataUrl: 'data:image/png;base64,abc',
      svgDownloadUrl: 'data:image/svg+xml;base64,abc',
    });

    const user = userEvent.setup();

    render(
      <PublicStorefrontQrCard officeCode="OFF-1" officeName="Demo Office" />,
    );

    expect(await screen.findByTestId('public-storefront-qr-error')).toBeInTheDocument();

    await user.click(screen.getByTestId('public-storefront-qr-retry'));

    await waitFor(() => {
      expect(fetchStorefrontConfig).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByTestId('public-storefront-qr-ready')).toBeInTheDocument();
  });

  it('prints the saved public storefront QR from the ready state', async () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://public.example.com/');
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      categoryConfigs: [{ productCategoryName: 'Fertilizer Upload' }],
      hiddenProducts: [],
    });
    buildStorefrontQrAssets.mockResolvedValue({
      previewSvgMarkup: '<svg viewBox="0 0 10 10"></svg>',
      printSvgMarkup: '<svg viewBox="0 0 10 10"></svg>',
      pngDataUrl: 'data:image/png;base64,abc',
      svgDownloadUrl: 'data:image/svg+xml;base64,abc',
    });

    const user = userEvent.setup();

    render(
      <PublicStorefrontQrCard
        officeCode="OFF-1"
        officeName="Demo Office"
        nhName="NH"
      />,
    );

    await screen.findByTestId('public-storefront-qr-ready');
    await user.click(screen.getByTestId('public-storefront-qr-print'));

    expect(printStorefrontQr).toHaveBeenCalledWith(
      expect.objectContaining({
        officeCode: 'OFF-1',
        officeName: 'NH · Demo Office',
        publicUrl: 'https://public.example.com/?tool=store&office=OFF-1',
      }),
    );
  });
});
