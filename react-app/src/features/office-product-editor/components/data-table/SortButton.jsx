import styles from './DataTable.module.css';

const SORT_ICON_ASC_SRC = new URL(
  '../../assets/arrow-drop-up-line.png',
  import.meta.url,
).href;

const SORT_ICON_DESC_SRC = new URL(
  '../../assets/arrow-drop-down-line.png',
  import.meta.url,
).href;

function renderSortButtonLabel(column) {
  if (column.key === 'img_url') {
    return (
      <>
        이미지
        <br />
        URL
      </>
    );
  }

  if (column.key === 'product_url') {
    return (
      <>
        상품
        <br />
        URL
      </>
    );
  }

  return column.label;
}

export function SortButton({ column, sortState, onSortChange }) {
  const isActive = sortState?.key === column.key;
  const nextDirection =
    !isActive || sortState.direction === 'desc' ? 'asc' : 'desc';
  const isDescending = isActive && sortState.direction === 'desc';
  const sortIndicatorSrc = isDescending
    ? SORT_ICON_DESC_SRC
    : SORT_ICON_ASC_SRC;
  const isMultilineLabel =
    column.key === 'img_url' || column.key === 'product_url';

  return (
    <button
      type="button"
      className={`${styles.sortButton} ${isActive ? styles.sortButtonActive : ''} ${isMultilineLabel ? styles.sortButtonMultiline : ''}`.trim()}
      onClick={() =>
        onSortChange({ key: column.key, direction: nextDirection })
      }
    >
      <span
        className={
          isMultilineLabel ? styles.sortButtonLabelMultiline : undefined
        }
      >
        {renderSortButtonLabel(column)}
      </span>
      {isActive ? (
        <span
          className={`${styles.sortIndicator} ${isDescending ? styles.sortIndicatorDesc : ''}`.trim()}
          aria-hidden="true"
        >
          <img
            className={styles.sortIndicatorImage}
            src={sortIndicatorSrc}
            alt=""
          />
        </span>
      ) : null}
    </button>
  );
}
