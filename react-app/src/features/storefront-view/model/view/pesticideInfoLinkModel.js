import { buildPesticideInfoUrl } from '../../../../common/utils/pesticideInfoUrl';

export const PESTICIDE_INFO_LINK_FIELD = 'pesticide_info_link';

export { buildPesticideInfoUrl };

export function withPesticideInfoLink(product) {
  const pesticideInfoUrl = buildPesticideInfoUrl(product);

  return pesticideInfoUrl
    ? { ...product, [PESTICIDE_INFO_LINK_FIELD]: pesticideInfoUrl }
    : product;
}
