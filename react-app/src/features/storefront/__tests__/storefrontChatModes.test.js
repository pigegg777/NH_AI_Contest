import { describe, expect, it } from 'vitest';

import {
  STOREFRONT_CHAT_MODE_OPTIONS,
  getStorefrontDesignComposerCopy,
} from '../components/chat-workspace/storefrontChatModes';

describe('STOREFRONT_CHAT_MODE_OPTIONS', () => {
  it('exposes exactly the data and design entry modes, in that order', () => {
    expect(STOREFRONT_CHAT_MODE_OPTIONS.map((option) => option.id)).toEqual(['data', 'design']);
  });

  it('gives every option a non-empty label and description', () => {
    STOREFRONT_CHAT_MODE_OPTIONS.forEach((option) => {
      expect(option.label).toEqual(expect.any(String));
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description).toEqual(expect.any(String));
      expect(option.description.length).toBeGreaterThan(0);
    });
  });
});

describe('getStorefrontDesignComposerCopy', () => {
  it('returns page-style copy for the common target', () => {
    const copy = getStorefrontDesignComposerCopy('common');

    expect(copy.title).toBe('공통 요소 디자인 작업 공간');
    expect(copy.targetLabel).toBe('수정 대상');
    expect(copy.sendLabel).toBe('AI 요청하기');
  });

  it('returns card-style copy for the category target', () => {
    const copy = getStorefrontDesignComposerCopy('category');

    expect(copy.title).toBe('카드 디자인 작업 공간');
    expect(copy.targetLabel).toBe('수정 대상');
  });

  it('returns null for an unrecognized target', () => {
    expect(getStorefrontDesignComposerCopy('bogus')).toBeNull();
    expect(getStorefrontDesignComposerCopy(undefined)).toBeNull();
  });
});
