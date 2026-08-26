import { describe, expect, it } from 'vitest';

import { PAGE_AI_TARGET_SCOPE_OPTIONS } from '../model/page-design/ai-request/pageAiDesignModel';
import {
  PAGE_DESIGN_SCOPE_GUIDES,
  getPageDesignScopeGuide,
} from '../model/page-design/ai-request/pageDesignScopeGuide';

describe('PAGE_DESIGN_SCOPE_GUIDES', () => {
  it('covers every selectable target scope plus the "all" scope', () => {
    const guideScopeIds = PAGE_DESIGN_SCOPE_GUIDES.map((guide) => guide.scopeId);

    expect(guideScopeIds).toContain('');

    PAGE_AI_TARGET_SCOPE_OPTIONS.forEach((option) => {
      expect(guideScopeIds).toContain(option.id);
    });
  });

  it('gives every guide row a user facing element and prompt example', () => {
    PAGE_DESIGN_SCOPE_GUIDES.forEach((guide) => {
      expect(guide.rows.length).toBeGreaterThan(0);

      guide.rows.forEach((row) => {
        expect(row.element).toBeTruthy();
        expect(row.example).toBeTruthy();
      });
    });
  });

  it('titles every guide with the same label as its chip', () => {
    // The chip strip and the guide panel name the same scope, so a rename on one
    // side must not leave the merchant reading two different names for it.
    PAGE_AI_TARGET_SCOPE_OPTIONS.forEach((option) => {
      expect(getPageDesignScopeGuide(option.id).title).toBe(option.label);
    });
  });

  it('keeps the two category button scopes pointing at each other', () => {
    // They are styled independently, so each guide has to tell the merchant the
    // other one exists.
    ['categoryChips', 'productCategoryChips'].forEach((scopeId) => {
      expect(getPageDesignScopeGuide(scopeId).note).toContain('따로 움직입니다');
    });
  });

  it('no longer offers the page description scope', () => {
    expect(
      PAGE_AI_TARGET_SCOPE_OPTIONS.map((option) => option.id),
    ).not.toContain('pageDescription');
    expect(PAGE_AI_TARGET_SCOPE_OPTIONS).toHaveLength(5);
  });
});
