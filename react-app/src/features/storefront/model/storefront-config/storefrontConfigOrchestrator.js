import { toTrimmedString } from '../../../../common/utils/text';
import {
  normalizeCategoryConfigRow,
  normalizeNavConfig,
  normalizePageConfig,
} from './storefrontBuilderModel';
import { migrateLegacyPageConfigToPageStyle, pageConfigNeedsPageStyleMigration } from '../page-design/page-style/pageStyleMigration';
import { fetchOfficeConfigRows, saveOfficeConfigRows } from '../../services/storefront-config/storefrontConfigService';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeConfig(officeRow, categoryRows) {
  if (!officeRow) {
    return null;
  }

  const rawPageConfig = officeRow.page_config ?? {};
  const pageConfig = normalizePageConfig(
    pageConfigNeedsPageStyleMigration(rawPageConfig)
      ? { ...rawPageConfig, pageStyle: migrateLegacyPageConfigToPageStyle(rawPageConfig) }
      : rawPageConfig,
  );
  const normalizedCategoryConfigs = toArray(categoryRows).map((row) => normalizeCategoryConfigRow(row));

  return {
    officeCode: toTrimmedString(officeRow.office_code),
    pageConfig,
    navConfig: normalizeNavConfig({
      title: pageConfig.nav.title,
      subtitle: pageConfig.nav.subtitle,
      brandColor: pageConfig.theme.brandColor,
      searchPlaceholder: pageConfig.searchSection.placeholder,
      logoUrl: pageConfig.nav.logoUrl,
    }),
    categoryConfigs: normalizedCategoryConfigs,
    hiddenProducts: toArray(officeRow.hidden_products),
    updatedAt: officeRow.updated_at ?? null,
  };
}

function buildPageConfigPayload({ navConfig, pageConfig }) {
  const normalizedPageConfig = normalizePageConfig(pageConfig);
  const normalizedNavConfig = normalizeNavConfig({
    title: navConfig?.title ?? normalizedPageConfig.nav.title,
    subtitle: navConfig?.subtitle ?? normalizedPageConfig.nav.subtitle,
    brandColor: navConfig?.brandColor ?? normalizedPageConfig.theme.brandColor,
    searchPlaceholder: navConfig?.searchPlaceholder ?? normalizedPageConfig.searchSection.placeholder,
    logoUrl: navConfig?.logoUrl ?? normalizedPageConfig.nav.logoUrl,
  });

  return normalizePageConfig({
    ...normalizedPageConfig,
    theme: {
      ...normalizedPageConfig.theme,
      brandColor: normalizedNavConfig.brandColor,
    },
    nav: {
      ...normalizedPageConfig.nav,
      title: normalizedNavConfig.title,
      subtitle: normalizedNavConfig.subtitle,
      logoUrl: normalizedNavConfig.logoUrl,
    },
    searchSection: {
      ...normalizedPageConfig.searchSection,
      placeholder: normalizedNavConfig.searchPlaceholder,
    },
  });
}

function buildCategoryRows({ categoryConfigs }) {
  const stamp = new Date().toISOString();

  return toArray(categoryConfigs)
    .map((row) => normalizeCategoryConfigRow(row))
    .filter((row) => row.productCategoryName)
    .map((row) => ({
      product_category_name: row.productCategoryName,
      updated_at: stamp,
      category_config: row.categoryConfig,
    }));
}

export async function fetchStorefrontConfig({ officeCode }) {
  const { officeRow, categoryRows } = await fetchOfficeConfigRows({ officeCode });

  return normalizeConfig(officeRow, categoryRows);
}

export async function upsertStorefrontConfig({
  officeCode,
  categoryConfigs,
  navConfig,
  pageConfig,
  hiddenProducts,
}) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    throw new Error('officeCode is required.');
  }

  const pageConfigPayload = buildPageConfigPayload({ navConfig, pageConfig });
  const categoryRows = buildCategoryRows({ categoryConfigs });

  await saveOfficeConfigRows({
    officeCode: normalizedOfficeCode,
    pageConfigPayload,
    hiddenProducts,
    categoryRows,
  });
}
