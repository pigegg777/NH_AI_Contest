import { describe, expect, it } from 'vitest';

import { normalizeCategoryConfig } from '../model/config-schema/storefrontConfigModel';
import { buildSections } from '../model/config-schema/sectionMatching';

describe('categoryConfig.description', () => {
  it('defaults to an empty string', () => {
    expect(normalizeCategoryConfig({}, '비료').description).toBe('');
  });

  it('keeps and trims a description it is given', () => {
    expect(
      normalizeCategoryConfig({ description: '  봄철 밑거름 모음  ' }, '비료').description,
    ).toBe('봄철 밑거름 모음');
  });

  it('ignores a description that is not a string', () => {
    expect(normalizeCategoryConfig({ description: 42 }, '비료').description).toBe('');
  });
});

describe('buildSections description', () => {
  const ROW = { product_category_name: '비료', product_name: '알파 비료' };

  it('carries the configured description onto the section', () => {
    const [section] = buildSections(
      [
        {
          productCategoryName: '비료',
          categoryConfig: {
            displayName: '비료',
            sourceCategoryName: '비료',
            description: '봄철 밑거름 모음',
          },
        },
      ],
      [ROW],
    );

    expect(section.description).toBe('봄철 밑거름 모음');
  });

  it('gives an unconfigured category an empty description', () => {
    const [section] = buildSections([], [ROW]);

    expect(section.description).toBe('');
  });
});
