import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PublicStorefrontScreen from '../components/PublicStorefrontScreen';

describe('PublicStorefrontScreen', () => {
  it('renders the customer-facing storefront from ready-state props', () => {
    render(
      <PublicStorefrontScreen
        config={{
          navConfig: { title: 'Public Demo' },
          pageConfig: {
            nav: { title: 'Public Demo', subtitle: '', logoUrl: '' },
            searchSection: {
              enabled: true,
              placeholder: 'Search products',
              variant: 'pill',
            },
            categoryChips: { enabled: true, sticky: true, variant: 'soft' },
          },
          categoryConfigs: [
            {
              officeCode: 'OFF-1',
              productCategoryName: 'Fertilizer Upload',
              sortOrder: 0,
              categoryConfig: {
                displayName: 'Fertilizer Upload',
                sourceCategoryName: 'Fertilizer Upload',
                selectedMediumCategories: ['Premium'],
                representativeMediumCategory: 'Premium',
                cardDesign: {
                  visibleFields: ['product_name'],
                },
              },
            },
          ],
          hiddenProducts: [],
        }}
        productRows={[
          {
            product_category_name: 'Fertilizer Upload',
            product_name: 'Alpha',
            medium_category: 'Premium',
          },
        ]}
        officeName="Demo Office"
        nhName="NH"
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Public Demo' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
