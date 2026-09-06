import { Fragment } from 'react';
import NongyakCard from './NongyakCard';
import NongyakUsagePanel from './NongyakUsagePanel';
import styles from './NongyakCardGrid.module.css';

export default function NongyakCardGrid({ tab, items, selectedProductCode, onSelectItem }) {
  return (
    <ul className={styles.grid}>
      {items.map((item) => {
        const isSelected = item.product_code === selectedProductCode;
        return (
          <Fragment key={item.product_code}>
            <NongyakCard
              tab={tab}
              item={item}
              isSelected={isSelected}
              onSelect={onSelectItem}
            />
            {isSelected ? (
              <li className={styles.mobilePanelSlot}>
                <NongyakUsagePanel tab={tab} item={item} />
              </li>
            ) : null}
          </Fragment>
        );
      })}
    </ul>
  );
}
