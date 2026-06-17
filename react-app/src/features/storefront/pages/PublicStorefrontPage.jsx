import { useEffect, useState } from 'react';

import panelStyles from '../../office-product-editor/components/shared/panel.module.css';
import { fetchAllOfficeProductRows } from '../../office-product-editor/services/officeProductDataService';
import StorefrontView from '../components/StorefrontView';
import { fetchStorefrontConfig } from '../services/storefrontConfigService';
import styles from './PublicStorefrontPage.module.css';

const EMPTY_STATE = { status: 'placeholder', config: null, productRows: [] };

export default function PublicStorefrontPage({ officeCode }) {
  const normalizedOfficeCode = (officeCode ?? '').trim();
  const [state, setState] = useState(EMPTY_STATE);

  useEffect(() => {
    if (!normalizedOfficeCode) {
      setState(EMPTY_STATE);
      return;
    }

    let isCancelled = false;
    setState({ status: 'loading', config: null, productRows: [] });

    Promise.all([
      fetchStorefrontConfig({ officeCode: normalizedOfficeCode }),
      fetchAllOfficeProductRows({ officeCode: normalizedOfficeCode }),
    ])
      .then(([config, productRows]) => {
        if (isCancelled) {
          return;
        }

        if (!config || productRows.length === 0) {
          setState(EMPTY_STATE);
          return;
        }

        setState({
          status: 'ready',
          config,
          productRows,
        });
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setState({ status: 'error', config: null, productRows: [] });
      });

    return () => {
      isCancelled = true;
    };
  }, [normalizedOfficeCode]);

  if (state.status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={panelStyles.statusMessage}>불러오는 중...</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={styles.page}>
        <div className={panelStyles.errorBox}>페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
      </div>
    );
  }

  if (state.status === 'placeholder') {
    return (
      <div className={styles.page}>
        <div className={panelStyles.statusMessage}>페이지 준비 중입니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <StorefrontView config={state.config} productRows={state.productRows} />
    </div>
  );
}
