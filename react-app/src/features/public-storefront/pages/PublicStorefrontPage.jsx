import { useEffect, useState } from 'react';

import {
  fetchAllOfficeProductRows,
  fetchPublicOfficeIdentity,
} from '../../office-product-editor/services/office-product-data/publicOfficeProductService';
import { fetchStorefrontConfig } from '../../storefront-config/model/storefrontConfigOrchestrator';
import styles from './PublicStorefrontPage.module.css';
import PublicStorefrontScreen from '../components/PublicStorefrontScreen';

const EMPTY_STATE = {
  status: 'placeholder',
  config: null,
  productRows: [],
  officeName: '',
  productUpdatedAt: '',
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
      productUpdatedAt: '',
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
          productUpdatedAt: officeIdentity?.productUpdatedAt ?? '',
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
          productUpdatedAt: '',
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
        <div className={styles.statusMessage}>불러오는 중…</div>
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
        <div className={styles.statusMessage}>아직 공개된 상품 정보가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PublicStorefrontScreen
        config={state.config}
        productRows={state.productRows}
        officeName={state.officeName}
        nhName={state.nhName}
        productUpdatedAt={state.productUpdatedAt}
      />
    </div>
  );
}
