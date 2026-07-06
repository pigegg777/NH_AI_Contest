import QRCode from 'qrcode';

import { toTrimmedString } from '../../../common/utils/text';

const QR_DARK_HEX = '#173223';
const QR_LIGHT_HEX = '#ffffff';

function trimTrailingSlashes(value) {
  return value.replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createQrOptions(width) {
  return {
    type: 'svg',
    width,
    margin: 1,
    color: {
      dark: QR_DARK_HEX,
      light: QR_LIGHT_HEX,
    },
  };
}

function resolveStorefrontPublicAppUrl(
  env = import.meta.env,
  location = globalThis.location,
) {
  const configuredUrl = toTrimmedString(env?.VITE_PUBLIC_APP_URL);

  if (configuredUrl) {
    return trimTrailingSlashes(configuredUrl);
  }

  return trimTrailingSlashes(toTrimmedString(location?.origin));
}

export function buildStorefrontPublicUrl({
  officeCode,
  env = import.meta.env,
  location = globalThis.location,
} = {}) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    return '';
  }

  const baseUrl = resolveStorefrontPublicAppUrl(env, location);

  if (!baseUrl) {
    return '';
  }

  return `${baseUrl}/?tool=store&office=${encodeURIComponent(normalizedOfficeCode)}`;
}

function createSvgDownloadUrl(svgMarkup) {
  const normalizedSvgMarkup = toTrimmedString(svgMarkup);

  if (!normalizedSvgMarkup) {
    return '';
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    normalizedSvgMarkup,
  )}`;
}

export async function buildStorefrontQrAssets({
  publicUrl,
  previewWidth = 160,
  exportWidth = 1200,
} = {}) {
  const normalizedPublicUrl = toTrimmedString(publicUrl);

  if (!normalizedPublicUrl) {
    return {
      previewSvgMarkup: '',
      printSvgMarkup: '',
      pngDataUrl: '',
      svgDownloadUrl: '',
    };
  }

  const [previewSvgMarkup, printSvgMarkup, pngDataUrl] = await Promise.all([
    QRCode.toString(normalizedPublicUrl, createQrOptions(previewWidth)),
    QRCode.toString(normalizedPublicUrl, createQrOptions(exportWidth)),
    QRCode.toDataURL(normalizedPublicUrl, {
      width: exportWidth,
      margin: 1,
      color: {
        dark: QR_DARK_HEX,
        light: QR_LIGHT_HEX,
      },
    }),
  ]);

  return {
    previewSvgMarkup,
    printSvgMarkup,
    pngDataUrl,
    svgDownloadUrl: createSvgDownloadUrl(printSvgMarkup),
  };
}

function buildStorefrontQrPrintHtml({
  officeName,
  officeCode,
  publicUrl,
  qrSvgMarkup,
} = {}) {
  const safeOfficeName = escapeHtml(toTrimmedString(officeName) || '사무소');
  const safeOfficeCode = escapeHtml(toTrimmedString(officeCode));
  const safePublicUrl = escapeHtml(toTrimmedString(publicUrl));
  const safeQrSvgMarkup = toTrimmedString(qrSvgMarkup);

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${safeOfficeName} QR 출력</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        font-family: "Segoe UI", "Noto Sans KR", sans-serif;
        color: #173223;
        background: #f6f8f3;
      }

      .sheet {
        max-width: 720px;
        margin: 0 auto;
        padding: 32px;
        border-radius: 24px;
        background: #ffffff;
        border: 1px solid rgba(23, 50, 35, 0.12);
      }

      .eyebrow {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #15803d;
      }

      h1 {
        margin: 0;
        font-size: 30px;
        line-height: 1.2;
      }

      .meta {
        margin-top: 16px;
        display: grid;
        gap: 6px;
        font-size: 14px;
      }

      .qr {
        margin: 28px auto 24px;
        width: 320px;
        height: 320px;
        padding: 18px;
        display: grid;
        place-items: center;
        border-radius: 28px;
        background: #ffffff;
        border: 1px solid rgba(23, 50, 35, 0.12);
      }

      .qr svg {
        display: block;
        width: 100%;
        height: auto;
      }

      .link {
        margin: 0;
        font-size: 15px;
        line-height: 1.6;
        word-break: break-all;
      }

      .note {
        margin: 20px 0 0;
        font-size: 13px;
        line-height: 1.6;
        color: #4b6352;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <p class="eyebrow">고객용 스토어 QR</p>
      <h1>${safeOfficeName}</h1>
      <div class="meta">
        <strong>사무소 코드: ${safeOfficeCode || '-'}</strong>
      </div>
      <div class="qr">${safeQrSvgMarkup}</div>
      <p class="link">${safePublicUrl}</p>
      <p class="note">스캔이 어려우면 이 주소를 직접 입력해 주세요.</p>
    </main>
  </body>
</html>`;
}

export function printStorefrontQr({
  officeName,
  officeCode,
  publicUrl,
  qrSvgMarkup,
  windowObject = globalThis.window,
} = {}) {
  const printWindow = windowObject?.open?.('', '_blank', 'noopener,noreferrer');

  if (!printWindow) {
    return false;
  }

  printWindow.document.write(
    buildStorefrontQrPrintHtml({
      officeName,
      officeCode,
      publicUrl,
      qrSvgMarkup,
    }),
  );
  printWindow.document.close();
  printWindow.focus?.();
  printWindow.print?.();

  return true;
}
