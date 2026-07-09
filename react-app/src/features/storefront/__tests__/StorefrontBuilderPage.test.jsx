import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOfficeProductDataEntries } from "../../office-product-editor/services/office-product-data/officeProductDataReadService";
import StorefrontBuilderPage from "../pages/StorefrontBuilderPage";
import { requestPageStyleAiIntent } from "../model/page-design/pageStyleAiOrchestrator";
import { requestCardStyleAiIntent } from "../model/card-design/cardStyleAiOrchestrator";
import { DEFAULT_CARD_STYLE } from "../model/card-design/cardStyleModel";
import {
  fetchStorefrontConfig,
  upsertStorefrontConfig,
} from "../model/storefront-config/storefrontConfigOrchestrator";

vi.mock(
  "../../office-product-editor/services/office-product-data/officeProductDataReadService",
  () => ({
    fetchOfficeProductDataEntries: vi.fn(),
  }),
);

vi.mock("../model/storefront-config/storefrontConfigOrchestrator", () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
}));

vi.mock("../model/page-design/pageStyleAiOrchestrator", () => ({
  requestPageStyleAiIntent: vi.fn(),
}));

vi.mock("../model/card-design/cardStyleAiOrchestrator", () => ({
  requestCardStyleAiIntent: vi.fn(),
}));

const PRODUCT_ENTRIES = [
  {
    id: 11,
    officeCode: "OFF-1",
    officeName: "Demo Office",
    categoryName: "Fertilizer Upload",
    rowCount: 2,
    sourceFileName: "fertilizer.xlsx",
    updatedAt: "2026-06-15T00:00:00Z",
    rows: [
      {
        product_category_name: "Fertilizer Upload",
        product_name: "Alpha",
        spec: "20kg",
        large_category: "Fertilizer",
        medium_category: "Premium",
        tax_price: 1000,
        nutrient: "18-18-18",
      },
      {
        product_category_name: "Fertilizer Upload",
        product_name: "Beta",
        spec: "20kg",
        large_category: "Fertilizer",
        medium_category: "Starter",
        tax_price: 2000,
        nutrient: "15-15-15",
      },
    ],
  },
  {
    id: 12,
    officeCode: "OFF-1",
    officeName: "Demo Office",
    categoryName: "Pesticide Upload",
    rowCount: 1,
    sourceFileName: "pesticide.xlsx",
    updatedAt: "2026-06-15T00:00:00Z",
    rows: [
      {
        product_category_name: "Pesticide Upload",
        product_name: "Gamma",
        spec: "500ml",
        large_category: "Pesticide",
        medium_category: "Leaf",
        tax_price: 3000,
      },
    ],
  },
];

const EXISTING_CONFIG = {
  officeCode: "OFF-1",
  pageConfig: {
    schemaVersion: 1,
    designDirection: "friendly",
    theme: { brandColor: "#1d4a2e", backgroundTone: "mint" },
    nav: {
      title: "Existing guide",
      subtitle: "Existing subtitle",
      logoUrl: "",
    },
    searchSection: {
      enabled: true,
      placeholder: "Search products",
      variant: "pill",
    },
    categoryChips: { enabled: true, sticky: true, variant: "soft" },
  },
  navConfig: {
    title: "Existing guide",
    subtitle: "Existing subtitle",
    brandColor: "#1d4a2e",
    searchPlaceholder: "Search products",
    logoUrl: "",
    searchVariant: "pill",
    categoryChipVariant: "soft",
  },
  categoryConfigs: [
    {
      officeCode: "OFF-1",
      productCategoryName: "Fertilizer Upload",
      sortOrder: 0,
      categoryConfig: {
        schemaVersion: 1,
        displayName: "Fertilizer Upload",
        sourceCategoryName: "Fertilizer Upload",
        selectedMediumCategories: ["Premium"],
        representativeMediumCategory: "Premium",
        layoutStyle: { variant: "card-grid" },
        cardDesign: {
          visibleFields: ["product_name", "spec", "tax_price"],
          style: {
            layout: "grid",
            accentColor: "#1d4a2e",
            fontSize: "medium",
            cardsPerRow: 2,
          },
        },
      },
      updatedAt: "2026-06-15T00:00:00Z",
    },
  ],
  hiddenProducts: [],
  updatedAt: "2026-06-15T00:00:00Z",
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function goToFieldSelection(user, categoryName = "Fertilizer Upload") {
  await user.click(
    await screen.findByTestId(`chat-select-product-category-${categoryName}`),
  );

  await screen.findByTestId("chat-stage-field-picker");
}

async function reachUnifiedDesignStep(
  user,
  categoryName = "Fertilizer Upload",
) {
  await goToFieldSelection(user, categoryName);
  await user.click(screen.getByTestId("chat-confirm-field-selection"));
  await screen.findByTestId("unified-design-editor");
}

function mockPageAiResponse({
  palette = null,
  header = null,
  categoryChips = null,
  search = null,
  explanation = "페이지 스타일을 반영했습니다.",
  suggestion = null,
} = {}) {
  requestPageStyleAiIntent.mockResolvedValue({
    intent: {
      palette,
      header,
      categoryChips,
      search,
    },
    explanation,
    suggestion,
  });
}

function mockCardAiResponse({
  structuralPresetRequest = null,
  titleModeRequest = null,
  layout = null,
  shell = null,
  header = null,
  image = null,
  info = null,
  field = null,
  explanation = "카드 디자인을 반영했습니다.",
  suggestion = null,
} = {}) {
  requestCardStyleAiIntent.mockResolvedValue({
    intent: {
      structuralPresetRequest,
      titleModeRequest,
      layout,
      shell,
      header,
      image,
      info,
      field,
    },
    explanation,
    suggestion,
  });
}

describe("StorefrontBuilderPage", () => {
  it("shows a loading state while fetching", () => {
    fetchOfficeProductDataEntries.mockReturnValue(new Promise(() => {}));
    fetchStorefrontConfig.mockReturnValue(new Promise(() => {}));

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(
      screen.getByText("스토어프론트 빌더를 불러오는 중.."),
    ).toBeInTheDocument();
  });

  it("shows an error message when a fetch rejects", async () => {
    fetchOfficeProductDataEntries.mockRejectedValue(new Error("boom"));
    fetchStorefrontConfig.mockResolvedValue(null);

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(
      await screen.findByText("스토어프론트 빌더를 불러오지 못했습니다."),
    ).toBeInTheDocument();
  });

  it("opens directly into the chat-style builder and auto-advances from data choice to field choice", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(
      screen.queryByTestId("start-storefront-builder"),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByTestId("chat-stage-data-picker"),
    ).toBeInTheDocument();
    expect(screen.getByText(/수정할 데이터를 선택/)).toBeInTheDocument();
    expect(screen.getByText("fertilizer.xlsx")).toBeInTheDocument();

    await user.click(
      screen.getByTestId("chat-select-product-category-Fertilizer Upload"),
    );

    expect(
      await screen.findByTestId("chat-stage-field-picker"),
    ).toBeInTheDocument();
    expect(screen.getByText(/카드에 노출할 필드/)).toBeInTheDocument();
  });

  it("uses explicit back and confirm actions inside field selection", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await goToFieldSelection(user);
    expect(screen.getByTestId("chat-stage-field-picker")).toBeInTheDocument();

    await user.click(screen.getByTestId("chat-field-selection-back"));
    expect(
      await screen.findByTestId("chat-stage-data-picker"),
    ).toBeInTheDocument();

    await goToFieldSelection(user);
    await user.click(screen.getByTestId("chat-confirm-field-selection"));

    expect(
      await screen.findByTestId("unified-design-editor"),
    ).toBeInTheDocument();
  });

  it("shows the grouped data-selection table and reflects a toggle in the live preview immediately, even before confirming", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await goToFieldSelection(user);

    const table = screen.getByTestId("data-field-table-description");
    const designPreview = screen.getByTestId("mobile-preview-device");

    expect(
      within(table).getByTestId("data-field-example-product_name"),
    ).toHaveTextContent("Alpha");
    expect(
      within(designPreview).queryByText("18-18-18"),
    ).not.toBeInTheDocument();

    await user.click(within(table).getByTestId("data-field-toggle-nutrient"));

    await waitFor(() => {
      expect(within(designPreview).getByText("18-18-18")).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("data-selection-unconfirmed-hint"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("unified-design-editor"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("chat-confirm-field-selection"));

    expect(
      await screen.findByTestId("unified-design-editor"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        within(screen.getByTestId("mobile-preview-device")).getByText(
          "18-18-18",
        ),
      ).toBeInTheDocument();
    });
  });

  it("collapses completed data and field stages into summary cards with re-open actions", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    expect(
      await screen.findByTestId("chat-summary-selected-data"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("chat-summary-visible-fields"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("chat-reopen-data-selection"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("chat-reopen-field-selection"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("chat-stage-data-picker"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("chat-stage-field-picker"),
    ).not.toBeInTheDocument();
  });

  it("defaults to page target and keeps one shared prompt draft when switching targets", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    expect(screen.getByTestId("unified-design-target-page")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "same draft across targets",
    );
    await user.click(screen.getByTestId("unified-design-target-card"));

    expect(screen.getByTestId("unified-design-target-card")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("unified-design-prompt")).toHaveValue(
      "same draft across targets",
    );
  });

  it("runs the flow and saves the resolved cardStyle without touching page-wide nav settings", async () => {
    mockCardAiResponse({ structuralPresetRequest: "image-left" });
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    expect(screen.getByTestId("unified-design-editor")).toBeInTheDocument();
    await user.click(screen.getByTestId("unified-design-target-card"));
    await user.click(
      within(screen.getByTestId("card-design-cards-per-row")).getAllByRole(
        "button",
      )[0],
    );
    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "show the image on the left",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));

    await waitFor(() => {
      const sectionEl = screen
        .getByTestId("mobile-preview-device")
        .querySelector("section[data-structural-preset]");
      expect(sectionEl.dataset.structuralPreset).toBe("image-left");
    });
    expect(screen.getByPlaceholderText("Search products")).toBeInTheDocument();

    await user.click(screen.getByTestId("chat-save-storefront-draft"));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);

    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(
      savedPayload.categoryConfigs[0].categoryConfig.cardDesign.cardStyle
        .structuralPreset,
    ).toBe("image-left");
    expect(
      savedPayload.categoryConfigs[0].categoryConfig.cardDesign.cardStyle
        .cardsPerRow,
    ).toBe(1);
    expect(savedPayload.navConfig.searchPlaceholder).toBe("Search products");
  }, 10000);

  it("applies only the selected page target and records a page badge in shared history", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    mockPageAiResponse({
      palette: {
        backgroundHex: "#eef3fd",
        surfaceHex: "#ffffff",
        accentHex: "#2563eb",
        textHex: "#111827",
      },
      header: { fontWeight: 800 },
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "cool trustworthy blue, make the title bolder",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));

    await waitFor(() => {
      expect(
        screen
          .getByTestId("storefront-page")
          .style.getPropertyValue("--brand-color"),
      ).toBe("#2563eb");
    });

    const sectionEl = screen
      .getByTestId("mobile-preview-device")
      .querySelector("section[data-structural-preset]");
    expect(sectionEl.dataset.structuralPreset).toBe("header-top");
    expect(
      screen
        .getAllByTestId("chat-message-target-badge")
        .some((badge) => badge.dataset.target === "page"),
    ).toBe(true);
  }, 10000);

  it("applies a field-override card prompt, previews the styled field, undoes it, and saves it when re-applied", async () => {
    mockCardAiResponse({
      field: {
        targetedFieldStyles: [
          {
            field: "tax_price",
            colorRole: "red",
            fontWeight: "bold",
            fontSize: "medium",
            emphasis: "strong",
          },
        ],
      },
    });
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.click(screen.getByTestId("unified-design-target-card"));
    await user.click(screen.getByTestId("unified-design-scope-field"));
    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "make the tax price red and bold",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));

    let taxPriceValueEl;

    await waitFor(() => {
      const card = within(
        screen.getByTestId("mobile-preview-device"),
      ).getAllByRole("article")[0];
      taxPriceValueEl = within(card).getByText(/1,000/);
      expect(taxPriceValueEl.style.getPropertyValue("--field-text-color")).toBe(
        "#dc2626",
      );
    });
    expect(
      screen
        .getAllByTestId("chat-message-target-badge")
        .some((badge) => badge.dataset.target === "card"),
    ).toBe(true);

    await user.click(screen.getByTestId("undo-ai-changes"));

    await waitFor(() => {
      const card = within(
        screen.getByTestId("mobile-preview-device"),
      ).getAllByRole("article")[0];
      const restoredTaxPriceValueEl = within(card).getByText(/1,000/);
      expect(
        restoredTaxPriceValueEl.style.getPropertyValue("--field-text-color"),
      ).not.toBe("#dc2626");
    });

    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "make the tax price red and bold",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));

    await waitFor(() => {
      const card = within(
        screen.getByTestId("mobile-preview-device"),
      ).getAllByRole("article")[0];
      const reappliedTaxPriceValueEl = within(card).getByText(/1,000/);
      expect(
        reappliedTaxPriceValueEl.style.getPropertyValue("--field-text-color"),
      ).toBe("#dc2626");
    });

    await user.click(screen.getByTestId("chat-save-storefront-draft"));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    const savedTaxPriceSlot =
      savedPayload.categoryConfigs[0].categoryConfig.cardDesign.bodySlots.find(
        (slot) => slot.field === "tax_price",
      );
    expect(savedTaxPriceSlot.style).toEqual({
      field: "tax_price",
      colorRole: "red",
      fontWeight: "bold",
      fontSize: "medium",
      emphasis: "strong",
    });
  }, 10000);

  it("applies one page-style prompt, previews immediately, and saves only the compiled pageStyle", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);
    mockPageAiResponse({
      palette: {
        backgroundHex: "#eef3fd",
        surfaceHex: "#ffffff",
        accentHex: "#2563eb",
        textHex: "#111827",
      },
      header: { fontWeight: 800 },
      search: { sizeToken: "lg", borderStrengthToken: "strong" },
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    const previewPageEl = screen.getByTestId("storefront-page");

    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "cool trustworthy blue, make the title bolder and the search box larger with a stronger border",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));

    await waitFor(() => {
      expect(previewPageEl.style.getPropertyValue("--brand-color")).toBe(
        "#2563eb",
      );
      expect(
        previewPageEl.style.getPropertyValue("--typography-heading-weight"),
      ).toBe("800");
      expect(
        previewPageEl.style.getPropertyValue("--page-search-border-width"),
      ).toBe("2.5px");
    });

    await user.click(screen.getByTestId("chat-save-storefront-draft"));

    await waitFor(() =>
      expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1),
    );

    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(savedPayload.pageConfig.pageStyle.palette.accentHex).toBe("#2563eb");
    expect(savedPayload.pageConfig.pageStyle.header.fontWeight).toBe(800);
    expect(savedPayload.pageConfig.pageStyle.search.sizeToken).toBe("lg");
    expect(savedPayload.pageConfig.pageStyle.search.borderStrengthToken).toBe(
      "strong",
    );
    expect(savedPayload.pageConfig.pageAiDesign).toBeUndefined();
    expect(JSON.stringify(savedPayload)).not.toContain("cool trustworthy blue");
    expect(JSON.stringify(savedPayload)).not.toContain("make the title bolder");
  }, 10000);

  it("keeps the last valid pageStyle and shows an error when no main prompt has been entered", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    const previewPageEl = screen.getByTestId("storefront-page");
    const brandColorBeforeApply =
      previewPageEl.style.getPropertyValue("--brand-color");

    await user.click(screen.getByTestId("apply-unified-ai-design"));

    await waitFor(() => {
      expect(
        screen.getByTestId("unified-design-prompt-panel").textContent,
      ).toContain("입력");
    });
    expect(previewPageEl.style.getPropertyValue("--brand-color")).toBe(
      brandColorBeforeApply,
    );
  });

  it("preserves the existing design state when returning from design to fields without changing them", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.click(screen.getByTestId("unified-design-target-card"));
    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "keep this draft",
    );

    await user.click(screen.getByTestId("chat-design-back"));
    await user.click(screen.getByTestId("chat-confirm-field-selection"));

    expect(
      await screen.findByTestId("unified-design-target-card"),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("unified-design-prompt")).toHaveValue(
      "keep this draft",
    );
  });

  it("keeps existing card AI preview changes visible in field selection while still honoring draft field toggles", async () => {
    mockCardAiResponse({
      field: {
        targetedFieldStyles: [
          {
            field: "tax_price",
            colorRole: "red",
            fontWeight: "bold",
            fontSize: "medium",
            emphasis: "strong",
          },
        ],
      },
    });
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.click(screen.getByTestId("unified-design-target-card"));
    await user.click(screen.getByTestId("unified-design-scope-field"));
    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "make the tax price red and bold",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));

    await waitFor(() => {
      const card = within(
        screen.getByTestId("mobile-preview-device"),
      ).getAllByRole("article")[0];
      const taxPriceValueEl = within(card).getByText(/1,000/);
      expect(taxPriceValueEl.style.getPropertyValue("--field-text-color")).toBe(
        "#dc2626",
      );
    });

    await user.click(screen.getByTestId("chat-design-back"));

    await waitFor(() => {
      const card = within(
        screen.getByTestId("mobile-preview-device"),
      ).getAllByRole("article")[0];
      const taxPriceValueEl = within(card).getByText(/1,000/);
      expect(taxPriceValueEl.style.getPropertyValue("--field-text-color")).toBe(
        "#dc2626",
      );
    });

    await user.click(
      within(screen.getByTestId("data-field-table-description")).getByTestId(
        "data-field-toggle-nutrient",
      ),
    );

    await waitFor(() => {
      const preview = within(screen.getByTestId("mobile-preview-device"));
      expect(preview.getByText("18-18-18")).toBeInTheDocument();
      const taxPriceValueEl = preview.getByText(/1,000/);
      expect(taxPriceValueEl.style.getPropertyValue("--field-text-color")).toBe(
        "#dc2626",
      );
    });

    await user.click(
      screen.getByTestId("data-field-toggle-tax_price"),
    );

    await waitFor(() => {
      expect(
        within(screen.getByTestId("mobile-preview-device")).queryByText(/1,000/),
      ).not.toBeInTheDocument();
    });
  });

  it("shows saved card AI field styling immediately when entering the design step", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue({
      ...EXISTING_CONFIG,
      categoryConfigs: [
        {
          ...EXISTING_CONFIG.categoryConfigs[0],
          categoryConfig: {
            ...EXISTING_CONFIG.categoryConfigs[0].categoryConfig,
            cardDesign: {
              visibleFields: ["product_name", "spec", "tax_price"],
              cardStyle: DEFAULT_CARD_STYLE,
              bodySlots: [
                {
                  id: "field-0-spec",
                  kind: "field",
                  field: "spec",
                  label: "규격",
                },
                {
                  id: "field-1-tax_price",
                  kind: "field",
                  field: "tax_price",
                  label: "과세가격",
                  style: {
                    field: "tax_price",
                    colorRole: "red",
                    fontWeight: "bold",
                    fontSize: "medium",
                    emphasis: "strong",
                  },
                },
              ],
            },
          },
        },
      ],
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await waitFor(() => {
      const card = within(
        screen.getByTestId("mobile-preview-device"),
      ).getAllByRole("article")[0];
      const taxPriceValueEl = within(card).getByText(/1,000/);
      expect(taxPriceValueEl.style.getPropertyValue("--field-text-color")).toBe(
        "#dc2626",
      );
    });
  });

  it("keeps existing card/page preview changes when confirming updated fields into the design step", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    mockPageAiResponse({
      palette: {
        backgroundHex: "#eef3fd",
        surfaceHex: "#ffffff",
        accentHex: "#2563eb",
        textHex: "#111827",
      },
    });
    mockCardAiResponse({
      field: {
        targetedFieldStyles: [
          {
            field: "tax_price",
            colorRole: "red",
            fontWeight: "bold",
            fontSize: "medium",
            emphasis: "strong",
          },
        ],
      },
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "cool trustworthy blue",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));
    await waitFor(() => {
      expect(
        screen
          .getByTestId("storefront-page")
          .style.getPropertyValue("--brand-color"),
      ).toBe("#2563eb");
    });

    await user.click(screen.getByTestId("unified-design-target-card"));
    await user.click(screen.getByTestId("unified-design-scope-field"));
    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "make the tax price red and bold",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));

    await waitFor(() => {
      const preview = within(screen.getByTestId("mobile-preview-device"));
      const taxPriceValueEl = preview.getByText(/1,000/);
      expect(taxPriceValueEl.style.getPropertyValue("--field-text-color")).toBe(
        "#dc2626",
      );
    });

    await user.click(screen.getByTestId("chat-design-back"));
    await user.click(
      within(screen.getByTestId("data-field-table-description")).getByTestId(
        "data-field-toggle-nutrient",
      ),
    );
    await user.click(screen.getByTestId("chat-confirm-field-selection"));

    await waitFor(() => {
      const preview = within(screen.getByTestId("mobile-preview-device"));
      expect(preview.getByText("18-18-18")).toBeInTheDocument();
      const taxPriceValueEl = preview.getByText(/1,000/);
      expect(taxPriceValueEl.style.getPropertyValue("--field-text-color")).toBe(
        "#dc2626",
      );
    });
    expect(
      screen
        .getByTestId("storefront-page")
        .style.getPropertyValue("--brand-color"),
    ).toBe("#2563eb");
  });

  it("never lets a card-design AI prompt change which fields are saved", async () => {
    mockCardAiResponse();
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.click(screen.getByTestId("unified-design-target-card"));
    await user.click(screen.getByTestId("unified-design-scope-field"));
    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "show the link more clearly",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));
    await user.click(screen.getByTestId("chat-save-storefront-draft"));

    await waitFor(() =>
      expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1),
    );
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];
    expect(
      savedPayload.categoryConfigs[0].categoryConfig.cardDesign.visibleFields,
    ).toEqual(["product_name", "spec", "tax_price"]);
  });

  it("returns to data selection after save while keeping the saved data selected and clearing design chat history", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);
    mockPageAiResponse();

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "cool trustworthy blue",
    );
    await user.click(screen.getByTestId("apply-unified-ai-design"));
    await waitFor(() => {
      expect(
        screen.getAllByTestId("chat-message-target-badge").length,
      ).toBeGreaterThan(0);
    });

    await user.click(screen.getByTestId("chat-save-storefront-draft"));

    expect(
      await screen.findByTestId("chat-stage-data-picker"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("chat-product-category-card-Fertilizer Upload"),
    ).toHaveAttribute("data-selected", "true");
    expect(screen.queryAllByTestId("chat-message-target-badge")).toHaveLength(
      0,
    );
  });

  it("resets fields, card design, and unified chat when the user switches to a different registered data set", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    await user.type(
      screen.getByTestId("unified-design-prompt"),
      "keep this draft",
    );
    await user.click(screen.getByTestId("chat-reopen-data-selection"));
    await user.click(
      screen.getByTestId("chat-select-product-category-Pesticide Upload"),
    );

    expect(
      await screen.findByTestId("chat-stage-field-picker"),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId("chat-message-target-badge")).toHaveLength(
      0,
    );
    expect(
      screen.queryByDisplayValue("keep this draft"),
    ).not.toBeInTheDocument();
  }, 10000);

  it("keeps the unified design step focused on saving and dashboard guidance instead of QR export", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await reachUnifiedDesignStep(user);

    expect(
      screen.queryByTestId("storefront-qr-export-card"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("open-storefront-qr-export"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("chat-save-storefront-draft"),
    ).toBeInTheDocument();
    expect(screen.getByText(/QR/)).toBeInTheDocument();
  });
});
