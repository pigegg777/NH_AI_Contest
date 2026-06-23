import { startTransition, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  buildStorefrontPublicUrl,
  buildStorefrontQrAssets,
  printStorefrontQr,
} from './storefrontQrExportService';
import styles from './StorefrontQrExportCard.module.css';

const EMPTY_ASSETS = {
  previewSvgMarkup: '',
  printSvgMarkup: '',
  pngDataUrl: '',
  svgDownloadUrl: '',
};

function buildFileNameBase({ officeCode, officeName }) {
  return [officeName, officeCode]
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export default function StorefrontQrExportCard({
  qrExport,
  isDialogOpen,
  onCloseDialog,
}) {
  const [assets, setAssets] = useState(EMPTY_ASSETS);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const publicUrl = qrExport?.isAvailable
    ? buildStorefrontPublicUrl({ officeCode: qrExport.officeCode })
    : '';
  const fileNameBase = buildFileNameBase(qrExport ?? {});
  const note = qrExport?.isAvailable
    ? qrExport.hasUnsavedChanges
      ? '현재 QR은 마지막 저장된 공개 페이지 기준입니다.'
      : '현재 저장된 공개 페이지 QR입니다.'
    : '초안 저장 후 고객용 공개 QR을 만들 수 있습니다.';

  useEffect(() => {
    let isCancelled = false;

    if (!publicUrl) {
      setAssets(EMPTY_ASSETS);
      setIsLoadingAssets(false);
      return undefined;
    }

    setIsLoadingAssets(true);

    buildStorefrontQrAssets({ publicUrl })
      .then((nextAssets) => {
        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setAssets(nextAssets);
        });
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setAssets(EMPTY_ASSETS);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingAssets(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [publicUrl]);

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
    if (!publicUrl) {
      return;
    }

    try {
      await globalThis.navigator?.clipboard?.writeText(publicUrl);
      setCopyStatus('링크가 복사되었습니다.');
    } catch {
      setCopyStatus('링크 복사를 지원하지 않는 환경입니다.');
    }
  }

  function handlePrint() {
    if (!publicUrl || !assets.printSvgMarkup) {
      return;
    }

    printStorefrontQr({
      officeName: qrExport.officeName,
      officeCode: qrExport.officeCode,
      publicUrl,
      qrSvgMarkup: assets.printSvgMarkup,
    });
  }

  return (
    <>
      <section className={styles.card} data-testid="storefront-qr-export-card">
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.eyebrow}>공개 스토어 QR</p>
            <h3 className={styles.title}>고객용 QR 내보내기</h3>
            <p className={styles.description}>
              사무소 공개 스토어 링크를 QR로 배포하거나 출력할 수 있습니다.
            </p>
          </div>

          <span
            className={
              qrExport?.isAvailable ? styles.statusBadge : styles.statusBadgeMuted
            }
          >
            {qrExport?.isAvailable ? '배포 가능' : '저장 필요'}
          </span>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.previewFrame}>
            {qrExport?.isAvailable && assets.previewSvgMarkup ? (
              <div
                className={styles.previewSvg}
                dangerouslySetInnerHTML={{ __html: assets.previewSvgMarkup }}
              />
            ) : (
              <p className={styles.previewPlaceholder}>
                {isLoadingAssets ? 'QR 생성 중' : '저장 후 QR이 표시됩니다.'}
              </p>
            )}
          </div>

          <div className={styles.meta}>
            <p className={styles.officeName}>{qrExport?.officeName || '사무소명 없음'}</p>
            <span className={styles.officeCode}>{qrExport?.officeCode || '-'}</span>

            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.publicLink}
              >
                공개 링크 열기
              </a>
            ) : (
              <p className={styles.linkPlaceholder}>
                저장 후 공개 링크가 여기에 표시됩니다.
              </p>
            )}

            <p className={styles.note}>{note}</p>
          </div>
        </div>
      </section>

      {isDialogOpen && qrExport?.isAvailable
        ? createPortal(
            <div
              className={styles.dialogOverlay}
              role="presentation"
              onClick={onCloseDialog}
            >
              <div
                className={styles.dialog}
                role="dialog"
                aria-label="스토어 QR 내보내기"
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.dialogHeader}>
                  <div>
                    <h3 className={styles.dialogTitle}>스토어 QR 내보내기</h3>
                    <p className={styles.dialogDescription}>
                      PNG, SVG 다운로드와 링크 복사, 출력용 보기를 한 번에 제공합니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onCloseDialog}
                  >
                    닫기
                  </button>
                </div>

                <div className={styles.dialogBody}>
                  <div className={styles.dialogPreviewFrame}>
                    {assets.printSvgMarkup ? (
                      <div
                        className={styles.dialogQr}
                        dangerouslySetInnerHTML={{ __html: assets.printSvgMarkup }}
                      />
                    ) : (
                      <p className={styles.dialogPlaceholder}>QR 생성 중</p>
                    )}
                  </div>

                  <div className={styles.dialogMeta}>
                    <div>
                      <p className={styles.officeName}>
                        {qrExport.officeName || '사무소명 없음'}
                      </p>
                      <span className={styles.officeCode}>
                        {qrExport.officeCode || '-'}
                      </span>
                    </div>

                    <div className={styles.dialogLinkBox}>
                      <span className={styles.dialogLinkLabel}>공개 링크</span>
                      <span className={styles.dialogLinkValue}>{publicUrl}</span>
                    </div>

                    {copyStatus ? (
                      <p className={styles.copyStatus}>{copyStatus}</p>
                    ) : null}

                    <div className={styles.dialogActions}>
                      {assets.pngDataUrl ? (
                        <a
                          href={assets.pngDataUrl}
                          download={`${fileNameBase || 'storefront'}-qr.png`}
                          className={styles.actionLink}
                        >
                          PNG 다운로드
                        </a>
                      ) : null}

                      {assets.svgDownloadUrl ? (
                        <a
                          href={assets.svgDownloadUrl}
                          download={`${fileNameBase || 'storefront'}-qr.svg`}
                          className={styles.actionLink}
                        >
                          SVG 다운로드
                        </a>
                      ) : null}

                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={handleCopyLink}
                      >
                        링크 복사
                      </button>

                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={handlePrint}
                      >
                        출력
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
