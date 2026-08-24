import { describe, expect, it } from 'vitest';

import {
  buildFieldValueStyle,
  buildShellCssVars,
} from '../model/card-grid-section/cardGridFieldStyleModel';
import {
  DEFAULT_CARD_STYLE,
  normalizeCardStyle,
} from '../model/card-design/style/cardStyleModel';

function cssVarsForInfo(info) {
  return buildShellCssVars(normalizeCardStyle({ info }));
}

describe('buildShellCssVars field and label typography', () => {
  it('keeps the pre-existing base font size at the default step', () => {
    expect(buildShellCssVars(DEFAULT_CARD_STYLE)['--card-font-size']).toBe('0.85rem');
  });

  it('maps the six size steps onto an evenly spaced base scale', () => {
    const sizeFor = (defaultFontSize) =>
      buildShellCssVars(normalizeCardStyle({ field: { defaultFontSize } }))['--card-font-size'];

    expect(sizeFor('xs')).toBe('0.75rem');
    expect(sizeFor('md')).toBe('0.85rem');
    expect(sizeFor('xxl')).toBe('1rem');
  });

  it('renders a legacy saved size token at exactly its old rem value', () => {
    const legacy = buildShellCssVars(normalizeCardStyle({ field: { defaultFontSize: 'large' } }));

    expect(legacy['--card-font-size']).toBe('1rem');
  });

  it('always emits the label colour so the admin token is not inherited', () => {
    // --corp-muted is #6b7280, identical to the muted role, so the default emit is
    // visually a no-op while removing the admin-chrome dependency from card output.
    expect(buildShellCssVars(DEFAULT_CARD_STYLE)['--card-field-label-color']).toBe('#6b7280');
    expect(cssVarsForInfo({ labelColorRole: 'blue' })['--card-field-label-color']).toBe('#2563eb');
  });

  it('omits label size and weight at the default step so the group label keeps its own scale', () => {
    const defaults = buildShellCssVars(DEFAULT_CARD_STYLE);

    expect(defaults['--card-field-label-size']).toBeUndefined();
    expect(defaults['--card-field-label-weight']).toBeUndefined();
  });

  it('emits label size and weight once they differ from the default', () => {
    expect(cssVarsForInfo({ labelFontSizeToken: 'xl' })['--card-field-label-size']).toBe('0.76rem');
    expect(cssVarsForInfo({ labelFontWeight: 800 })['--card-field-label-weight']).toBe(800);
  });
});

describe('buildFieldValueStyle', () => {
  it('resolves the six size steps as offsets onto the card font size', () => {
    expect(buildFieldValueStyle({ fontSize: 'md' })['--field-font-size']).toBe(
      'var(--card-font-size, 0.85rem)',
    );
    expect(buildFieldValueStyle({ fontSize: 'xs' })['--field-font-size']).toBe(
      'calc(var(--card-font-size, 0.85rem) - 0.08rem)',
    );
    expect(buildFieldValueStyle({ fontSize: 'xxl' })['--field-font-size']).toBe(
      'calc(var(--card-font-size, 0.85rem) + 0.12rem)',
    );
  });

  it('still renders legacy per-field styles saved in bodySlots', () => {
    // bodySlots are persisted, so previously saved slot styles carry the old tokens.
    expect(buildFieldValueStyle({ fontSize: 'small' })['--field-font-size']).toBe(
      'calc(var(--card-font-size, 0.85rem) - 0.08rem)',
    );
    expect(buildFieldValueStyle({ fontSize: 'large' })['--field-font-size']).toBe(
      'calc(var(--card-font-size, 0.85rem) + 0.12rem)',
    );
    expect(buildFieldValueStyle({ fontWeight: 'bold' })['--field-font-weight']).toBe(800);
    expect(buildFieldValueStyle({ fontWeight: 'semibold' })['--field-font-weight']).toBe(700);
  });

  it('resolves numeric weights directly', () => {
    expect(buildFieldValueStyle({ fontWeight: 600 })['--field-font-weight']).toBe(600);
    expect(buildFieldValueStyle({ fontWeight: 900 })['--field-font-weight']).toBe(900);
  });
});
