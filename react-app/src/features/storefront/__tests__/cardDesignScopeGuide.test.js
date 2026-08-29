import { describe, expect, it } from 'vitest';

import {
  CARD_AI_TARGET_SCOPE_OPTIONS,
  getCardAiTargetScopeOption,
} from '../model/card-design/ai-request/cardAiDesignModel';
import {
  CARD_DESIGN_SCOPE_GUIDES,
  getCardDesignScopeGuide,
} from '../model/card-design/ai-request/cardDesignScopeGuide';

describe('CARD_DESIGN_SCOPE_GUIDES', () => {
  it('covers every selectable target scope plus the "all" scope', () => {
    const guideScopeIds = CARD_DESIGN_SCOPE_GUIDES.map((guide) => guide.scopeId);

    expect(guideScopeIds).toContain('');

    CARD_AI_TARGET_SCOPE_OPTIONS.forEach((option) => {
      expect(guideScopeIds).toContain(option.id);
    });
  });

  it('gives every guide row a user facing element and prompt example', () => {
    CARD_DESIGN_SCOPE_GUIDES.forEach((guide) => {
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
    CARD_AI_TARGET_SCOPE_OPTIONS.forEach((option) => {
      expect(getCardDesignScopeGuide(option.id).title).toBe(option.label);
    });
  });

  it('keeps every guide table and its prompt instruction in sync', () => {
    // The guide table is the user-facing rendering of what the AI is told it may
    // change, so each prompt `detail` must list exactly the same elements. The ''
    // scope has no target option — it is the "everything" chip, not a scope the
    // prompt is ever instructed with.
    CARD_AI_TARGET_SCOPE_OPTIONS.forEach((option) => {
      const guide = getCardDesignScopeGuide(option.id);

      expect(option.detail).toBe(guide.rows.map((row) => row.element).join(', '));
    });
  });

  it('documents the info label controls', () => {
    const infoElements = getCardDesignScopeGuide('info').rows.map((row) => row.element);

    expect(infoElements).toEqual(
      expect.arrayContaining(['라벨 색', '라벨 크기', '라벨 굵기']),
    );
    // The compiler carried a dead `info.radius` that never reached the schema, so the
    // table must stop advertising a corner control that does not exist.
    expect(infoElements.some((element) => element.includes('모서리'))).toBe(false);
  });

  it('documents the whole-card field defaults now that the AI can set them', () => {
    const fieldElements = getCardDesignScopeGuide('field').rows.map((row) => row.element);

    expect(fieldElements).toEqual(
      expect.arrayContaining(['전체 글자색', '전체 굵기', '전체 글자 크기']),
    );
  });

  it('documents the header appearance controls the AI can actually reach', () => {
    const headerElements = getCardDesignScopeGuide('header').rows.map(
      (row) => row.element,
    );

    // The header frame is fixed now: only colour, weight and size step are reachable,
    // so the table must not advertise a border, spacing, alignment or line control.
    expect(headerElements).toEqual(['배경색', '글자색', '글자 굵기', '글자 크기']);
  });
});
