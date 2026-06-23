# Storefront Default Brand Logo Design

## Goal

The storefront header's logo (and the brand identity block it lives in) should always render, regardless of whether the office name can be derived. The office name label should still only render when it's actually known.

## Problem

`StorefrontView.jsx`'s `hero` block render branch is gated entirely on `view.coopName`:

```jsx
{view.coopName ? (
  <div className={styles.brandIdentity}>
    <div className={styles.logoShell} aria-hidden="true">
      <img className={styles.logo} src={brandLogoSrc} alt="" />
    </div>
    <div className={styles.brandCopy}>
      <p className={styles.eyebrow}>{view.coopName}</p>
      <h1 className={styles.title}>{view.headerTitle}</h1>
    </div>
  </div>
) : (
  <div className={styles.brandCopy}>
    <h1 className={styles.title}>{view.headerTitle}</h1>
  </div>
)}
```

When `coopName` is empty (e.g. the builder's live preview, which doesn't pass an `officeName` prop into `StorefrontView` and falls back to deriving it from product rows — a derivation that can come up empty), the logo disappears entirely, even though `brandLogoSrc` already has a sensible default (`config?.navConfig?.logoUrl || nhCyberSymbolUrl` — the bundled NH brand mark) that doesn't depend on `coopName` at all.

## Decision

Render the logo + brand identity wrapper unconditionally. Render the office-name eyebrow line only when `view.coopName` is truthy. Do not change anything about how `coopName` itself is derived, and do not change the builder preview's prop-passing — confirmed acceptable with the user: when office name is unavailable, showing the logo alone (no name label) is the desired fallback, not blocking on a separate fix to thread `officeName` into the builder preview.

## Change

`react-app/src/features/storefront/components/StorefrontView.jsx`, the `'hero'` case inside `renderBlock`:

```jsx
case 'hero':
  return (
    <div key={elementKey} className={styles.heroTop}>
      <div className={styles.brandBlock}>
        <div className={styles.brandIdentity}>
          <div className={styles.logoShell} aria-hidden="true">
            <img className={styles.logo} src={brandLogoSrc} alt="" />
          </div>
          <div className={styles.brandCopy}>
            {view.coopName ? <p className={styles.eyebrow}>{view.coopName}</p> : null}
            <h1 className={styles.title}>{view.headerTitle}</h1>
          </div>
        </div>
      </div>
    </div>
  );
```

No CSS changes — `.brandIdentity`/`.logoShell`/`.logo`/`.brandCopy`/`.eyebrow`/`.title` are all existing classes, just no longer conditionally mounted as a pair.

## Testing

Add a case to `StorefrontView.test.jsx`: render with no `officeName` prop and product rows that don't carry an office name either, assert the logo `<img>` is present (`getByRole('img')` or a test id) and the eyebrow text is absent (`queryByText` for whatever office-name placeholder would have shown).

## Out of scope

- Threading a real `officeName` into `StorefrontBuilderPage.jsx`'s `<StorefrontView>` call so the eyebrow shows correctly in the builder preview too. Confirmed not needed for this change — logo-always-visible is the actual ask.
- Any change to `brandLogoSrc`'s own fallback logic (`navConfig.logoUrl || nhCyberSymbolUrl`) — already correct, untouched.
