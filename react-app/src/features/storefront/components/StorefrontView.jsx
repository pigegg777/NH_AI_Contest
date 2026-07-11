import { useStorefrontView } from '../hooks/useStorefrontView';
import nhCyberSymbolUrl from '../assets/nh_cyber_symbol.png';
import {
  buildRenderableMobileUiTree,
  resolveSlotBlocks,
  HEADER_SLOT_ORDER,
  BODY_SLOT_ORDER,
} from '../model/storefront-view/storefrontViewLayoutModel';
import { buildStorefrontViewCssVars } from '../model/storefront-view/storefrontViewStyleModel';
import CardGridSection from './CardGridSection';
import DesktopCategoryRail from './storefront-view/DesktopCategoryRail';
import HelperBlock from './storefront-view/HelperBlock';
import StorefrontViewBlock from './storefront-view/StorefrontViewBlock';
import styles from './StorefrontView.module.css';

export default function StorefrontView({ config, productRows, officeName, nhName }) {
  const view = useStorefrontView({ config, productRows, officeName, nhName });
  const brandLogoSrc = config?.navConfig?.logoUrl || nhCyberSymbolUrl;
  const renderableMobileUiTree = buildRenderableMobileUiTree(
    view.mobileUiTree,
    view.catalogSectionEntries.length > 0,
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
            title={view.title}
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
              표시할 상품이 없습니다. 검색어나 중분류를 다시 확인해 주세요.
            </div>
          ) : null}

          {renderSlot('bottom')}
        </div>
      </div>
    </div>
  );
}
