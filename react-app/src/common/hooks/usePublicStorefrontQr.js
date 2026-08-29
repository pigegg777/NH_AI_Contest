import { startTransition, useEffect, useState } from 'react';

import { toTrimmedString } from '../utils/text';
import { fetchStorefrontConfig } from '../../features/storefront-config/model/storefrontConfigOrchestrator';
import {
  buildStorefrontPublicUrl,
  buildStorefrontQrAssets,
} from '../services/publicStorefrontQrService';

const LOAD_ERROR_MESSAGE = '고객용 QR을 불러오지 못했습니다.';
const EMPTY_ASSETS = {
  previewSvgMarkup: '',
  printSvgMarkup: '',
  pngDataUrl: '',
  svgDownloadUrl: '',
};

function createBaseState(status) {
  return {
    status,
    config: null,
    publicUrl: '',
    assets: EMPTY_ASSETS,
    errorMessage: '',
  };
}

function hasSavedStorefrontConfig(config) {
  return Array.isArray(config?.categoryConfigs) && config.categoryConfigs.length > 0;
}

export function usePublicStorefrontQr({ officeCode }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState(() =>
    createBaseState(normalizedOfficeCode ? 'loading' : 'empty'),
  );

  useEffect(() => {
    if (!normalizedOfficeCode) {
      setState(createBaseState('empty'));
      return undefined;
    }

    let isCancelled = false;
    setState(createBaseState('loading'));

    async function loadQrState() {
      try {
        const config = await fetchStorefrontConfig({
          officeCode: normalizedOfficeCode,
        });

        if (isCancelled) {
          return;
        }

        if (!hasSavedStorefrontConfig(config)) {
          setState({
            ...createBaseState('empty'),
            config,
          });
          return;
        }

        const publicUrl = buildStorefrontPublicUrl({
          officeCode: normalizedOfficeCode,
        });

        if (!publicUrl) {
          setState({
            ...createBaseState('error'),
            config,
            errorMessage: LOAD_ERROR_MESSAGE,
          });
          return;
        }

        const assets = await buildStorefrontQrAssets({ publicUrl });

        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setState({
            status: 'ready',
            config,
            publicUrl,
            assets,
            errorMessage: '',
          });
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setState({
          ...createBaseState('error'),
          errorMessage:
            error instanceof Error && error.message
              ? error.message
              : LOAD_ERROR_MESSAGE,
        });
      }
    }

    loadQrState();

    return () => {
      isCancelled = true;
    };
  }, [normalizedOfficeCode, reloadToken]);

  function retry() {
    if (!normalizedOfficeCode) {
      return;
    }

    setReloadToken((current) => current + 1);
  }

  return {
    ...state,
    retry,
  };
}
