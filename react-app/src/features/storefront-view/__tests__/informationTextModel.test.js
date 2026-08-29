import { describe, expect, it } from 'vitest';

import { parseInformationText } from '../model/view/informationTextModel';

describe('parseInformationText', () => {
  it('returns one plain segment for text with no markers', () => {
    expect(parseInformationText('영세가격 안내입니다')).toEqual([
      { text: '영세가격 안내입니다', style: 'plain' },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseInformationText('')).toEqual([]);
    expect(parseInformationText(null)).toEqual([]);
    expect(parseInformationText(undefined)).toEqual([]);
    expect(parseInformationText(42)).toEqual([]);
  });

  it('reads a doubled angle pair as a heading', () => {
    expect(parseInformationText('<<봄철 밑거름>>')).toEqual([
      { text: '봄철 밑거름', style: 'heading' },
    ]);
  });

  it('reads a doubled square pair as important', () => {
    expect(parseInformationText('[[영세가격]]')).toEqual([
      { text: '영세가격', style: 'important' },
    ]);
  });

  it('keeps the text around a marker as plain segments', () => {
    expect(parseInformationText('가격은 [[영세가격]]만 해당합니다')).toEqual([
      { text: '가격은 ', style: 'plain' },
      { text: '영세가격', style: 'important' },
      { text: '만 해당합니다', style: 'plain' },
    ]);
  });

  it('leaves single brackets alone — merchants already write those', () => {
    expect(parseInformationText('[비료] 관련 안내입니다')).toEqual([
      { text: '[비료] 관련 안내입니다', style: 'plain' },
    ]);
    expect(parseInformationText('<20kg> 기준입니다')).toEqual([
      { text: '<20kg> 기준입니다', style: 'plain' },
    ]);
  });

  it('leaves an unclosed marker as plain text, swallowing nothing', () => {
    expect(parseInformationText('[[영세가격은 등록자 전용')).toEqual([
      { text: '[[영세가격은 등록자 전용', style: 'plain' },
    ]);
    expect(parseInformationText('<<봄철 밑거름')).toEqual([
      { text: '<<봄철 밑거름', style: 'plain' },
    ]);
  });

  it('does not nest — the inner marker stays literal', () => {
    expect(parseInformationText('<<[[가격]]>>')).toEqual([
      { text: '[[가격]]', style: 'heading' },
    ]);
  });

  it('leaves an empty marker as plain text rather than making an empty element', () => {
    expect(parseInformationText('[[]]')).toEqual([
      { text: '[[]]', style: 'plain' },
    ]);
    expect(parseInformationText('<<>>')).toEqual([
      { text: '<<>>', style: 'plain' },
    ]);
  });

  it('keeps newlines inside a segment', () => {
    expect(parseInformationText('첫째 줄\n둘째 줄')).toEqual([
      { text: '첫째 줄\n둘째 줄', style: 'plain' },
    ]);
    expect(parseInformationText('[[첫째\n둘째]]')).toEqual([
      { text: '첫째\n둘째', style: 'important' },
    ]);
  });

  it('handles both marker kinds in one string', () => {
    expect(
      parseInformationText('<<봄철>> 안내\n[[영세가격]]은 등록자 전용'),
    ).toEqual([
      { text: '봄철', style: 'heading' },
      { text: ' 안내\n', style: 'plain' },
      { text: '영세가격', style: 'important' },
      { text: '은 등록자 전용', style: 'plain' },
    ]);
  });

  it('takes the first pair that closes when markers interleave', () => {
    expect(parseInformationText('[[가격<<주의]]기타>>')).toEqual([
      { text: '가격<<주의', style: 'important' },
      { text: '기타>>', style: 'plain' },
    ]);
  });
});
