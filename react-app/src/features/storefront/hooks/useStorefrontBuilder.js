import { useEffect, useRef, useState } from "react";

import { toTrimmedString } from "../../../common/utils/text";
import { fetchOfficeProductDataEntries } from "../../office-product-editor/services/office-product-data/officeProductDataReadService";
import { CARD_AI_TARGET_SCOPE_OPTIONS } from "../model/card-design/ai-request/cardAiDesignModel";
import { CARD_DESIGN_LAYOUT_OPTIONS } from "../model/card-design/ai-request/cardDesignLayoutOptions";
import { getCardDesignScopeGuide } from "../model/card-design/ai-request/cardDesignScopeGuide";
import { PAGE_AI_TARGET_SCOPE_OPTIONS } from "../model/page-design/ai-request/pageAiDesignModel";
import { getPageDesignScopeGuide } from "../model/page-design/ai-request/pageDesignScopeGuide";
import { normalizeInformationEntries } from "../model/storefront-config/informationEntriesModel";
import {
  DEFAULT_NAV_CONFIG,
  DEFAULT_PAGE_CONFIG,
  STOREFRONT_FIELD_LABELS,
  buildStorefrontSavePayload,
  deriveAvailableCategoryFields,
  deriveEffectiveScalarKeys,
  deriveProductCategoryOptions,
  findCategoryConfigRow,
  flattenProductEntries,
  normalizeNavConfig,
  normalizePageConfig,
  resolveCategoryDraft,
  resolveOfficeInfoOwnership,
} from "../model/storefront-config/storefrontBuilderModel";
import { sanitizeMobileUiTree } from "../model/storefront-config/storefrontUiModel";
import {
  fetchStorefrontConfig,
  upsertStorefrontConfig,
} from "../model/storefront-config/storefrontConfigOrchestrator";
import { getStorefrontDesignComposerCopy } from "../components/builder-workspace/mode-choice/storefrontChatModes";
import { buildDerivedPageTitle } from "../model/storefront-view/pageTitleModel";
import { resolveLatestProductUpdatedAt } from "../model/storefront-view/productUpdatedAtModel";
import { useCardAiDesign } from "./useCardAiDesign";
import { useDataSelectionDraft } from "./useDataSelectionDraft";
import { usePageAiDesign } from "./usePageAiDesign";
import { useStorefrontChatSession } from "./useStorefrontChatSession";

const FETCH_ERROR_MESSAGE = "스토어프론트 빌더를 불러오지 못했습니다.";
const COMMON_TAB_ID = "common";
const MAX_SHARED_AI_HISTORY_MESSAGES = 12;
const ALL_SCOPE_CHAT_LABEL = "전체";
const FALLBACK_CATEGORY_CHAT_LABEL = "카드";

function getInitialCategoryName(productEntries, existingConfig) {
  const existingCategoryName = findCategoryConfigRow(
    existingConfig?.categoryConfigs,
    existingConfig?.categoryConfigs?.[0]?.productCategoryName,
  )?.productCategoryName;

  if (existingCategoryName) {
    return existingCategoryName;
  }

  return productEntries?.[0]?.categoryName ?? "";
}

function resolveScopeLabel(scopeOptions, scopeId) {
  if (!scopeId) {
    return "";
  }

  return scopeOptions.find((option) => option.id === scopeId)?.label ?? "";
}

function cloneValue(value) {
  if (value == null) {
    return value;
  }

  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function buildSharedHistory(messages, designTarget) {
  return messages
    .filter(
      (message) =>
        message?.kind === "chat-message" &&
        typeof message?.text === "string" &&
        (!designTarget || message?.designTarget === designTarget),
    )
    .slice(-MAX_SHARED_AI_HISTORY_MESSAGES)
    .map((message) => ({ role: message.role, text: message.text }));
}

function buildSharedThreadMessage({
  role,
  mode,
  designTarget,
  targetLabel,
  scope,
  scopeLabel,
  text,
  suggestion,
  warningMessage,
}) {
  return {
    role,
    kind: "chat-message",
    mode,
    target: mode,
    designTarget,
    targetLabel,
    scope,
    scopeLabel,
    text,
    suggestion,
    warningMessage,
  };
}

function resolveChatScopeLabel(designTarget, targetScope) {
  if (designTarget === "common") {
    return resolveScopeLabel(PAGE_AI_TARGET_SCOPE_OPTIONS, targetScope);
  }

  if (designTarget === "category") {
    return resolveScopeLabel(CARD_AI_TARGET_SCOPE_OPTIONS, targetScope);
  }

  return "";
}

export function useStorefrontBuilder({ officeCode, nhName }) {
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [productEntries, setProductEntries] = useState([]);
  const [existingConfig, setExistingConfig] = useState(null);
  const [hiddenProducts, setHiddenProducts] = useState([]);
  const [selectedProductCategoryName, setSelectedProductCategoryName] =
    useState("");
  const [selectedMediumCategories, setSelectedMediumCategories] = useState([]);
  const [representativeMediumCategory, setRepresentativeMediumCategory] =
    useState("");
  const pageAi = usePageAiDesign({ officeCode });
  const cardAi = useCardAiDesign({ officeCode });
  const chatSession = useStorefrontChatSession();
  const [navConfig, setNavConfig] = useState(DEFAULT_NAV_CONFIG);
  const [mobileUiTree, setMobileUiTree] = useState(() =>
    sanitizeMobileUiTree(DEFAULT_PAGE_CONFIG.mobileUiTree),
  );
  const [designTarget, setDesignTarget] = useState("common");
  const [isCommonDataTab, setIsCommonDataTab] = useState(true);
  // The merchant-authored copy, kept apart from the field checkboxes. Only the
  // page title is a single string now — the office and category guidance are
  // repeatable entry lists, the same shape the storefront reads.
  const [textDraft, setTextDraftState] = useState({ pageTitle: "" });
  const [officeInfoEntries, setOfficeInfoEntries] = useState([]);
  const [categoryInfoEntries, setCategoryInfoEntries] = useState([]);
  const [composerDrafts, setComposerDrafts] = useState({
    common: "",
    category: "",
  });
  const [pendingComposerApply, setPendingComposerApply] = useState({
    common: false,
    category: false,
  });
  const commonDraftRef = useRef(null);
  const categoryDraftRef = useRef(null);
  // Unsaved guidance per category, so hopping to another tab and back does not
  // throw away what the merchant just typed.
  const categoryInfoEntriesDraftsRef = useRef(new Map());
  const previousChatModeRef = useRef(chatSession.mode);
  const previousCategoryRef = useRef("");

  const allProductRows = flattenProductEntries(productEntries);
  const currentEntry =
    productEntries.find(
      (entry) => entry?.categoryName === selectedProductCategoryName,
    ) ?? null;
  const officeName = toTrimmedString(
    currentEntry?.officeName ?? productEntries[0]?.officeName,
  );
  // Shown as the page-title input's placeholder. Comes from the same helper the
  // storefront falls back to, so the two can never drift apart.
  const derivedPageTitle = buildDerivedPageTitle({ nhName, officeName });
  const productCategoryOptions = deriveProductCategoryOptions(
    productEntries,
    existingConfig,
  );
  const availableCategoryFields = deriveAvailableCategoryFields(
    currentEntry?.rows,
  );
  const effectiveScalarKeys = deriveEffectiveScalarKeys(currentEntry?.rows);
  // The copy the merchant is typing right now, shaped the way the save payload
  // takes it. Both the preview and the save read this one value, so what they
  // see while typing is exactly what gets written.
  const draftNavConfig = {
    ...navConfig,
    title: textDraft.pageTitle,
  };
  const dataSelection = useDataSelectionDraft({
    allowedScalarKeys: effectiveScalarKeys,
    initialFields: ["product_name"],
  });

  function captureCommonDraft() {
    const baseline = cloneValue(pageAi.pageStyle);

    commonDraftRef.current = baseline;
    setComposerApplyPending("common", false);
    pageAi.hydratePageStyle(baseline);
  }

  function captureCategoryDraft() {
    const baseline = {
      cardStyle: cloneValue(cardAi.cardStyle),
      bodySlots: cloneValue(cardAi.bodySlots),
    };

    categoryDraftRef.current = baseline;
    setComposerApplyPending("category", false);
    cardAi.hydrateCardStyle(baseline.cardStyle, baseline.bodySlots);
  }

  function setComposerDraft(mode, value) {
    setComposerDrafts((current) => ({
      ...current,
      [mode]: value,
    }));
  }

  function setComposerApplyPending(mode, value) {
    setPendingComposerApply((current) => ({
      ...current,
      [mode]: value,
    }));
  }

  function markDirty() {
    setStatus((current) => (current === "saved" ? "ready" : current));
  }

  function setTextDraft(fieldId, value) {
    markDirty();
    setTextDraftState((current) => ({ ...current, [fieldId]: value }));
  }

  function changeOfficeInfoEntries(nextEntries) {
    markDirty();
    setOfficeInfoEntries(nextEntries);
  }

  function changeCategoryInfoEntries(nextEntries) {
    if (selectedProductCategoryName) {
      categoryInfoEntriesDraftsRef.current.set(
        selectedProductCategoryName,
        nextEntries,
      );
    }

    markDirty();
    setCategoryInfoEntries(nextEntries);
  }

  function changeCardsPerRow(value) {
    cardAi.setCardsPerRow(value);
    markDirty();
    setComposerApplyPending("category", true);
  }

  function changeStructuralPreset(value) {
    cardAi.setStructuralPreset(value);
    markDirty();
    setComposerApplyPending("category", true);
  }

  // The title rides the same save payload the design composer already writes, so
  // typing it only has to arm that composer's 저장하기.
  function changePageTitle(value) {
    setTextDraft("pageTitle", value);
    setComposerApplyPending("common", true);
  }

  // Both load paths resolve the saved copy the same way navConfig does, so the
  // input box always shows exactly what the storefront is rendering today.
  function hydratePageTextDraft(config, normalizedPageConfig) {
    setTextDraftState({
      pageTitle: toTrimmedString(
        config?.navConfig?.title ?? normalizedPageConfig.nav.title,
      ),
    });
    // normalizePageConfig already falls the old nav subtitle back into an
    // unlabeled entry, so the editor opens on exactly what the storefront
    // renders today.
    setOfficeInfoEntries(normalizedPageConfig.officeInfo);
  }

  function hydrateCategoryDraft(
    categoryName,
    nextProductEntries,
    nextExistingConfig,
  ) {
    const resolvedCategoryName = categoryName || "";
    const categoryRow = findCategoryConfigRow(
      nextExistingConfig?.categoryConfigs,
      resolvedCategoryName,
    );
    const nextCategoryInfoEntries =
      categoryInfoEntriesDraftsRef.current.has(resolvedCategoryName)
        ? categoryInfoEntriesDraftsRef.current.get(resolvedCategoryName)
        : normalizeInformationEntries(categoryRow?.categoryConfig?.info, {
            legacyText: categoryRow?.categoryConfig?.description,
          });
    const resolvedDraft = resolveCategoryDraft({
      productCategoryName: resolvedCategoryName,
      productEntries: nextProductEntries,
      existingConfig: nextExistingConfig,
    });

    setSelectedProductCategoryName(resolvedCategoryName);
    setSelectedMediumCategories(resolvedDraft.selectedMediumCategories);
    setRepresentativeMediumCategory(resolvedDraft.representativeMediumCategory);
    dataSelection.reset(
      resolvedDraft.cardFields,
      deriveEffectiveScalarKeys(resolvedDraft.entry?.rows),
    );
    cardAi.hydrateCardStyle(resolvedDraft.cardStyle, resolvedDraft.bodySlots);
    setCategoryInfoEntries(nextCategoryInfoEntries);
    categoryDraftRef.current = {
      cardStyle: cloneValue(resolvedDraft.cardStyle),
      bodySlots: cloneValue(resolvedDraft.bodySlots),
    };
  }

  useEffect(() => {
    let isCancelled = false;

    setStatus("loading");
    setErrorMessage("");

    Promise.all([
      fetchOfficeProductDataEntries({ officeCode }),
      fetchStorefrontConfig({ officeCode }),
    ])
      .then(([nextProductEntries, config]) => {
        if (isCancelled) {
          return;
        }

        const normalizedPageConfig = normalizePageConfig(config?.pageConfig);
        const nextCategoryName = getInitialCategoryName(
          nextProductEntries,
          config,
        );

        categoryInfoEntriesDraftsRef.current.clear();
        setProductEntries(nextProductEntries);
        setExistingConfig(config);
        setHiddenProducts(config?.hiddenProducts ?? []);
        pageAi.hydratePageStyle(normalizedPageConfig.pageStyle);
        setMobileUiTree(
          sanitizeMobileUiTree(normalizedPageConfig.mobileUiTree),
        );
        setNavConfig(
          normalizeNavConfig({
            title: config?.navConfig?.title ?? normalizedPageConfig.nav.title,
            subtitle:
              config?.navConfig?.subtitle ?? normalizedPageConfig.nav.subtitle,
            brandColor:
              config?.navConfig?.brandColor ??
              normalizedPageConfig.theme.brandColor,
            searchPlaceholder:
              config?.navConfig?.searchPlaceholder ??
              normalizedPageConfig.searchSection.placeholder,
            logoUrl:
              config?.navConfig?.logoUrl ?? normalizedPageConfig.nav.logoUrl,
            searchVariant:
              config?.navConfig?.searchVariant ??
              normalizedPageConfig.searchSection.variant,
          }),
        );
        hydratePageTextDraft(config, normalizedPageConfig);
        hydrateCategoryDraft(nextCategoryName, nextProductEntries, config);
        setStatus("ready");
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : FETCH_ERROR_MESSAGE,
        );
        setStatus("error");
      });

    return () => {
      isCancelled = true;
    };
  }, [officeCode]);

  useEffect(() => {
    if (chatSession.mode === previousChatModeRef.current) {
      return;
    }

    if (chatSession.mode === "design") {
      setDesignTarget("common");
      captureCommonDraft();
      captureCategoryDraft();
    }

    previousChatModeRef.current = chatSession.mode;
  }, [chatSession.mode]);

  useEffect(() => {
    if (
      chatSession.mode === "design" &&
      designTarget === "category" &&
      selectedProductCategoryName &&
      selectedProductCategoryName !== previousCategoryRef.current
    ) {
      captureCategoryDraft();
    }

    previousCategoryRef.current = selectedProductCategoryName;
  }, [chatSession.mode, designTarget, selectedProductCategoryName]);

  function selectProductCategory(categoryName) {
    const isDifferentCategory =
      toTrimmedString(categoryName) !==
      toTrimmedString(selectedProductCategoryName);

    if (!isDifferentCategory) {
      return;
    }

    markDirty();
    pageAi.discardPageAiDesignSession();
    cardAi.discardCardAiDesignSession();
    hydrateCategoryDraft(categoryName, productEntries, existingConfig);
  }

  // The data dock's tab row carries one extra tab ahead of the categories, so
  // its selection is its own state; picking a category still drives the
  // category draft the field tables and the preview read from.
  //
  // Only the common/not-common half is held here — which category is selected
  // stays in selectedProductCategoryName, the same arrangement design mode
  // uses. A second copy of the category name would drift the moment anything
  // else moved it: switching to design mode and picking another category, or a
  // reload landing on a different one, would leave the dock highlighting one
  // category while editing another's fields.
  function selectDataTab(tabId) {
    setIsCommonDataTab(tabId === COMMON_TAB_ID);

    if (tabId !== COMMON_TAB_ID) {
      selectProductCategory(tabId);
    }
  }

  function selectDesignTarget(targetId) {
    if (targetId === "common") {
      if (designTarget === "common") {
        return;
      }

      if (categoryDraftRef.current) {
        cardAi.hydrateCardStyle(
          categoryDraftRef.current.cardStyle,
          categoryDraftRef.current.bodySlots,
        );
      }

      setComposerApplyPending("category", false);
      setComposerDraft("category", "");
      setDesignTarget("common");
      return;
    }

    if (designTarget === "common") {
      if (commonDraftRef.current) {
        pageAi.hydratePageStyle(commonDraftRef.current);
      }

      setComposerApplyPending("common", false);
      setComposerDraft("common", "");
      setDesignTarget("category");
    }

    selectProductCategory(targetId);
  }

  function toggleDataModeField(field) {
    const resolvedField =
      typeof field === "string" ? { key: field, aliasKeys: [field] } : field;
    const keys = resolvedField?.aliasKeys ?? [resolvedField?.key];
    const isVisible = keys.some((key) => dataSelection.draft.includes(key));
    const makeVisible = !isVisible;

    keys.forEach((key) => {
      const isKeyVisible = dataSelection.draft.includes(key);

      if (isKeyVisible !== makeVisible) {
        dataSelection.toggleField(key);
      }
    });
  }

  function exitDataMode() {
    chatSession.returnToIdle();
  }

  function buildDataModeCompletionSummary() {
    return {
      text: `${selectedProductCategoryName}의 표시 필드 ${dataSelection.draft.length}개가 적용되었습니다.`,
    };
  }

  function syncBuilderFromConfig(
    config,
    nextProductEntries = productEntries,
    preferredCategoryName = selectedProductCategoryName,
  ) {
    const normalizedPageConfig = normalizePageConfig(config?.pageConfig);
    const nextCategoryName =
      preferredCategoryName || getInitialCategoryName(nextProductEntries, config);

    pageAi.hydratePageStyle(normalizedPageConfig.pageStyle);
    setMobileUiTree(sanitizeMobileUiTree(normalizedPageConfig.mobileUiTree));
    setNavConfig(
      normalizeNavConfig({
        title: config?.navConfig?.title ?? normalizedPageConfig.nav.title,
        subtitle:
          config?.navConfig?.subtitle ?? normalizedPageConfig.nav.subtitle,
        brandColor:
          config?.navConfig?.brandColor ??
          normalizedPageConfig.theme.brandColor,
        searchPlaceholder:
          config?.navConfig?.searchPlaceholder ??
          normalizedPageConfig.searchSection.placeholder,
        logoUrl:
          config?.navConfig?.logoUrl ?? normalizedPageConfig.nav.logoUrl,
        searchVariant:
          config?.navConfig?.searchVariant ??
          normalizedPageConfig.searchSection.variant,
      }),
    );

    hydratePageTextDraft(config, normalizedPageConfig);

    if (nextCategoryName) {
      hydrateCategoryDraft(nextCategoryName, nextProductEntries, config);
    }
  }

  function buildCurrentSavePayload({ cardFields = dataSelection.committed } = {}) {
    return buildStorefrontSavePayload({
      officeCode,
      existingConfig,
      hiddenProducts,
      selectedProductCategoryName,
      selectedMediumCategories,
      representativeMediumCategory,
      cardStyle: cardAi.cardStyle,
      cardFields,
      bodySlots: cardAi.bodySlots,
      navConfig: draftNavConfig,
      officeInfoEntries,
      categoryInfoEntries,
      mobileUiTree,
      pageStyle: pageAi.pageStyle,
      allowedScalarKeys: effectiveScalarKeys,
    });
  }

  async function saveCompiledPayload(payload) {
    await upsertStorefrontConfig(payload);
    setExistingConfig(payload);
    setHiddenProducts(payload.hiddenProducts ?? []);
    syncBuilderFromConfig(payload);
    setStatus("saved");
  }

  function buildApplySummary(mode, target) {
    if (mode === "data") {
      return (
        buildDataModeCompletionSummary()?.text ??
        "표시 필드 변경 사항이 저장되었습니다."
      );
    }

    if (mode === "design" && target === "category") {
      return `${selectedProductCategoryName || "현재"} 카드 변경 사항이 저장되었습니다.`;
    }

    if (mode === "design" && target === "common") {
      return "공통 요소 변경 사항이 저장되었습니다.";
    }

    return "스토어프론트 변경 사항이 저장되었습니다.";
  }

  async function applyCurrentModeDraft(
    mode = chatSession.mode,
    overrides = {},
  ) {
    const previousPayload = cloneValue(existingConfig);
    const payload = buildCurrentSavePayload(overrides);
    const summary = buildApplySummary(mode, designTarget);

    await saveCompiledPayload(payload);
    setComposerApplyPending("common", false);
    setComposerApplyPending("category", false);
    commonDraftRef.current = null;
    categoryDraftRef.current = null;
    chatSession.recordSuccessfulApply({
      summary,
      snapshot: {
        mode,
        payload: previousPayload,
        summary,
      },
    });
    chatSession.returnToIdle();
  }

  async function undoLastApply() {
    const snapshot = chatSession.lastApplySnapshot;

    if (!snapshot?.payload) {
      return;
    }

    await saveCompiledPayload(snapshot.payload);
    chatSession.clearLastApplySnapshot();
    chatSession.appendMessage(
      buildSharedThreadMessage({
        role: "assistant",
        mode: snapshot.mode ?? "design",
        text: "이전 스토어프론트 버전으로 복원했습니다.",
      }),
    );
    chatSession.returnToIdle();
  }

  async function sendComposerPrompt() {
    const mode = chatSession.mode;
    const draftKey = designTarget === "common" ? "common" : "category";
    const prompt = toTrimmedString(composerDrafts[draftKey]);

    if (!prompt) {
      return;
    }

    const targetScope =
      designTarget === "common"
        ? pageAi.pageAiDesign.targetScope
        : cardAi.cardAiDesign.targetScope;
    const scopeLabel =
      resolveChatScopeLabel(designTarget, targetScope) || ALL_SCOPE_CHAT_LABEL;
    const targetLabel =
      designTarget === "common"
        ? "공통 요소"
        : toTrimmedString(selectedProductCategoryName) ||
          FALLBACK_CATEGORY_CHAT_LABEL;
    const userMessage = buildSharedThreadMessage({
      role: "user",
      mode,
      designTarget,
      targetLabel,
      scope: targetScope,
      scopeLabel,
      text: prompt,
    });
    const history = buildSharedHistory(
      [...chatSession.messages, userMessage],
      designTarget,
    );

    chatSession.appendMessage(userMessage);
    setComposerDraft(draftKey, "");
    markDirty();

    const result =
      designTarget === "category"
        ? await cardAi.applyCardAiDesign({
            prompt,
            targetScope,
            history,
            visibleFields: dataSelection.committed,
            fieldLabels: STOREFRONT_FIELD_LABELS,
            productCategoryName: selectedProductCategoryName,
            productRows: currentEntry?.rows,
          })
        : await pageAi.applyPageAiDesign({
            prompt,
            targetScope,
            history,
          });

    if (!result?.ok) {
      chatSession.appendMessage(
        buildSharedThreadMessage({
          role: "assistant",
          mode,
          designTarget,
          text:
            result?.error ??
            (designTarget === "category"
              ? cardAi.cardAiErrorMessage
              : pageAi.pageAiErrorMessage) ??
            "작업 공간 초안을 업데이트하지 못했습니다.",
        }),
      );
      return;
    }

    setComposerApplyPending(draftKey, true);

    chatSession.appendMessage(
      buildSharedThreadMessage({
        role: "assistant",
        mode,
        designTarget,
        scope: result.scope,
        scopeLabel: resolveChatScopeLabel(designTarget, result.scope),
        text: result.explanation,
        suggestion: result.suggestion,
        warningMessage: result.warningMessage,
      }),
    );
  }

  function discardCurrentModeDraft() {
    const mode = chatSession.mode;

    if (mode === "design") {
      if (commonDraftRef.current) {
        pageAi.hydratePageStyle(commonDraftRef.current);
        commonDraftRef.current = null;
      }

      if (categoryDraftRef.current) {
        cardAi.hydrateCardStyle(
          categoryDraftRef.current.cardStyle,
          categoryDraftRef.current.bodySlots,
        );
        categoryDraftRef.current = null;
      }

      setComposerApplyPending("common", false);
      setComposerApplyPending("category", false);
      setComposerDraft("common", "");
      setComposerDraft("category", "");
    }

    if (mode === "data" && !dataSelection.isConfirmed) {
      dataSelection.reset(dataSelection.committed);
    }
  }

  function exitComposerMode() {
    discardCurrentModeDraft();
    chatSession.returnToIdle();
  }

  function switchMode(nextMode) {
    discardCurrentModeDraft();
    chatSession.chooseMode(nextMode);
  }

  const previewBodySlots = cardAi.bodySlots;

  function buildPreviewConfig(cardFields) {
    return selectedProductCategoryName
      ? buildStorefrontSavePayload({
          officeCode,
          existingConfig,
          hiddenProducts,
          selectedProductCategoryName,
          selectedMediumCategories,
          representativeMediumCategory,
          cardStyle: cardAi.cardStyle,
          cardFields,
          bodySlots: previewBodySlots,
          navConfig: draftNavConfig,
          officeInfoEntries,
          categoryInfoEntries,
          mobileUiTree,
          pageStyle: pageAi.pageStyle,
          allowedScalarKeys: effectiveScalarKeys,
        })
      : buildPreviewConfigWithoutCategory();
  }

  // 분류가 하나도 없으면 저장 payload 빌더를 못 쓰므로 미리보기 설정을 손으로
  // 짓는다. 그래도 사무소 안내의 소유권 규칙은 저장 경로와 같은 것을 써야 한다 —
  // 목록만 넘기고 옛 subtitle 을 그대로 두면 마지막 항목을 지운 판매자에게
  // normalizePageConfig 의 폴백이 그 문구를 되살려 준다. 상품 데이터를 아직 올리지
  // 않은 사무소가 정확히 이 상태로 스토어프론트를 처음 꾸민다.
  function buildPreviewConfigWithoutCategory() {
    const { officeInfo, navSubtitle } = resolveOfficeInfoOwnership({
      savedOfficeInfo: existingConfig?.pageConfig?.officeInfo,
      navSubtitle: existingConfig?.pageConfig?.nav?.subtitle,
      officeInfoEntries,
    });

    return {
      officeCode,
      pageConfig: normalizePageConfig({
        ...existingConfig?.pageConfig,
        nav: {
          ...(existingConfig?.pageConfig?.nav ?? {}),
          subtitle: navSubtitle,
        },
        officeInfo,
        pageStyle: pageAi.pageStyle,
      }),
      navConfig: normalizeNavConfig(draftNavConfig),
      categoryConfigs: existingConfig?.categoryConfigs ?? [],
      hiddenProducts,
    };
  }

  const previewConfig = buildPreviewConfig(dataSelection.committed);
  const dataModePreviewConfig = buildPreviewConfig(dataSelection.draft);

  const productCategoryTabs = productCategoryOptions.map((option) => ({
    id: option.categoryName,
    label: option.categoryName,
    rowCount: option.rowCount,
    hasDraft: option.hasDraft,
  }));

  const dataMode = {
    categoryTabs: [
      { id: COMMON_TAB_ID, label: "공통 요소" },
      ...productCategoryTabs,
    ],
    selectedCategoryId: isCommonDataTab
      ? COMMON_TAB_ID
      : selectedProductCategoryName,
    selectCategory: selectDataTab,
    officeInfoEntries,
    setOfficeInfoEntries: changeOfficeInfoEntries,
    categoryInfoEntries,
    setCategoryInfoEntries: changeCategoryInfoEntries,
    availableCategoryFields,
    draftFields: dataSelection.draft,
    committedFields: dataSelection.committed,
    toggleField: toggleDataModeField,
    applyChanges: async () => {
      const nextCommittedFields = [...dataSelection.draft];

      markDirty();
      dataSelection.confirm();
      await applyCurrentModeDraft("data", {
        cardFields: nextCommittedFields,
      });
    },
    hasPendingChanges: !dataSelection.isConfirmed,
    previewConfig: dataModePreviewConfig,
    goBack: exitDataMode,
  };

  const designMode = {
    categoryTabs: [
      { id: COMMON_TAB_ID, label: "공통 요소" },
      ...productCategoryTabs,
    ],
    selectedCategoryId: designTarget === "common" ? "common" : selectedProductCategoryName,
    selectCategory: selectDesignTarget,
  };

  const composerDraftKey = designTarget === "common" ? "common" : "category";

  const composerMode =
    chatSession.mode === "design"
      ? {
          copy: getStorefrontDesignComposerCopy(designTarget),
          promptDraft: composerDrafts[composerDraftKey] ?? "",
          setPromptDraft: (value) => setComposerDraft(composerDraftKey, value),
          isApplying:
            designTarget === "common"
              ? pageAi.isApplyingPageAiDesign
              : cardAi.isApplyingCardAiDesign,
          errorMessage:
            designTarget === "common"
              ? pageAi.pageAiErrorMessage
              : cardAi.cardAiErrorMessage,
          canSend: Boolean(
            toTrimmedString(composerDrafts[composerDraftKey] ?? ""),
          ),
          sendPrompt: sendComposerPrompt,
          exitMode: exitComposerMode,
          showApplyAction: true,
          canApply: pendingComposerApply[composerDraftKey],
          applyDraft: () => applyCurrentModeDraft(chatSession.mode),
          targetOptions:
            designTarget === "common"
              ? PAGE_AI_TARGET_SCOPE_OPTIONS
              : CARD_AI_TARGET_SCOPE_OPTIONS,
          getScopeGuide:
            designTarget === "common"
              ? getPageDesignScopeGuide
              : getCardDesignScopeGuide,
          cardsPerRow:
            designTarget === "common" ? null : cardAi.cardStyle.cardsPerRow,
          setCardsPerRow:
            designTarget === "common" ? null : changeCardsPerRow,
          layoutOptions:
            designTarget === "common" ? null : CARD_DESIGN_LAYOUT_OPTIONS,
          selectedLayoutId:
            designTarget === "common" ? null : cardAi.cardStyle.structuralPreset,
          setLayoutId:
            designTarget === "common" ? null : changeStructuralPreset,
          selectedTargetId:
            designTarget === "common"
              ? pageAi.pageAiDesign.targetScope
              : cardAi.cardAiDesign.targetScope,
          setTargetId:
            designTarget === "common" ? pageAi.setTargetScope : cardAi.setTargetScope,
          pageTitleDraft: designTarget === "common" ? textDraft.pageTitle : null,
          setPageTitle: designTarget === "common" ? changePageTitle : null,
          pageTitlePlaceholder:
            designTarget === "common" ? derivedPageTitle : null,
        }
      : null;

  // Drives the preview from the active editor tab. Common settings map to the
  // office intro, while a category tab maps to that category's intro.
  const previewSelectedCategoryName =
    (chatSession.mode === "data" && isCommonDataTab) ||
    (chatSession.mode === "design" && designTarget === "common")
      ? ""
      : selectedProductCategoryName;

  return {
    status,
    errorMessage,
    selectedProductCategoryName,
    previewSelectedCategoryName,
    // The preview shows the same upload timestamp the public storefront will,
    // aggregated here from the entries the builder already holds.
    previewProductUpdatedAt: resolveLatestProductUpdatedAt(productEntries),
    previewConfig,
    previewProductRows: allProductRows,
    officeName,
    nh_name: toTrimmedString(nhName),
    chatSession,
    dataMode,
    designMode,
    composerMode,
    buildCurrentSavePayload,
    saveCompiledPayload,
    applyCurrentModeDraft,
    undoLastApply,
    switchMode,
  };
}
