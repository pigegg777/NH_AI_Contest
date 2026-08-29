import { useStorefrontView } from '../../hooks/useStorefrontView';
import nhCyberSymbolUrl from '../../../../common/assets/nh_cyber_symbol.png';
import {
  buildRenderableMobileUiTree,
  resolveSlotBlocks,
  HEADER_SLOT_ORDER,
  BODY_SLOT_ORDER,
} from '../../model/view/storefrontViewLayoutModel';
import { buildStorefrontViewCssVars } from '../../model/view/storefrontViewStyleModel';
import CardGridSection from './product-cards/CardGridSection';
import CategoryInformationPanel from './category-nav/CategoryInformationPanel';
import DesktopCategoryRail from './category-nav/DesktopCategoryRail';
import HelperBlock from './blocks/HelperBlock';
import InformationNavigationBlock from './category-nav/InformationNavigationBlock';
import OfficeInformationPanel from './category-nav/OfficeInformationPanel';
import StorefrontViewBlock from './blocks/StorefrontViewBlock';
import styles from './StorefrontView.module.css';

export default function StorefrontView({
  config,
  productRows,
  officeName,
  nhName,
  selectedSectionName,
  productUpdatedAt,
}) {
  const view = useStorefrontView({
    config,
    productRows,
    officeName,
    nhName,
    selectedSectionName,
    productUpdatedAt,
  });
  const brandLogoSrc = config?.navConfig?.logoUrl || nhCyberSymbolUrl;
  const renderableMobileUiTree = buildRenderableMobileUiTree(
    view.mobileUiTree,
    view.catalogSectionEntries.length > 0 || view.hasInformationContent,
  );

  function renderSlot(slot) {
    return resolveSlotBlocks(renderableMobileUiTree, slot).map((block) => {
      const elementKey = `${slot}-${block.id}`;

      return (
        <StorefrontViewBlock
          key={elementKey}
          block={block}
          view={view}
          brandLogoSrc={brandLogoSrc}
          elementKey={elementKey}
        />
      );
    });
  }

  return (
    <div
      className={styles.page}
      data-testid="storefront-page"
      style={buildStorefrontViewCssVars(view)}
    >
      <header className={styles.hero}>
        {HEADER_SLOT_ORDER.map((slot) => renderSlot(slot))}
      </header>

      <div
        className={`${styles.bodyShell} ${!view.canRenderDesktopCategoryRail ? styles.bodyShellSolo : ''}`}
      >
        {view.canRenderDesktopCategoryRail ? (
          <DesktopCategoryRail
            catalogSectionEntries={view.catalogSectionEntries}
            activeSectionTitle={view.activeSectionTitle}
            title={view.pageTitle}
            isOpen={view.isDesktopCategoryNavOpen}
            onToggle={() =>
              view.setIsDesktopCategoryNavOpen((current) => !current)
            }
            activeMediumCategory={view.activeMediumCategory}
            onSectionSelect={view.handleCategoryRailSectionSelect}
            onMediumSelect={view.handleCategoryRailMediumSelect}
          />
        ) : null}

        <div className={styles.contentColumn}>
          {BODY_SLOT_ORDER.map((slot) => {
            if (slot === 'bottom') {
              return null;
            }

            return renderSlot(slot);
          })}

          <InformationNavigationBlock view={view} />

          {view.isInformationIntroActive && view.activeInformationIntro?.kind === 'office' ? (
            <OfficeInformationPanel entries={view.activeInformationIntro.entries} />
          ) : null}

          {view.isInformationIntroActive && view.activeInformationIntro?.kind === 'category' ? (
            <CategoryInformationPanel
              categoryName={view.activeInformationIntro.categoryName}
              entries={view.activeInformationIntro.entries}
            />
          ) : null}

          {view.hasRenderableSections
            ? view.sectionEntries.map(({ section, sectionId }) => (
                <CardGridSection
                  key={sectionId}
                  sectionId={sectionId}
                  section={section}
                  fields={section?.fields}
                  cardStyle={section?.cardStyle}
                  bodySlots={section?.bodySlots}
                  sectionHeaderContent={view.sectionHeaderBlocks.map((block) => (
                    <HelperBlock key={`${sectionId}-${block.id}`} block={block} />
                  ))}
                />
              ))
            : null}

          {view.canRenderEmptyState ? (
            <div className={styles.emptyState}>
              찾으시는 자재가 없습니다. 검색어를 바꾸거나 다른 분류를 눌러보세요.
            </div>
          ) : null}

          {renderSlot('bottom')}
        </div>
      </div>
    </div>
  );
}
