import styles from './PageSection.module.css';

export default function PageSection({
  title,
  description,
  right,
  children,
  className = '',
  headerClassName = '',
  titleClassName = '',
  descriptionClassName = '',
  bodyClassName = '',
  unstyled = false,
  unstyledHeader = false,
}) {
  const sectionClassName = unstyled
    ? className
    : `${styles.section} ${className}`.trim();
  const resolvedHeaderClassName = unstyledHeader
    ? headerClassName
    : `${styles.header} ${headerClassName}`.trim();
  const resolvedTitleClassName = unstyledHeader
    ? titleClassName
    : `${styles.title} ${titleClassName}`.trim();
  const resolvedDescriptionClassName = unstyledHeader
    ? descriptionClassName
    : `${styles.description} ${descriptionClassName}`.trim();

  return (
    <section className={sectionClassName}>
      {(title || description || right) ? (
        <header className={resolvedHeaderClassName}>
          <div>
            {title ? <h2 className={resolvedTitleClassName}>{title}</h2> : null}
            {description ? (
              <p className={resolvedDescriptionClassName}>{description}</p>
            ) : null}
          </div>
          {right ? <div className={styles.right}>{right}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
