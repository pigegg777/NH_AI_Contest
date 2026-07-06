import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';
import {
  normalizeCategoryConfigRow,
  normalizeNavConfig,
  normalizePageConfig,
} from '../../model/storefront-config/storefrontBuilderModel';
import { migrateLegacyPageConfigToPageStyle, pageConfigNeedsPageStyleMigration } from '../page-design/pageStyleMigration';

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

function buildCategoryRows({ officeCode, categoryConfigs }) {
  return toArray(categoryConfigs)
    .map((row, index) => normalizeCategoryConfigRow({ ...row, sortOrder: row?.sortOrder ?? index }))
    .filter((row) => row.productCategoryName)
    .map((row, index) => ({
      office_code: officeCode,
      product_category_name: row.productCategoryName,
      sort_order: Number.isFinite(row.sortOrder) ? row.sortOrder : index,
      category_config: row.categoryConfig,
    }));
}

export async function fetchStorefrontConfig({ officeCode }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    return null;
  }

  const { data: officeRow, error: officeError } = await supabase
    .from('office_page_config')
    .select('office_code, page_config, hidden_products, updated_at')
    .eq('office_code', normalizedOfficeCode)
    .maybeSingle();

  if (officeError) {
    throw new Error(officeError.message || 'Failed to load storefront config.');
  }

  if (!officeRow) {
    return null;
  }

  const { data: categoryRows, error: categoryError } = await supabase
    .from('office_page_category_configs')
    .select('office_code, product_category_name, category_config, sort_order, updated_at')
    .eq('office_code', normalizedOfficeCode)
    .order('sort_order', { ascending: true });

  if (categoryError) {
    throw new Error(categoryError.message || 'Failed to load storefront category config.');
  }

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
  const categoryRows = buildCategoryRows({
    officeCode: normalizedOfficeCode,
    categoryConfigs,
  });

  const { error: officeError } = await supabase.from('office_page_config').upsert(
    {
      office_code: normalizedOfficeCode,
      page_config: pageConfigPayload,
      hidden_products: toArray(hiddenProducts),
    },
    { onConflict: 'office_code' },
  );

  if (officeError) {
    throw new Error(officeError.message || 'Failed to save storefront config.');
  }

  const { data: existingCategoryRows, error: existingCategoryError } = await supabase
    .from('office_page_category_configs')
    .select('product_category_name')
    .eq('office_code', normalizedOfficeCode);

  if (existingCategoryError) {
    throw new Error(existingCategoryError.message || 'Failed to load existing storefront category config.');
  }

  if (categoryRows.length > 0) {
    const { error: categoryUpsertError } = await supabase.from('office_page_category_configs').upsert(categoryRows, {
      onConflict: 'office_code,product_category_name',
    });

    if (categoryUpsertError) {
      throw new Error(categoryUpsertError.message || 'Failed to save storefront category config.');
    }
  }

  const nextCategoryNames = new Set(categoryRows.map((row) => row.product_category_name));
  const staleCategoryNames = toArray(existingCategoryRows)
    .map((row) => toTrimmedString(row?.product_category_name))
    .filter((productCategoryName) => productCategoryName && !nextCategoryNames.has(productCategoryName));

  if (staleCategoryNames.length > 0) {
    const { error: categoryDeleteError } = await supabase
      .from('office_page_category_configs')
      .delete()
      .eq('office_code', normalizedOfficeCode)
      .in('product_category_name', staleCategoryNames);

    if (categoryDeleteError) {
      throw new Error(categoryDeleteError.message || 'Failed to remove stale storefront category config.');
    }
  }
}
