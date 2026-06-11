import { useMemo } from 'react';

import { buildOfficeProductDataCatalogModel } from '../model/catalog/officeProductDataCatalogModel';

export function useOfficeProductDataCatalogPanel(items) {
  return useMemo(() => buildOfficeProductDataCatalogModel(items), [items]);
}
