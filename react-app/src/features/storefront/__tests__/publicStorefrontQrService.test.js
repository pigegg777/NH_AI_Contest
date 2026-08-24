import { describe, expect, it, vi } from 'vitest';

import { buildStorefrontPublicUrl } from '../../../common/services/publicStorefrontQrService';

describe('storefrontQrExportService.buildStorefrontPublicUrl', () => {
  it('uses VITE_PUBLIC_APP_URL when it is configured', () => {
    const result = buildStorefrontPublicUrl({
      officeCode: ' OFF-1 ',
      env: { VITE_PUBLIC_APP_URL: 'https://public.example.com/' },
      location: { origin: 'https://ignored.local' },
    });

    expect(result).toBe('https://public.example.com/?tool=store&office=OFF-1');
  });

  it('falls back to the current origin when the public app url is not configured', () => {
    const result = buildStorefrontPublicUrl({
      officeCode: 'OFF-1',
      env: {},
      location: { origin: 'https://local.example.com' },
    });

    expect(result).toBe('https://local.example.com/?tool=store&office=OFF-1');
  });

  it('returns an empty string when office code is missing', () => {
    const result = buildStorefrontPublicUrl({
      officeCode: '   ',
      env: { VITE_PUBLIC_APP_URL: 'https://public.example.com' },
      location: { origin: 'https://local.example.com' },
    });

    expect(result).toBe('');
  });
});
