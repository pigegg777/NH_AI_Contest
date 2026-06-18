import styles from '../pages/StorefrontBuilderPage.module.css';

export default function StepShell({ eyebrow, title, description, children }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.title}>{title}</h2>
        </div>
      </div>
      {description ? <p className={styles.description}>{description}</p> : null}
      {children}
    </section>
  );
}
