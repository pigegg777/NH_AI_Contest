import nhCyberSymbolUrl from '../../../common/assets/nh_cyber_symbol.png';
import styles from './AuthShell.module.css';

const BRAND_NAME = 'NH AI Agent 경진대회';

export default function AuthShell({ title, children }) {
  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <div className={styles.brandLockup}>
          <img className={styles.brandSymbol} src={nhCyberSymbolUrl} alt="" />
          <span className={styles.brandName}>{BRAND_NAME}</span>
        </div>
        <div className={styles.brandCopy}>
          <p className={styles.brandStatement}>
            사무소 농자재 정보 페이지 자동 생성
          </p>
          <p className={styles.brandSupport}>
            판매장 상품 데이터를 올리면 고객에게 QR 코드로 안내할 페이지를 만들어
            줍니다.
          </p>
        </div>
      </aside>

      <main className={styles.formPanel}>
        <div className={styles.form}>
          <h1 className={styles.title}>{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
