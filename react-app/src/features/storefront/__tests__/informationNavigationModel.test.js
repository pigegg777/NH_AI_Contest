import { describe, expect, it } from 'vitest';
import {
  OFFICE_INFORMATION_CHILD_ID,
  buildInformationNavigationItems,
  resolveActiveInformationItem,
} from '../model/storefront-view/informationNavigationModel';

const officeEntries = [{ id: 'o1', label: '', description: '사무소 내용' }];
const catalogSectionEntries = [
  { sectionName: '비료', section: { infoEntries: [{ id: 'f1', label: '', description: '비료 내용' }] } },
  { sectionName: '농약', section: { infoEntries: [] } },
  { sectionName: '일반자재', section: { infoEntries: [{ id: 'm1', label: '', description: '자재 내용' }] } },
];

describe('information navigation model', () => {
  it('puts office first and keeps only categories with information', () => {
    expect(buildInformationNavigationItems({ officeEntries, catalogSectionEntries })).toEqual([
      { id: OFFICE_INFORMATION_CHILD_ID, kind: 'office', label: '사무소 안내', categoryName: '', entries: officeEntries },
      { id: 'category:비료', kind: 'category', label: '비료 안내', categoryName: '비료', entries: catalogSectionEntries[0].section.infoEntries },
      { id: 'category:일반자재', kind: 'category', label: '일반자재 안내', categoryName: '일반자재', entries: catalogSectionEntries[2].section.infoEntries },
    ]);
  });

  it('falls back to the first valid item when the requested id is stale', () => {
    const items = buildInformationNavigationItems({ officeEntries: [], catalogSectionEntries });
    expect(resolveActiveInformationItem(items, 'category:삭제됨')?.id).toBe('category:비료');
  });

  it('returns null when no information exists', () => {
    expect(resolveActiveInformationItem([], OFFICE_INFORMATION_CHILD_ID)).toBeNull();
  });
});
