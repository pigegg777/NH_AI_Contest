import PublicStorefrontScreen from "../../public-storefront/components/PublicStorefrontScreen";
import StorefrontChatWorkspace from "../components/builder-workspace/StorefrontChatWorkspace";
import { useStorefrontBuilder } from "../hooks/useStorefrontBuilder";
import { useStorefrontChatSession } from "../hooks/useStorefrontChatSession";
import styles from "./StorefrontBuilderPage.module.css";

export default function StorefrontBuilderPage({ officeCode, nhName }) {
  const session = useStorefrontChatSession();
  const builder = useStorefrontBuilder({ officeCode, nhName });
  const previewConfig =
    session.mode === "data" && builder.dataMode?.previewConfig
      ? builder.dataMode.previewConfig
      : builder.previewConfig;

  if (builder.status === "loading") {
    return (
      <div className={styles.page}>
        <div className={styles.statusMessage}>
          스토어프론트 빌더를 불러오는 중..
        </div>
      </div>
    );
  }

  if (builder.status === "error") {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          스토어프론트 빌더를 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        <div className={styles.leftColumn}>
          <StorefrontChatWorkspace session={session} builder={builder} />

          {builder.status === "save-error" ? (
            <div className={styles.errorBox}>
              {builder.errorMessage ||
                "스토어프론트 초안을 저장하지 못했습니다."}
            </div>
          ) : null}
        </div>

        <section className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <div>
              <p className={styles.eyebrow}>실시간 미리보기</p>
              <h3 className={styles.previewTitle}>페이지 미리보기</h3>
            </div>
          </div>

          <div className={styles.previewStage}>
            <div
              className={styles.previewDevice}
              data-testid="mobile-preview-device"
            >
              <div className={styles.previewDeviceSpeaker} />
              <div className={styles.previewDeviceScreen}>
                <PublicStorefrontScreen
                  config={previewConfig}
                  productRows={builder.previewProductRows}
                  officeName={builder.officeName}
                  nhName={builder.nh_name}
                  selectedSectionName={builder.previewSelectedCategoryName}
                  productUpdatedAt={builder.previewProductUpdatedAt}
                  // 손님이 보는 그대로 담기 버튼까지 보여준다. 핸들러는 넘기지
                  // 않으므로 눌리지 않고, 사장님 브라우저에도 아무것도 안 쌓인다.
                  isCartPreview
                  // 폰 안에서 대분류를 누르면 '적용된 디자인'이 그 분류를
                  // 따라간다. 편집 대상은 바뀌지 않는다 — 읽기만 한다.
                  onActiveCategoryChange={builder.notePreviewedCategory}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
