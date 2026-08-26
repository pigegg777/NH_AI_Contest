export const OFFICE_INFORMATION_CHILD_ID = 'office';

function buildCategoryInformationId(categoryName) {
  return `category:${categoryName}`;
}

export function buildInformationNavigationItems({
  officeEntries = [],
  catalogSectionEntries = [],
} = {}) {
  const items = officeEntries.length > 0
    ? [{
        id: OFFICE_INFORMATION_CHILD_ID,
        kind: 'office',
        label: '사무소 안내',
        categoryName: '',
        entries: officeEntries,
      }]
    : [];

  for (const { sectionName, section } of catalogSectionEntries) {
    const entries = Array.isArray(section?.infoEntries) ? section.infoEntries : [];
    if (!sectionName || entries.length === 0) continue;
    items.push({
      id: buildCategoryInformationId(sectionName),
      kind: 'category',
      label: `${sectionName} 안내`,
      categoryName: sectionName,
      entries,
    });
  }

  return items;
}

export function resolveActiveInformationItem(items, requestedId) {
  const source = Array.isArray(items) ? items : [];
  return source.find((item) => item.id === requestedId) ?? source[0] ?? null;
}
