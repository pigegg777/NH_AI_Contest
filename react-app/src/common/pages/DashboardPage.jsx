import styles from './DashboardPage.module.css';

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.5-2.5 2-5 2-8 0-4-1.5-7-2-10z" />
      <path d="M12 12c2.5-1 5-1.5 8-2" />
      <path d="M12 22v-4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 16V11M12 16V8M17 16v-4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

const FEATURES = [
  {
    key: 'fertilizer',
    Icon: LeafIcon,
    title: '농자재 정보',
    description: '비료·농약·기타자재의 종류·가격·지원 정보를 검색하고 비교하세요.',
  },
  {
    key: 'excel-extract',
    Icon: ChartIcon,
    title: '데이터 설정/수정',
    description: '엑셀 파일에서 판매단가를 자동으로 추출하고 데이터를 설정·수정하세요.',
  },
];

export default function DashboardPage({ user, onNavigate }) {
  const name = user?.name;
  const orgLabel = [user?.nh_name, user?.office_name].filter(Boolean).join(' · ');

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        {name && <p className={styles.greeting}>안녕하세요, <strong>{name}</strong>님</p>}
        {orgLabel && <p className={styles.org}>{orgLabel}</p>}
        <h1 className={styles.systemTitle}>무엇을 도와드릴까요?</h1>
      </div>

      <div className={styles.grid}>
        {FEATURES.map(({ key, Icon, title, description }) => (
          <button
            key={key}
            type="button"
            className={styles.card}
            onClick={() => onNavigate(key)}
          >
            <div className={styles.cardIcon}>
              <Icon />
            </div>
            <div className={styles.cardContent}>
              <h2 className={styles.cardTitle}>{title}</h2>
              <p className={styles.cardDesc}>{description}</p>
            </div>
            <span className={styles.cardAction}>
              바로가기 <ArrowIcon />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
