import PublicStorefrontScreen from "../../public-storefront/components/PublicStorefrontScreen";
import StorefrontConversationPanel from "../components/chat-builder/StorefrontConversationPanel";
import { useStorefrontBuilder } from "../hooks/useStorefrontBuilder";
import styles from "./StorefrontBuilderPage.module.css";

export default function StorefrontBuilderPage({ officeCode, nhName }) {
  const builder = useStorefrontBuilder({ officeCode, nhName });

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
          <StorefrontConversationPanel builder={builder} />

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
                  config={builder.previewConfig}
                  productRows={builder.previewProductRows}
                  officeName={builder.officeName}
                  nhName={builder.nh_name}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
