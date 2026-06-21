import { toTrimmedString } from '../../../common/utils/text';

export const DEFAULT_PAGE_AI_DESIGN = {
  mainPrompt: '',
  headerOverridePrompt: '',
  categoryChipsOverridePrompt: '',
  searchOverridePrompt: '',
};

export function normalizePageAiDesignInput(pageAiDesign) {
  const source = pageAiDesign ?? {};

  const normalizePrompt = (value) => {
    if (typeof value !== 'string') {
      return '';
    }
    return toTrimmedString(value);
  };

  return {
    mainPrompt: normalizePrompt(source.mainPrompt),
    headerOverridePrompt: normalizePrompt(source.headerOverridePrompt),
    categoryChipsOverridePrompt: normalizePrompt(source.categoryChipsOverridePrompt),
    searchOverridePrompt: normalizePrompt(source.searchOverridePrompt),
  };
}

export function hasPageAiDesignMainPrompt(pageAiDesign) {
  return normalizePageAiDesignInput(pageAiDesign).mainPrompt !== '';
}
