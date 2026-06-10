import { describe, expect, it } from 'vitest';

import {
  hasTrimmedText,
  toLowerTrimmedString,
  toNullableTrimmedString,
  toTrimmedString,
} from '../utils/text';

describe('common text utils', () => {
  it('normalizes nullish and string values into trimmed strings', () => {
    expect(toTrimmedString(null)).toBe('');
    expect(toTrimmedString(undefined)).toBe('');
    expect(toTrimmedString('  hello  ')).toBe('hello');
    expect(toTrimmedString(0)).toBe('0');
  });

  it('converts blank values into nullable text', () => {
    expect(toNullableTrimmedString('   ')).toBeNull();
    expect(toNullableTrimmedString('\n demo \t')).toBe('demo');
  });

  it('builds lower-cased search text from trimmed input', () => {
    expect(toLowerTrimmedString('  Alpha Beta  ')).toBe('alpha beta');
  });

  it('detects whether a value has visible text after trimming', () => {
    expect(hasTrimmedText('   ')).toBe(false);
    expect(hasTrimmedText(' item ')).toBe(true);
    expect(hasTrimmedText(0)).toBe(true);
  });
});
