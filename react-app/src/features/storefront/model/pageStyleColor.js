const HEX_3_PATTERN = /^#([0-9a-f]{3})$/i;
const HEX_6_PATTERN = /^#([0-9a-f]{6})$/i;

export function isHexColor(value) {
  return typeof value === 'string' && (HEX_3_PATTERN.test(value) || HEX_6_PATTERN.test(value));
}

function expandHex(hex) {
  const shortMatch = HEX_3_PATTERN.exec(hex);

  if (!shortMatch) {
    return hex.toLowerCase();
  }

  const [r, g, b] = shortMatch[1].split('');

  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

export function normalizeHexColor(value, fallbackHex) {
  return isHexColor(value) ? expandHex(value) : fallbackHex;
}

export function hexToRgb(hex) {
  const normalized = expandHex(hex);

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function channelLuminance(channel) {
  const ratio = channel / 255;

  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);

  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export function contrastRatio(hexA, hexB) {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);

  return (lighter + 0.05) / (darker + 0.05);
}

export function pickReadableTextColor(backgroundHex, { onLight = '#111827', onDark = '#ffffff' } = {}) {
  return contrastRatio(onLight, backgroundHex) >= contrastRatio(onDark, backgroundHex) ? onLight : onDark;
}

export function ensureReadableTextColor(candidateHex, backgroundHex, { minRatio = 4.5 } = {}) {
  const normalizedCandidate = normalizeHexColor(candidateHex, pickReadableTextColor(backgroundHex));

  return contrastRatio(normalizedCandidate, backgroundHex) >= minRatio
    ? normalizedCandidate
    : pickReadableTextColor(backgroundHex);
}

function mixChannel(channelA, channelB, weight) {
  return Math.round(channelA + (channelB - channelA) * weight);
}

function toHexChannel(value) {
  return value.toString(16).padStart(2, '0');
}

export function mixHexColors(hexA, hexB, weight) {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  const clampedWeight = Math.min(1, Math.max(0, weight));

  return `#${toHexChannel(mixChannel(rgbA.r, rgbB.r, clampedWeight))}${toHexChannel(
    mixChannel(rgbA.g, rgbB.g, clampedWeight),
  )}${toHexChannel(mixChannel(rgbA.b, rgbB.b, clampedWeight))}`;
}

export function deriveTonalPalette(baseAccentHex) {
  const accentHex = normalizeHexColor(baseAccentHex, '#1d4a2e');

  return {
    backgroundHex: mixHexColors(accentHex, '#ffffff', 0.94),
    surfaceHex: '#ffffff',
    accentHex,
    accentSoftHex: mixHexColors(accentHex, '#ffffff', 0.82),
  };
}
