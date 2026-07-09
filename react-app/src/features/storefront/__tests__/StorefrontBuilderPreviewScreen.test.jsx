import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/office-product-data/officeProductDataReadService';
import StorefrontBuilderPage from '../pages/StorefrontBuilderPage';
import { fetchStorefrontConfig } from '../model/storefront-config/storefrontConfigOrchestrator';

vi.mock(
  '../../office-product-editor/services/office-product-data/officeProductDataReadService',
  () => ({
    fetchOfficeProductDataEntries: vi.fn(),
  }),
);

vi.mock('../model/storefront-config/storefrontConfigOrchestrator', () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
}));

vi.mock('../../public-storefront/components/PublicStorefrontScreen', () => ({
  default: ({ config, productRows, officeName, nhName }) => (
    <div data-testid="public-storefront-screen">
      {config?.officeCode}|{productRows.length}|{officeName}|{nhName}
    </div>
  ),
}));

describe('StorefrontBuilderPage preview seam', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the extracted PublicStorefrontScreen with builder preview props', async () => {
    fetchOfficeProductDataEntries.mockResolvedValue([
      {
        officeCode: 'OFF-1',
        officeName: 'Demo Office',
        categoryName: 'Fertilizer Upload',
        rowCount: 1,
        rows: [
          {
            product_name: 'Alpha',
            product_category_name: 'Fertilizer Upload',
            medium_category: 'Premium',
          },
        ],
      },
    ]);
    fetchStorefrontConfig.mockResolvedValue({
      officeCode: 'OFF-1',
      pageConfig: {
        nav: { title: '', subtitle: '', logoUrl: '' },
        searchSection: {
          enabled: true,
          placeholder: 'Search products',
          variant: 'pill',
        },
        categoryChips: { enabled: true, sticky: true, variant: 'soft' },
      },
      navConfig: {
        title: '',
        subtitle: '',
        brandColor: '#1d4a2e',
        searchPlaceholder: 'Search products',
        logoUrl: '',
        searchVariant: 'pill',
        categoryChipVariant: 'soft',
      },
      categoryConfigs: [],
      hiddenProducts: [],
    });

    render(<StorefrontBuilderPage officeCode="OFF-1" nhName="NH" />);

    expect(
      await screen.findByTestId('public-storefront-screen'),
    ).toHaveTextContent('OFF-1|1|Demo Office|NH');
  });
});
