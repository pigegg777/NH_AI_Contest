import { useEffect, useState } from 'react';

import {
  fetchAllOfficeProductRows,
  fetchPublicOfficeIdentity,
} from '../../office-product-editor/services/office-product-data/publicOfficeProductService';
import StorefrontView from '../components/StorefrontView';
import { fetchStorefrontConfig } from '../services/storefrontConfigService';
import styles from './PublicStorefrontPage.module.css';

const EMPTY_STATE = {
  status: 'placeholder',
  config: null,
  productRows: [],
  officeName: '',
  nhName: '',
};

export default function PublicStorefrontPage({ officeCode }) {
  const normalizedOfficeCode = (officeCode ?? '').trim();
  const [state, setState] = useState(EMPTY_STATE);

  useEffect(() => {
    if (!normalizedOfficeCode) {
      setState(EMPTY_STATE);
      return;
    }

    let isCancelled = false;
    setState({
      status: 'loading',
      config: null,
      productRows: [],
      officeName: '',
      nhName: '',
    });

    Promise.all([
      fetchStorefrontConfig({ officeCode: normalizedOfficeCode }),
      fetchAllOfficeProductRows({ officeCode: normalizedOfficeCode }),
      fetchPublicOfficeIdentity({ officeCode: normalizedOfficeCode }),
    ])
      .then(([config, productRows, officeIdentity]) => {
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
          officeName: officeIdentity?.officeName ?? '',
          nhName: officeIdentity?.nhName ?? '',
        });
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setState({
          status: 'error',
          config: null,
          productRows: [],
          officeName: '',
          nhName: '',
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [normalizedOfficeCode]);

  if (state.status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.statusMessage}>불러오는 중...</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      </div>
    );
  }

  if (state.status === 'placeholder') {
    return (
      <div className={styles.page}>
        <div className={styles.statusMessage}>페이지 준비 중입니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <StorefrontView
        config={state.config}
        productRows={state.productRows}
        officeName={state.officeName}
        nhName={state.nhName}
      />
    </div>
  );
}
