import { useEffect, useRef, useState } from "react";

import { toTrimmedString } from "../../../common/utils/text";
import { fetchOfficeProductDataEntries } from "../../office-product-editor/services/office-product-data/officeProductDataReadService";
import { CARD_AI_TARGET_SCOPE_OPTIONS } from "../model/card-design/cardAiDesignModel";
import { PAGE_AI_TARGET_SCOPE_OPTIONS } from "../model/page-design/pageAiDesignModel";
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

function buildSharedHistory(messages, mode) {
  return messages
    .filter(
      (message) =>
        message?.kind === "chat-message" &&
        typeof message?.text === "string" &&
        (!mode || message?.mode === mode),
    )
    .slice(-MAX_SHARED_AI_HISTORY_MESSAGES)
    .map((message) => ({ role: message.role, text: message.text }));
}

function buildSharedThreadMessage({
  role,
  mode,
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
    targetLabel,
    scope,
    scopeLabel,
    text,
    suggestion,
    warningMessage,
  };
}

function buildAdvisoryReply({
  officeName,
  selectedProductCategoryName,
  productEntries,
  visibleFields,
}) {
  const resolvedOfficeName = toTrimmedString(officeName) || "이 스토어프론트";
  const resolvedCategoryName =
    toTrimmedString(selectedProductCategoryName) || "현재 카테고리";
  const categoryCount = Array.isArray(productEntries) ? productEntries.length : 0;
  const fieldCount = Array.isArray(visibleFields) ? visibleFields.length : 0;

  return `${resolvedOfficeName}의 현재 스토어프론트 상태를 보면, ${resolvedCategoryName} 경험을 먼저 개선하는 것이 좋겠습니다. 현재 ${categoryCount}개의 카테고리가 등록되어 있고 현재 카드 레이아웃에는 ${fieldCount}개의 필드가 표시되어 있으니, 먼저 페이지 구조를 정리한 다음 가장 중요한 상품 정보가 카드에서 잘 보이도록 조정하는 것이 안전한 다음 단계입니다.`;
}

function resolveChatScopeLabel(mode, targetScope) {
  if (mode === "page") {
    return resolveScopeLabel(PAGE_AI_TARGET_SCOPE_OPTIONS, targetScope);
  }

  if (mode === "card") {
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
  const [composerDrafts, setComposerDrafts] = useState({
    page: "",
    card: "",
    advisory: "",
  });
  const [pendingComposerApply, setPendingComposerApply] = useState({
    page: false,
    card: false,
  });
  const pageModeDraftRef = useRef(null);
  const cardModeDraftRef = useRef(null);
  const previousChatModeRef = useRef(chatSession.mode);
  const previousCardCategoryRef = useRef("");

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

  function capturePageModeDraft() {
    const baseline = cloneValue(pageAi.pageStyle);

    pageModeDraftRef.current = baseline;
    setComposerApplyPending("page", false);
    pageAi.hydratePageStyle(baseline);
  }

  function captureCardModeDraft() {
    const baseline = {
      cardStyle: cloneValue(cardAi.cardStyle),
      bodySlots: cloneValue(cardAi.bodySlots),
    };

    cardModeDraftRef.current = baseline;
    setComposerApplyPending("card", false);
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
    cardModeDraftRef.current = {
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
            categoryChipVariant:
              config?.navConfig?.categoryChipVariant ??
              normalizedPageConfig.categoryChips.variant,
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

    if (chatSession.mode === "page") {
      capturePageModeDraft();
    }

    if (chatSession.mode === "card") {
      captureCardModeDraft();
    }

    previousChatModeRef.current = chatSession.mode;
  }, [chatSession.mode]);

  useEffect(() => {
    if (
      chatSession.mode === "card" &&
      selectedProductCategoryName &&
      selectedProductCategoryName !== previousCardCategoryRef.current
    ) {
      captureCardModeDraft();
    }

    previousCardCategoryRef.current = selectedProductCategoryName;
  }, [chatSession.mode, selectedProductCategoryName]);

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
        categoryChipVariant:
          config?.navConfig?.categoryChipVariant ??
          normalizedPageConfig.categoryChips.variant,
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

  function buildApplySummary(mode) {
    if (mode === "data") {
      return (
        buildDataModeCompletionSummary()?.text ??
        "표시 필드 변경 사항이 저장되었습니다."
      );
    }

    if (mode === "card") {
      return `${selectedProductCategoryName || "현재"} 카드 변경 사항이 저장되었습니다.`;
    }

    if (mode === "page") {
      return "페이지 변경 사항이 저장되었습니다.";
    }

    return "스토어프론트 변경 사항이 저장되었습니다.";
  }

  async function applyCurrentModeDraft(
    mode = chatSession.mode,
    overrides = {},
  ) {
    const previousPayload = cloneValue(existingConfig);
    const payload = buildCurrentSavePayload(overrides);
    const summary = buildApplySummary(mode);

    await saveCompiledPayload(payload);
    setComposerApplyPending("page", false);
    setComposerApplyPending("card", false);
    pageModeDraftRef.current = null;
    cardModeDraftRef.current = null;
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
        mode: snapshot.mode ?? "page",
        text: "이전 스토어프론트 버전으로 복원했습니다.",
      }),
    );
    chatSession.returnToIdle();
  }

  async function sendComposerPrompt() {
    const mode = chatSession.mode;
    const prompt = toTrimmedString(composerDrafts[mode]);

    if (!prompt) {
      return;
    }

    const targetScope =
      mode === "page"
        ? pageAi.pageAiDesign.targetScope
        : mode === "card"
          ? cardAi.cardAiDesign.targetScope
          : "";
    const scopeLabel = resolveChatScopeLabel(mode, targetScope);
    const targetLabel =
      mode === "page" ? "Page" : mode === "card" ? "Card" : undefined;
    const userMessage = buildSharedThreadMessage({
      role: "user",
      mode,
      targetLabel,
      scope: targetScope,
      scopeLabel,
      text: prompt,
    });
    const history = buildSharedHistory(
      [...chatSession.messages, userMessage],
      mode,
    );

    chatSession.appendMessage(userMessage);
    setComposerDraft(mode, "");

    if (mode === "advisory") {
      chatSession.appendMessage(
        buildSharedThreadMessage({
          role: "assistant",
          mode,
          text: buildAdvisoryReply({
            officeName,
            selectedProductCategoryName,
            productEntries,
            visibleFields: dataSelection.committed,
          }),
        }),
      );
      return;
    }

    markDirty();

    const result =
      mode === "card"
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
          text:
            result?.error ??
            (mode === "card"
              ? cardAi.cardAiErrorMessage
              : pageAi.pageAiErrorMessage) ??
            "작업 공간 초안을 업데이트하지 못했습니다.",
        }),
      );
      return;
    }

    if (mode === "page" || mode === "card") {
      setComposerApplyPending(mode, true);
    }

    chatSession.appendMessage(
      buildSharedThreadMessage({
        role: "assistant",
        mode,
        scope: result.scope,
        scopeLabel: resolveChatScopeLabel(mode, result.scope),
        text: result.explanation,
        suggestion: result.suggestion,
        warningMessage: result.warningMessage,
      }),
    );
  }

  function discardCurrentModeDraft() {
    const mode = chatSession.mode;

    if (mode === "page" && pageModeDraftRef.current) {
      pageAi.hydratePageStyle(pageModeDraftRef.current);
      pageModeDraftRef.current = null;
    }

    if (mode === "card" && cardModeDraftRef.current) {
      cardAi.hydrateCardStyle(
        cardModeDraftRef.current.cardStyle,
        cardModeDraftRef.current.bodySlots,
      );
      cardModeDraftRef.current = null;
    }

    if (mode === "page" || mode === "card") {
      setComposerApplyPending(mode, false);
    }

    if (mode === "data" && !dataSelection.isConfirmed) {
      dataSelection.reset(dataSelection.committed);
    }

    if (mode === "page" || mode === "card" || mode === "advisory") {
      setComposerDraft(mode, "");
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

  const cardMode = {
    categoryTabs: dataMode.categoryTabs,
    selectedCategoryId: dataMode.selectedCategoryId,
    selectCategory: dataMode.selectCategory,
  };

  const composerMode =
    chatSession.mode === "page" ||
    chatSession.mode === "card" ||
    chatSession.mode === "advisory"
      ? {
          promptDraft: composerDrafts[chatSession.mode] ?? "",
          setPromptDraft: (value) => setComposerDraft(chatSession.mode, value),
          isApplying:
            chatSession.mode === "page"
              ? pageAi.isApplyingPageAiDesign
              : chatSession.mode === "card"
                ? cardAi.isApplyingCardAiDesign
                : false,
          errorMessage:
            chatSession.mode === "page"
              ? pageAi.pageAiErrorMessage
              : chatSession.mode === "card"
                ? cardAi.cardAiErrorMessage
                : "",
          canSend: Boolean(
            toTrimmedString(composerDrafts[chatSession.mode] ?? ""),
          ),
          sendPrompt: sendComposerPrompt,
          exitMode: exitComposerMode,
          showApplyAction:
            chatSession.mode === "page" || chatSession.mode === "card",
          canApply:
            chatSession.mode === "page"
              ? pendingComposerApply.page
              : chatSession.mode === "card"
                ? pendingComposerApply.card
                : false,
          applyDraft: () => applyCurrentModeDraft(chatSession.mode),
          targetOptions:
            chatSession.mode === "page"
              ? PAGE_AI_TARGET_SCOPE_OPTIONS
              : chatSession.mode === "card"
                ? CARD_AI_TARGET_SCOPE_OPTIONS
                : [],
          selectedTargetId:
            chatSession.mode === "page"
              ? pageAi.pageAiDesign.targetScope
              : chatSession.mode === "card"
                ? cardAi.cardAiDesign.targetScope
                : "",
          setTargetId:
            chatSession.mode === "page"
              ? pageAi.setTargetScope
              : chatSession.mode === "card"
                ? cardAi.setTargetScope
                : () => {},
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
    cardMode,
    composerMode,
    buildCurrentSavePayload,
    saveCompiledPayload,
    applyCurrentModeDraft,
    undoLastApply,
    switchMode,
  };
}
