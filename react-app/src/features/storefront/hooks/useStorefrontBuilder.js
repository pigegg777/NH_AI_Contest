import { useEffect, useRef, useState } from "react";

import { toTrimmedString } from "../../../common/utils/text";
import { fetchOfficeProductDataEntries } from "../../office-product-editor/services/office-product-data/officeProductDataReadService";
import { CARD_AI_TARGET_SCOPE_OPTIONS } from "../model/card-design/ai-request/cardAiDesignModel";
import { getCardDesignScopeGuide } from "../model/card-design/ai-request/cardDesignScopeGuide";
import { PAGE_AI_TARGET_SCOPE_OPTIONS } from "../model/page-design/ai-request/pageAiDesignModel";
import { getPageDesignScopeGuide } from "../model/page-design/ai-request/pageDesignScopeGuide";
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
} from "../model/storefront-config/storefrontBuilderModel";
import { sanitizeMobileUiTree } from "../model/storefront-config/storefrontUiModel";
import {
  fetchStorefrontConfig,
  upsertStorefrontConfig,
} from "../model/storefront-config/storefrontConfigOrchestrator";
import { getStorefrontDesignComposerCopy } from "../components/chat-workspace/storefrontChatModes";
import { useCardAiDesign } from "./useCardAiDesign";
import { useDataSelectionDraft } from "./useDataSelectionDraft";
import { usePageAiDesign } from "./usePageAiDesign";
import { useStorefrontChatSession } from "./useStorefrontChatSession";

const FETCH_ERROR_MESSAGE = "스토어프론트 빌더를 불러오지 못했습니다.";
const MAX_SHARED_AI_HISTORY_MESSAGES = 12;

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
  const productCategoryOptions = deriveProductCategoryOptions(
    productEntries,
    existingConfig,
  );
  const availableCategoryFields = deriveAvailableCategoryFields(
    currentEntry?.rows,
  );
  const effectiveScalarKeys = deriveEffectiveScalarKeys(currentEntry?.rows);
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

  function hydrateCategoryDraft(
    categoryName,
    nextProductEntries,
    nextExistingConfig,
  ) {
    const resolvedCategoryName = categoryName || "";
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
      navConfig,
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
    const scopeLabel = resolveChatScopeLabel(designTarget, targetScope);
    const targetLabel = designTarget === "common" ? "공통 요소" : "카드";
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
          navConfig,
          mobileUiTree,
          pageStyle: pageAi.pageStyle,
          allowedScalarKeys: effectiveScalarKeys,
        })
      : {
          officeCode,
          pageConfig: normalizePageConfig({
            ...existingConfig?.pageConfig,
            pageStyle: pageAi.pageStyle,
          }),
          navConfig: normalizeNavConfig(existingConfig?.navConfig),
          categoryConfigs: existingConfig?.categoryConfigs ?? [],
          hiddenProducts,
        };
  }

  const previewConfig = buildPreviewConfig(dataSelection.committed);
  const dataModePreviewConfig = buildPreviewConfig(dataSelection.draft);

  const dataMode = {
    categoryTabs: productCategoryOptions.map((option) => ({
      id: option.categoryName,
      label: option.categoryName,
      rowCount: option.rowCount,
      hasDraft: option.hasDraft,
    })),
    selectedCategoryId: selectedProductCategoryName,
    selectCategory: selectProductCategory,
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
      { id: "common", label: "공통 요소" },
      ...dataMode.categoryTabs,
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
          selectedTargetId:
            designTarget === "common"
              ? pageAi.pageAiDesign.targetScope
              : cardAi.cardAiDesign.targetScope,
          setTargetId:
            designTarget === "common" ? pageAi.setTargetScope : cardAi.setTargetScope,
        }
      : null;

  return {
    status,
    errorMessage,
    selectedProductCategoryName,
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
