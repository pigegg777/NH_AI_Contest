# Storefront Default Brand Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the storefront header's brand logo render unconditionally, independent of whether the office name (`coopName`) can be derived; the office-name eyebrow line stays conditional.

**Architecture:** One render-branch change in `StorefrontView.jsx`'s `hero` block: hoist the logo/brand-identity wrapper out of the `coopName` ternary so it always mounts, and move the `coopName` check down to gate only the eyebrow `<p>`.

**Tech Stack:** React 19, Vitest + Testing Library (existing test conventions in this file).

## Global Constraints

- Per `docs/superpowers/specs/2026-06-23-storefront-default-brand-logo-design.md`: logo always renders; office-name eyebrow renders only when `view.coopName` is truthy.
- `brandLogoSrc`'s own fallback (`config?.navConfig?.logoUrl || nhCyberSymbolUrl`) is already correct — do not touch it.
- Out of scope: threading a real `officeName` prop into `StorefrontBuilderPage.jsx`'s `<StorefrontView>` call. Confirmed not needed.
- No CSS changes — reuse existing `.brandIdentity`/`.logoShell`/`.logo`/`.brandCopy`/`.eyebrow`/`.title` classes.

---

## Task 1: Always render the brand logo in the storefront hero block

**Files:**
- Modify: `react-app/src/features/storefront/components/StorefrontView.jsx` (the `'hero'` case inside `renderBlock`, currently lines 94-119)
- Test: `react-app/src/features/storefront/__tests__/StorefrontView.test.jsx`

**Interfaces:**
- Consumes: `view.coopName`, `view.headerTitle`, `brandLogoSrc` — all already computed in this file, no signature changes.
- Produces: no new exports. Adds one `data-testid="storefront-brand-logo"` attribute to the rendered `<img>` so the new test can query it reliably (the wrapping `.logoShell` div has `aria-hidden="true"`, which makes Testing Library's role-based queries skip the image — a `data-testid` sidesteps that).

- [ ] **Step 1: Write the failing test**

Add this test to `react-app/src/features/storefront/__tests__/StorefrontView.test.jsx`, inside the existing `describe('StorefrontView', () => { ... })` block (add it as a new top-level `it(...)`, alongside the existing two):

```jsx
  it('still renders the brand logo when no office/co-op name can be derived', () => {
    render(
      <StorefrontView
        config={{
          pageConfig: {
            nav: { title: '' },
            searchSection: { enabled: true, placeholder: 'Search products' },
            categoryChips: { enabled: true, sticky: true, variant: 'soft' },
            mobileUiTree: [
              { id: 'hero', type: 'hero', slot: 'top', enabled: true, props: {} },
              { id: 'search-box', type: 'searchBox', slot: 'top', enabled: true, props: {} },
              { id: 'product-sections', type: 'productSections', slot: 'beforeProducts', enabled: true, props: {} },
              { id: 'empty-state', type: 'emptyState', slot: 'bottom', enabled: true, props: {} },
            ],
          },
          navConfig: { title: '' },
          categoryConfigs: [],
        }}
        productRows={[]}
      />,
    );

    expect(screen.getByTestId('storefront-brand-logo')).toBeInTheDocument();
    expect(screen.queryByText('남해농협')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontView.test.jsx -t "still renders the brand logo"`
Expected: FAIL — `Unable to find an element by: [data-testid="storefront-brand-logo"]` (the current code renders no logo at all when `coopName` is empty, and the `data-testid` doesn't exist yet either way).

- [ ] **Step 3: Implement the fix**

In `react-app/src/features/storefront/components/StorefrontView.jsx`, replace the `'hero'` case's body:

```jsx
      case 'hero':
        return (
          <div key={elementKey} className={styles.heroTop}>
            <div className={styles.brandBlock}>
              {view.coopName ? (
                <div className={styles.brandIdentity}>
                  <div className={styles.logoShell} aria-hidden="true">
                    <img className={styles.logo} src={brandLogoSrc} alt="" />
                  </div>
                  <div className={styles.brandCopy}>
                    <p className={styles.eyebrow}>{view.coopName}</p>
                    <h1 className={styles.title}>
                      {view.headerTitle}
                    </h1>
                  </div>
                </div>
              ) : (
                <div className={styles.brandCopy}>
                  <h1 className={styles.title}>
                    {view.headerTitle}
                  </h1>
                </div>
              )}
            </div>
          </div>
        );
```

with:

```jsx
      case 'hero':
        return (
          <div key={elementKey} className={styles.heroTop}>
            <div className={styles.brandBlock}>
              <div className={styles.brandIdentity}>
                <div className={styles.logoShell} aria-hidden="true">
                  <img
                    className={styles.logo}
                    src={brandLogoSrc}
                    alt=""
                    data-testid="storefront-brand-logo"
                  />
                </div>
                <div className={styles.brandCopy}>
                  {view.coopName ? (
                    <p className={styles.eyebrow}>{view.coopName}</p>
                  ) : null}
                  <h1 className={styles.title}>
                    {view.headerTitle}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        );
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd react-app && npx vitest run src/features/storefront/__tests__/StorefrontView.test.jsx`
Expected: PASS, all tests in this file (the 2 existing ones plus the new one).

- [ ] **Step 5: Run the full storefront suite to confirm no regressions**

Run: `cd react-app && npx vitest run src/features/storefront`
Expected: PASS, no new failures (the existing "renders the co-op name in the brand row..." test still passes since it has a non-empty `navConfig.title`, so the eyebrow still renders for it — only the branch structure changed, not the truthy-`coopName` behavior).

- [ ] **Step 6: Commit**

```bash
git add react-app/src/features/storefront/components/StorefrontView.jsx react-app/src/features/storefront/__tests__/StorefrontView.test.jsx
git commit -m "fix(storefront): always render the brand logo, even when no office name is known"
```

---

## Self-Review

**Spec coverage:** The design's only requirement — logo unconditional, eyebrow conditional, no CSS changes, no builder-prop-passing changes — is fully covered by Task 1's single render-branch edit.

**Placeholder scan:** None — every step has literal code or an exact command.

**Type/name consistency:** `view.coopName`, `view.headerTitle`, `brandLogoSrc`, `styles.brandIdentity`/`.logoShell`/`.logo`/`.brandCopy`/`.eyebrow`/`.title` are all pre-existing identifiers already in scope in this file; no new names introduced except the `data-testid` string, which is used identically in both the implementation step and the test step.
