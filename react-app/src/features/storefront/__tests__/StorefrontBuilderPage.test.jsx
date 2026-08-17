import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOfficeProductDataEntries } from "../../office-product-editor/services/office-product-data/officeProductDataReadService";
import { requestCardStyleAiIntent } from "../model/card-design/ai-request/cardStyleAiOrchestrator";
import { requestPageStyleAiIntent } from "../model/page-design/ai-request/pageStyleAiOrchestrator";
import StorefrontBuilderPage from "../pages/StorefrontBuilderPage";
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

vi.mock("../model/page-design/ai-request/pageStyleAiOrchestrator", () => ({
  requestPageStyleAiIntent: vi.fn(),
}));

vi.mock("../model/card-design/ai-request/cardStyleAiOrchestrator", () => ({
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
    updatedAt: "2026-06-16T00:00:00Z",
    rows: [
      {
        product_category_name: "Pesticide Upload",
        product_name: "Beta",
        usage: "Leaf spray",
        detail_category: "Leaf Care",
        zero_tax_price: 2500,
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
    categoryChips: { enabled: true, sticky: true },
  },
  navConfig: {
    title: "Existing guide",
    subtitle: "Existing subtitle",
    brandColor: "#1d4a2e",
    searchPlaceholder: "Search products",
    logoUrl: "",
    searchVariant: "pill",
  },
  categoryConfigs: [
    {
      productCategoryName: "Fertilizer Upload",
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
    {
      productCategoryName: "Pesticide Upload",
      categoryConfig: {
        schemaVersion: 1,
        displayName: "Pesticide Upload",
        sourceCategoryName: "Pesticide Upload",
        selectedMediumCategories: [],
        representativeMediumCategory: "",
        layoutStyle: { variant: "card-grid" },
        cardDesign: {
          visibleFields: ["product_name", "usage", "zero_tax_price"],
          style: {
            layout: "grid",
            accentColor: "#1d4a2e",
            fontSize: "medium",
            cardsPerRow: 2,
          },
        },
      },
      updatedAt: "2026-06-16T00:00:00Z",
    },
  ],
  hiddenProducts: [],
  updatedAt: "2026-06-15T00:00:00Z",
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("StorefrontBuilderPage", () => {
  it("shows a loading state while fetching", () => {
    fetchOfficeProductDataEntries.mockReturnValue(new Promise(() => {}));
    fetchStorefrontConfig.mockReturnValue(new Promise(() => {}));

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(
      screen.getByText("스토어프론트 빌더를 불러오는 중.."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("storefront-chat-workspace"),
    ).not.toBeInTheDocument();
  });

  it("shows an error message when a fetch rejects", async () => {
    fetchOfficeProductDataEntries.mockRejectedValue(new Error("boom"));
    fetchStorefrontConfig.mockResolvedValue(null);

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(
      await screen.findByText("스토어프론트 빌더를 불러오지 못했습니다."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("storefront-chat-workspace"),
    ).not.toBeInTheDocument();
  });

  it("shows exactly the data and design mode-choice buttons", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    const bubble = await screen.findByTestId("storefront-mode-choice-bubble");

    expect(
      within(bubble).getByRole("button", { name: "대분류별 표시할 데이터선택" }),
    ).toBeInTheDocument();
    expect(
      within(bubble).getByRole("button", { name: "AI 디자인 수정" }),
    ).toBeInTheDocument();
    expect(within(bubble).getAllByRole("button")).toHaveLength(2);
  });

  it("enters design mode on the common-elements tab by default and renders the page-style composer", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );

    expect(
      await screen.findByTestId("storefront-chat-composer-dock"),
    ).toBeInTheDocument();
    expect(screen.getByText("공통 요소 디자인 작업 공간")).toBeInTheDocument();

    const tabs = screen.getByTestId("storefront-sticky-category-tabs");

    expect(within(tabs).getByRole("tab", { name: "공통 요소" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      within(tabs).getByRole("tab", { name: "Fertilizer Upload" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      within(tabs).getByRole("tab", { name: "Pesticide Upload" }),
    ).toHaveAttribute("aria-selected", "false");
  });

  it("sends a common-elements prompt through requestPageStyleAiIntent and shows the reply", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: {},
      explanation: "Page styling updated for the shared workspace preview.",
      suggestion: "Consider tightening the header after this pass.",
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );

    const composerInput = await screen.findByTestId(
      "storefront-chat-composer-input",
    );
    await user.type(composerInput, "Refresh the page tone and search area.");
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    expect(
      await screen.findByText(
        "Page styling updated for the shared workspace preview.",
      ),
    ).toBeInTheDocument();
    expect(requestPageStyleAiIntent).toHaveBeenCalledTimes(1);
    expect(requestCardStyleAiIntent).not.toHaveBeenCalled();
  });

  it("switches to a category tab and sends a card-design prompt through requestCardStyleAiIntent", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestCardStyleAiIntent.mockResolvedValue({
      intent: {},
      explanation: "Card styling updated for the selected category.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );
    await user.click(
      await screen.findByRole("tab", { name: "Fertilizer Upload" }),
    );

    expect(screen.getByText("카드 디자인 작업 공간")).toBeInTheDocument();

    const composerInput = screen.getByTestId("storefront-chat-composer-input");
    await user.type(composerInput, "Make the price field bold.");
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    expect(
      await screen.findByText("Card styling updated for the selected category."),
    ).toBeInTheDocument();
    expect(requestCardStyleAiIntent).toHaveBeenCalledTimes(1);
    expect(requestPageStyleAiIntent).not.toHaveBeenCalled();
  });

  it("discards an unapplied draft instead of saving it when switching tabs", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: { palette: { accentHex: "#14532d" } },
      explanation: "페이지 톤을 정리했습니다.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );
    await user.type(
      screen.getByTestId("storefront-chat-composer-input"),
      "초록 느낌으로 정리해줘",
    );
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    expect(
      await screen.findByRole("button", { name: "저장하기" }),
    ).toBeEnabled();

    await user.click(
      screen.getByRole("tab", { name: "Fertilizer Upload" }),
    );

    expect(screen.getByText("카드 디자인 작업 공간")).toBeInTheDocument();
    expect(upsertStorefrontConfig).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();

    requestCardStyleAiIntent.mockResolvedValue({
      intent: {},
      explanation: "Card updated.",
      suggestion: null,
    });

    await user.type(
      screen.getByTestId("storefront-chat-composer-input"),
      "카드 색상을 바꿔줘",
    );
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    await user.click(await screen.findByRole("button", { name: "저장하기" }));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];

    // The common-elements AI draft ("#14532d") from earlier in this test was
    // never applied, so switching tabs away from it must have reverted the
    // page style back to its original, unmodified value before this
    // (unrelated, card-design) save happened.
    expect(savedPayload.pageConfig.pageStyle.palette.accentHex).toBe(
      "#1d4a2e",
    );
    expect(savedPayload.pageConfig.pageStyle.palette.accentHex).not.toBe(
      "#14532d",
    );
  });

  it("applies through 저장하기 and supports one-level undo via 되돌리기", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: { palette: { accentHex: "#14532d" } },
      explanation: "페이지 톤을 정리했습니다.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" nhName="NH" />);

    await user.click(
      await screen.findByRole("button", { name: "AI 디자인 수정" }),
    );
    await user.type(
      screen.getByTestId("storefront-chat-composer-input"),
      "초록 느낌으로 정리해줘",
    );
    await user.click(screen.getByTestId("storefront-chat-composer-send"));
    await user.click(await screen.findByRole("button", { name: "저장하기" }));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];

    expect(savedPayload.pageConfig.pageStyle.palette.accentHex).toBe("#14532d");

    const undoButton = await screen.findByRole("button", { name: "되돌리기" });

    expect(undoButton).toBeInTheDocument();
    expect(
      screen.getAllByTestId("storefront-mode-choice-bubble").length,
    ).toBeGreaterThan(0);

    await user.click(undoButton);

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(2);
    expect(
      (await screen.findAllByTestId("storefront-mode-choice-bubble")).length,
    ).toBeGreaterThan(0);
  });

  it("keeps data mode working: category tabs, per-category field toggles, and 저장하기", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", {
        name: "대분류별 표시할 데이터선택",
      }),
    );

    expect(
      await screen.findByTestId("storefront-field-selection-dock"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("storefront-chat-composer-dock"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("data-field-row-tax_price")).toBeInTheDocument();
    expect(
      screen.queryByTestId("data-field-row-zero_tax_price"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Pesticide Upload" }));

    expect(
      await screen.findByTestId("data-field-row-zero_tax_price"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("data-field-row-tax_price"),
    ).not.toBeInTheDocument();
  });
});
