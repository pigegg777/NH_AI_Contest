import { describe, expect, it } from 'vitest';

import { normalizeInformationEmphasisResponse } from '../model/information-emphasis/ai-response/informationEmphasisAiNormalizer';

const SOURCE = '비료: 요소 20kg 15,000원\n영세가격은 등록 농가만 적용됩니다';

describe('normalizeInformationEmphasisResponse', () => {
  it('accepts a response that only inserted markers', () => {
    const result = normalizeInformationEmphasisResponse(
      {
        description:
          '<<비료:>> 요소 20kg 15,000원\n[[영세가격은 등록 농가만]] 적용됩니다',
      },
      SOURCE,
    );

    expect(result.errorMessage).toBe('');
    expect(result.description).toBe(
      '<<비료:>> 요소 20kg 15,000원\n[[영세가격은 등록 농가만]] 적용됩니다',
    );
  });

  it('rejects a response that added a space inside a word', () => {
    const result = normalizeInformationEmphasisResponse(
      {
        description:
          '<<비료:>> 요소 20kg 15,000원\n[[영세 가격은 등록 농가만]] 적용됩니다',
      },
      SOURCE,
    );

    expect(result.description).toBe('');
    expect(result.errorMessage).not.toBe('');
  });

  it('rejects a response that shortened the sentence', () => {
    const result = normalizeInformationEmphasisResponse(
      { description: '<<비료:>> 요소 20kg 15,000원' },
      SOURCE,
    );

    expect(result.description).toBe('');
  });

  it('rejects a response that invented a new sentence', () => {
    const result = normalizeInformationEmphasisResponse(
      { description: `${SOURCE}\n문의는 사무소로 주세요` },
      SOURCE,
    );

    expect(result.description).toBe('');
  });

  it('rejects an unclosed marker because its stray symbols count as added glyphs', () => {
    const result = normalizeInformationEmphasisResponse(
      {
        description: '비료: 요소 20kg 15,000원\n[[영세가격은 등록 농가만 적용됩니다',
      },
      SOURCE,
    );

    expect(result.description).toBe('');
  });

  it('accepts a response that keeps a marker the seller already wrote', () => {
    const sourceWithMarker = '[[영세가격]]은 등록 농가만 적용됩니다';
    const result = normalizeInformationEmphasisResponse(
      { description: '[[영세가격]]은 <<등록 농가만>> 적용됩니다' },
      sourceWithMarker,
    );

    expect(result.description).toBe('[[영세가격]]은 <<등록 농가만>> 적용됩니다');
  });

  it('accepts a response identical to the source when nothing deserves emphasis', () => {
    const result = normalizeInformationEmphasisResponse(
      { description: SOURCE },
      SOURCE,
    );

    expect(result.description).toBe(SOURCE);
    expect(result.errorMessage).toBe('');
  });

  it('rejects a payload without a description field', () => {
    const result = normalizeInformationEmphasisResponse({}, SOURCE);

    expect(result.description).toBe('');
    expect(result.errorMessage).not.toBe('');
  });
});
