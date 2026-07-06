import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAllOfficeProductRows,
  fetchPublicOfficeIdentity,
} from '../../office-product-editor/services/office-product-data/publicOfficeProductService';
import { fetchStorefrontConfig } from '../../storefront/services/storefront-config/storefrontConfigService';
import PublicStorefrontPage from '../pages/PublicStorefrontPage';

vi.mock(
  '../../office-product-editor/services/office-product-data/publicOfficeProductService',
  () => ({
    fetchAllOfficeProductRows: vi.fn(),
    fetchPublicOfficeIdentity: vi.fn(),
  }),
);

vi.mock('../../storefront/services/storefront-config/storefrontConfigService', () => ({
  fetchStorefrontConfig: vi.fn(),
}));

vi.mock('../components/PublicStorefrontScreen', () => ({
  default: ({ config, productRows, officeName, nhName }) => (
    <div data-testid="public-storefront-screen">
      {config?.officeCode}|{productRows.length}|{officeName}|{nhName}
    </div>
  ),
}));

describe('PublicStorefrontPage adapter', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hands ready-state props to PublicStorefrontScreen after the public fetch completes', async () => {
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      categoryConfigs: [],
      hiddenProducts: [],
    });
    fetchAllOfficeProductRows.mockResolvedValue([{ product_name: 'Alpha' }]);
    fetchPublicOfficeIdentity.mockResolvedValue({
      officeName: 'Demo Office',
      nhName: 'NH',
    });

    render(<PublicStorefrontPage officeCode="OFF-1" />);

    expect(
      await screen.findByTestId('public-storefront-screen'),
    ).toHaveTextContent('OFF-1|1|Demo Office|NH');
  });
});
