import { useEffect, useState } from 'react';

import { toTrimmedString } from '../utils/text';
import { usePublicStorefrontQr } from '../hooks/usePublicStorefrontQr';
import { printStorefrontQr } from '../services/publicStorefrontQrService';
import styles from './PublicStorefrontQrCard.module.css';

function buildFileNameBase({ officeCode, officeName, nhName }) {
  return [nhName, officeName, officeCode]
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function resolveDisplayName({ officeName, nhName }) {
  const normalizedOfficeName = toTrimmedString(officeName);
  const normalizedNhName = toTrimmedString(nhName);

  return [normalizedNhName, normalizedOfficeName].filter(Boolean).join(' · ');
}

export default function PublicStorefrontQrCard({
  officeCode,
  officeName,
  nhName,
}) {
  const qr = usePublicStorefrontQr({ officeCode });
  const [copyStatus, setCopyStatus] = useState('');
  const displayName =
    resolveDisplayName({ officeName, nhName }) || '사무소명 없음';
  const fileNameBase = buildFileNameBase({ officeCode, officeName, nhName });

  useEffect(() => {
    if (!copyStatus) {
      return undefined;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setCopyStatus('');
    }, 1800);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [copyStatus]);

  async function handleCopyLink() {
    if (!qr.publicUrl) {
      return;
    }

    try {
      await globalThis.navigator?.clipboard?.writeText(qr.publicUrl);
      setCopyStatus('링크를 복사했습니다.');
    } catch {
      setCopyStatus('이 브라우저에서는 링크 복사를 지원하지 않습니다.');
    }
  }

  function handlePrint() {
    if (!qr.publicUrl || !qr.assets.printSvgMarkup) {
      return;
    }

    printStorefrontQr({
      officeName: displayName,
      officeCode,
      publicUrl: qr.publicUrl,
      qrSvgMarkup: qr.assets.printSvgMarkup,
    });
  }

  return (
    <section className={styles.card} data-testid="public-storefront-qr-card">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>공유하기</p>
          <h2 className={styles.title}>고객용 QR</h2>
        </div>
      </div>

      {qr.status === 'loading' ? (
        <div className={styles.content}>
          <div
            className={styles.previewFrame}
            data-testid="public-storefront-qr-loading"
          >
            <p className={styles.placeholderText}>QR을 확인하는 중입니다.</p>
          </div>

          <div className={styles.meta}>
            <p className={styles.officeName}>{displayName}</p>
            <span className={styles.officeCode}>{officeCode || '-'}</span>
            <p className={styles.readyNote}>
              저장된 공개 스토어가 있는지 확인하고 있습니다.
            </p>
          </div>
        </div>
      ) : null}

      {qr.status === 'empty' ? (
        <div
          className={styles.content}
          data-testid="public-storefront-qr-empty"
        >
          <div className={styles.emptyFrame}>
            <p className={styles.helperText}>
              공개 스토어를 저장하면 이곳에 고객용 QR이 생성됩니다.
            </p>
          </div>

          <div className={styles.meta}>
            <p className={styles.officeName}>{displayName}</p>
            <span className={styles.officeCode}>{officeCode || '-'}</span>
            <p className={styles.readyNote}>
              빌더에서 공개 스토어를 한 번 저장한 뒤 대시보드로 돌아오면 최신
              QR을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      ) : null}

      {qr.status === 'error' ? (
        <div
          className={styles.content}
          data-testid="public-storefront-qr-error"
        >
          <div className={styles.errorFrame}>
            <p className={styles.errorText}>
              {qr.errorMessage || '고객용 QR을 불러오지 못했습니다.'}
            </p>
          </div>

          <div className={styles.meta}>
            <p className={styles.officeName}>{displayName}</p>
            <span className={styles.officeCode}>{officeCode || '-'}</span>
            <button
              type="button"
              className={styles.retryButton}
              data-testid="public-storefront-qr-retry"
              onClick={qr.retry}
            >
              다시 시도
            </button>
          </div>
        </div>
      ) : null}

      {qr.status === 'ready' ? (
        <div
          className={styles.content}
          data-testid="public-storefront-qr-ready"
        >
          <div className={styles.previewFrame}>
            {qr.assets.previewSvgMarkup ? (
              <div
                className={styles.previewSvg}
                dangerouslySetInnerHTML={{
                  __html: qr.assets.previewSvgMarkup,
                }}
              />
            ) : (
              <p className={styles.placeholderText}>QR을 생성하는 중입니다.</p>
            )}
          </div>

          <div className={styles.meta}>
            <p className={styles.officeName}>{displayName}</p>

            {copyStatus ? (
              <p className={styles.copyStatus}>{copyStatus}</p>
            ) : null}
            <div className={styles.actions}>
              <a
                href={qr.assets.pngDataUrl}
                download={`${fileNameBase || 'storefront'}-qr.png`}
                className={styles.primaryAction}
              >
                PNG 다운로드
              </a>

              <div className={styles.secondaryActions}>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  data-testid="public-storefront-qr-copy-link"
                  onClick={handleCopyLink}
                >
                  링크 복사
                </button>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  data-testid="public-storefront-qr-print"
                  onClick={handlePrint}
                >
                  출력
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
