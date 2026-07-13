import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOfficeProductDataEntries } from "../../office-product-editor/services/office-product-data/officeProductDataReadService";
import { requestCardStyleAiIntent } from "../model/card-design/cardStyleAiOrchestrator";
import { requestPageStyleAiIntent } from "../model/page-design/pageStyleAiOrchestrator";
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
    {
      officeCode: "OFF-1",
      productCategoryName: "Pesticide Upload",
      sortOrder: 1,
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

  it("mounts the Task 2 chat workspace shell and keeps the preview mounted", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    expect(
      await screen.findByTestId("storefront-chat-workspace"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("storefront-chat-thread")).toBeInTheDocument();
    expect(
      screen.getByTestId("storefront-mode-choice-bubble"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("mobile-preview-device")).toBeInTheDocument();
    expect(
      screen.queryByTestId("start-storefront-builder"),
    ).not.toBeInTheDocument();
  });

  it("shows the approved mode-choice buttons and switches into the selected mode", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await screen.findByTestId("storefront-mode-choice-bubble");

    const pageButton = screen.getByRole("button", {
      name: "1. 페이지 전반 디자인 수정",
    });
    const dataButton = screen.getByRole("button", {
      name: "2. 카테고리별 데이터 수정",
    });
    const cardButton = screen.getByRole("button", {
      name: "3. 카테고리별 상세 디자인 수정",
    });
    const autoDesignButton = screen.getByRole("button", {
      name: "4. 통합 자동 디자인",
    });

    expect(pageButton).toBeInTheDocument();
    expect(dataButton).toBeInTheDocument();
    expect(cardButton).toBeInTheDocument();
    expect(autoDesignButton).toBeInTheDocument();

    await user.click(pageButton);

    expect(
      await screen.findByTestId("storefront-chat-composer-dock"),
    ).toBeInTheDocument();
    within(screen.getByTestId("storefront-mode-choice-bubble"))
      .getAllByRole("button")
      .forEach((button) => {
        expect(button).not.toBeDisabled();
      });
  });

  it("keeps mode 2 inside the chat workspace with sticky category tabs and the field-selection dock", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await screen.findByTestId("storefront-chat-workspace");

    await user.click(
      screen.getByRole("button", {
        name: /^2\./,
      }),
    );

    expect(
      await screen.findByTestId("storefront-sticky-category-tabs"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("storefront-field-selection-dock"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("storefront-chat-composer-dock"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("storefront-chat-workspace")).toBeInTheDocument();
    const pinnedModeChoiceBubble = screen.getByTestId(
      "storefront-mode-choice-bubble",
    );
    within(pinnedModeChoiceBubble)
      .getAllByRole("button")
      .forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    expect(
      screen.getByTestId("data-field-row-tax_price"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("data-field-row-zero_tax_price"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("tab", {
        name: "Pesticide Upload",
      }),
    );

    expect(screen.getByTestId("storefront-chat-workspace")).toBeInTheDocument();
    expect(
      await screen.findByTestId("data-field-row-zero_tax_price"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("data-field-row-tax_price"),
    ).not.toBeInTheDocument();
  });

  it("uses the shared composer dock for page mode and appends the mocked assistant explanation", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: {},
      explanation: "Page styling updated for the shared workspace preview.",
      suggestion: "Consider tightening the header after this pass.",
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await screen.findByTestId("storefront-chat-workspace");

    await user.click(
      screen.getByRole("button", {
        name: /^1\./,
      }),
    );

    expect(
      await screen.findByTestId("storefront-chat-composer-dock"),
    ).toBeInTheDocument();

    const composerInput = screen.getByTestId("storefront-chat-composer-input");
    await user.type(composerInput, "Refresh the page tone and search area.");
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    expect(
      await screen.findByText(
        "Page styling updated for the shared workspace preview.",
      ),
    ).toBeInTheDocument();
    expect(requestPageStyleAiIntent).toHaveBeenCalledTimes(1);
  });

  it("keeps sticky category tabs visible in card mode while rendering the shared composer dock", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestCardStyleAiIntent.mockResolvedValue({
      intent: {},
      explanation: "Card styling updated for the selected category.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await screen.findByTestId("storefront-chat-workspace");

    await user.click(
      screen.getByRole("button", {
        name: /^3\./,
      }),
    );

    expect(
      await screen.findByTestId("storefront-sticky-category-tabs"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("storefront-chat-composer-dock"),
    ).toBeInTheDocument();
  });

  it("applies both page and card style from one holistic prompt in auto-design mode", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: {
        palette: {
          accentHex: "#14532d",
        },
      },
      explanation: "페이지 톤을 정리했습니다.",
      suggestion: null,
    });
    requestCardStyleAiIntent.mockResolvedValue({
      intent: {},
      explanation: "카드 정보 영역을 정리했습니다.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await screen.findByTestId("storefront-chat-workspace");

    await user.click(
      screen.getByRole("button", {
        name: "4. 통합 자동 디자인",
      }),
    );

    expect(
      await screen.findByTestId("storefront-chat-composer-dock"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("storefront-field-selection-dock"),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByTestId("storefront-chat-composer-input"),
      "가독성 있게 알아서 정리해줘",
    );
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    expect(
      await screen.findByText(/페이지 톤을 정리했습니다\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/카드 정보 영역을 정리했습니다\./)).toBeInTheDocument();

    const saveButton = await screen.findByRole("button", { name: "저장하기" });

    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    const savedPayload = upsertStorefrontConfig.mock.calls[0][0];

    expect(savedPayload.pageConfig.pageStyle.palette.accentHex).toBe(
      "#14532d",
    );
  });

  it("applies immediately and supports one-level undo from the assistant result bubble", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    upsertStorefrontConfig.mockResolvedValue(undefined);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: {
        palette: {
          accentHex: "#14532d",
        },
      },
      explanation: "페이지 톤을 정리했습니다.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" nhName="NH" />);

    await user.click(
      await screen.findByRole("button", {
        name: "1. 페이지 전반 디자인 수정",
      }),
    );
    await user.type(
      screen.getByTestId("storefront-chat-composer-input"),
      "초록 느낌으로 정리해줘",
    );
    await user.click(screen.getByTestId("storefront-chat-composer-send"));
    await user.click(await screen.findByRole("button", { name: "적용" }));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("button", { name: "되돌리기" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByTestId("storefront-mode-choice-bubble").length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "되돌리기" }));

    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(2);
    expect(
      (await screen.findAllByTestId("storefront-mode-choice-bubble")).length,
    ).toBeGreaterThan(0);
  });

  it("switches mode directly from the pinned mode-choice bubble and discards an unapplied draft instead of saving it", async () => {
    fetchOfficeProductDataEntries.mockResolvedValue(PRODUCT_ENTRIES);
    fetchStorefrontConfig.mockResolvedValue(EXISTING_CONFIG);
    requestPageStyleAiIntent.mockResolvedValue({
      intent: {
        palette: {
          accentHex: "#14532d",
        },
      },
      explanation: "페이지 톤을 정리했습니다.",
      suggestion: null,
    });

    const user = userEvent.setup();
    render(<StorefrontBuilderPage officeCode="OFF-1" />);

    await user.click(
      await screen.findByRole("button", {
        name: "1. 페이지 전반 디자인 수정",
      }),
    );
    await user.type(
      screen.getByTestId("storefront-chat-composer-input"),
      "초록 느낌으로 정리해줘",
    );
    await user.click(screen.getByTestId("storefront-chat-composer-send"));

    expect(await screen.findByRole("button", { name: "적용" })).toBeEnabled();

    const cardButton = screen.getByRole("button", {
      name: "3. 카테고리별 상세 디자인 수정",
    });

    expect(cardButton).not.toBeDisabled();

    await user.click(cardButton);

    expect(await screen.findByText("카드 디자인 작업 공간")).toBeInTheDocument();
    expect(upsertStorefrontConfig).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "적용" })).toBeDisabled();
  });
});
