import styles from './StepShell.module.css';

export default function StepShell({ eyebrow, title, description, children }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.title}>{title}</h2>
        </div>
      </div>
      {description ? <div className={styles.description}>{description}</div> : null}
      {children}
    </section>
  );
}
