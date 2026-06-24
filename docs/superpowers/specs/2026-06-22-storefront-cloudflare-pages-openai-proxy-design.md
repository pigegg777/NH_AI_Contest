# Storefront Cloudflare Pages OpenAI Proxy Design

## Goal

Deploy the current `react-app/` storefront application on Cloudflare Pages without exposing OpenAI secrets in the browser bundle.

The deployed app should keep the existing public storefront QR flow, preserve the authenticated builder experience, and move AI design calls behind Cloudflare Pages Functions so production secrets stay server-side.

## User-Approved Direction

- The deployment target is Cloudflare Pages.
- Git-based branch deploys will be used.
- Secrets should be managed through Cloudflare environment variables rather than committed files.
- The recommended direction is `static Vite front end + Pages Functions OpenAI proxy`.
- The result should be ready for both the authenticated builder and the public QR storefront.

## Problem

The current app is safe to deploy as a static Vite frontend only for features that use public configuration.

It is not safe to deploy the current AI flow as-is because:

- Vite exposes `VITE_*` variables to client bundles.
- the current AI interpreters read `VITE_OPENAI_API_KEY` in frontend code
- a Cloudflare Pages environment variable does not remain secret if it is compiled into Vite client code
- a naive generic proxy endpoint would protect the raw key, but still allow anyone on the internet to spend the key if the route is public

This means the deployment design must solve two separate problems:

1. prevent OpenAI keys from entering the browser bundle
2. prevent arbitrary public callers from abusing the proxy endpoint

## Constraints

- The Pages project will be rooted at `react-app/`, not the repository root.
- The storefront public page must keep working from QR links such as `/?tool=store&office=<officeCode>`.
- The builder remains a client-rendered React app using Supabase Auth.
- The public storefront remains readable with publishable-key access only.
- No long-running backend server may be introduced.
- The final shape must stay compatible with Cloudflare Pages native Vite deployment and Pages Functions.

## Recommended Approach

Use Cloudflare Pages for two runtime surfaces inside the same project:

1. a static Vite frontend for the builder, dashboard, login, and public storefront
2. narrow Cloudflare Pages Functions routes for AI-only server work

This keeps the current frontend architecture mostly intact while removing secret handling from the browser.

Why this approach:

- Cloudflare Pages natively supports Vite builds and Pages Functions.
- The Pages project can use `react-app/` as the root directory and `dist/` as the build output.
- The OpenAI key can live only in Pages Function environment variables.
- The public storefront and QR flow stay static and cache-friendly.
- The authenticated builder can call same-origin `/api/...` routes without introducing a separate backend host.

Per Cloudflare’s docs, Pages supports Vite builds with `npm run build` and `dist` output, and Pages Functions run from a `/functions` directory located at the root of the Pages project. Since this repo is effectively a monorepo, the Pages root directory should be `react-app/`, so the Functions directory should live at `react-app/functions/`. Sources: Cloudflare Pages build configuration, Git integration, Vite guide, and Functions get-started docs:

- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/
- https://developers.cloudflare.com/pages/functions/get-started/

## Environment Variable Model

### 1. Public browser variables

These are safe to ship in client code and should remain `VITE_*`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_APP_URL`

These values are needed by the static app and are acceptable in a browser context.

Supabase’s current docs explicitly treat publishable keys as safe for public components like web pages, while warning that service-role or secret keys must never be exposed on the frontend. Source:

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/secure-data

### 2. Server-only Cloudflare variables

These must exist only in Pages Functions environment settings:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional override, default `gpt-4.1-mini`)

Potential future server-only variables, not required for the first slice:

- `RDA_API_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` for future administrative server tasks

### 3. Variables that must not be used in production frontend builds

These should be removed from the deployed client env contract:

- `VITE_OPENAI_API_KEY`
- `VITE_RDA_API_KEY`
- `VITE_SUPABASE_KEY` when it contains a secret or service-role credential

Per Vite’s official env docs, variables prefixed with `VITE_` are exposed in client-side source code after bundling and should not contain sensitive information. Source:

- https://vite.dev/guide/env-and-mode

## Deployment Topology

### Pages project settings

- Git repository: current repository
- Production branch: user-selected deploy branch
- Root directory: `react-app`
- Build command: `npm run build`
- Build output directory: `dist`

### Cloudflare file layout

Planned deployment-relevant project files:

- `react-app/functions/api/storefront-ai/page-style.js`
- `react-app/functions/api/storefront-ai/card-style.js`
- optional `react-app/functions/_middleware.js` only if cross-route auth or shared headers become necessary

No `_worker.js` advanced mode is needed for the first implementation because the route surface is small and file-based routing is sufficient.

## Request Flow

### Public storefront and QR flow

This flow stays unchanged in architecture:

1. QR code points to `/?tool=store&office=<officeCode>`
2. Cloudflare serves the static app
3. the public page loads public storefront data through Supabase publishable-key access
4. the page renders the saved storefront

No OpenAI function is involved in public QR browsing.

### Authenticated AI builder flow

The new AI flow:

1. user signs in with Supabase Auth in the browser
2. builder gathers the current page or card context
3. frontend sends a POST request to a same-origin Pages Function endpoint
4. request includes the user’s current Supabase access token in `Authorization: Bearer <jwt>`
5. Pages Function validates the JWT against Supabase Auth
6. Pages Function optionally verifies office ownership from the `login_users` profile row
7. Pages Function builds a bounded OpenAI request and calls OpenAI using `OPENAI_API_KEY`
8. Pages Function returns only normalized structured AI output
9. frontend compiles the intent into preview-safe UI state

## AI Proxy Boundary

The proxy must be narrow and purpose-built.

It should not expose a generic “send any OpenAI request through our key” endpoint.

Recommended route split:

- `POST /api/storefront-ai/page-style`
- `POST /api/storefront-ai/card-style`

Each route should:

- accept only JSON
- accept only POST
- validate a signed-in Supabase user
- validate payload size and expected fields
- build the OpenAI request internally from known schema builders
- return structured style intent only

This avoids the largest abuse risk of a thin generic proxy.

## Authentication and Abuse Control

Protecting the raw key is not enough. The route itself must also be restricted.

### Minimum required gate

Every AI endpoint should require a valid Supabase access token from the signed-in builder session.

The server-side function should not trust local session state from the browser. It should revalidate the token with Supabase Auth using a server-side network call.

Supabase’s docs recommend `getUser()` or `getClaims()` for authentic token validation on the server side, rather than trusting `getSession()`. Relevant official sources:

- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/reference/javascript/auth-getclaims
- https://supabase.com/docs/guides/auth/server-side/creating-a-client

### Office ownership gate

After token validation, the function should load the matching `login_users` profile for the authenticated `auth_user_id`.

The request payload’s `officeCode` should match the profile’s `office_code`.

If the codes do not match, the function should reject the request with `403`.

This prevents a logged-in user from crafting AI requests for a different office by editing client payloads manually.

### Rate and shape control

First implementation does not need global rate limiting infrastructure, but it should still enforce:

- maximum prompt length
- maximum JSON body size
- exact payload allowlist
- exact OpenAI schema allowlist

This keeps cost exposure bounded even before more advanced rate controls are added.

## Shared Code Design

The current AI code mixes three concerns:

- heuristic fallback logic
- OpenAI request construction
- environment-specific transport

For the Cloudflare design, those concerns should be separated.

### Recommended internal split

1. **Pure contract/build logic**
   - schema
   - payload normalization
   - prompt-building helpers
   - response normalization

2. **Client orchestrator**
   - decide whether to use heuristic fallback or server route
   - fetch same-origin function endpoint
   - compile returned intent into preview state

3. **Server transport**
   - read Cloudflare env
   - validate auth
   - call OpenAI
   - return sanitized structured response

This keeps business logic shared while making the secret-dependent transport server-only.

## File-Level Direction

The likely implementation shape should stay close to current storefront boundaries.

### Frontend files

- `react-app/src/features/storefront/services/pageStyleAiInterpreter.js`
  - stop reading `VITE_OPENAI_API_KEY`
  - call `/api/storefront-ai/page-style`
  - keep heuristic fallback for local or server-disabled cases only

- `react-app/src/features/storefront/services/cardStyleAiInterpreter.js`
  - stop reading `VITE_OPENAI_API_KEY`
  - call `/api/storefront-ai/card-style`
  - keep heuristic fallback for local or server-disabled cases only

- `react-app/src/features/storefront/services/openAiJsonRequest.js`
  - either move to a server-only path or refactor into a pure transport utility that no longer touches frontend env

- `react-app/src/lib/supabaseClient.js`
  - continue using only publishable browser-safe values
  - do not support `VITE_SUPABASE_KEY` in deployment docs for production

### Function files

- `react-app/functions/api/storefront-ai/page-style.js`
- `react-app/functions/api/storefront-ai/card-style.js`

Each function should import only the pure builders/normalizers needed to process the request, not the full browser hook surface.

## Supabase Security Assumptions

The public storefront still depends on publishable-key reads.

That means deployment readiness also requires:

- RLS enabled where appropriate
- public read policies only for data intentionally exposed to QR storefront visitors
- no service-role dependency in public storefront rendering

Supabase’s RLS docs note that once RLS is enabled, no data is accessible with a publishable key until explicit policies are created. Source:

- https://supabase.com/docs/guides/database/postgres/row-level-security

This is important because the Cloudflare deployment itself may succeed while the public QR storefront still fails at runtime if public-read policies are missing.

## Error Handling

### Function-side errors

- `401` when no bearer token is present
- `403` when office ownership does not match
- `405` for non-POST requests
- `413` for oversized bodies
- `422` for invalid payload structure
- `502` when OpenAI returns an invalid upstream response
- `500` only for unexpected internal failures

### Frontend behavior

- keep the last valid preview if the AI request fails
- surface a concise error message in the builder
- never block QR/public rendering due to AI endpoint issues
- preserve heuristic fallback for development or explicitly disabled server AI mode if desired

## Deployment Checklist

### Git and branch setup

- keep secrets out of Git
- use Cloudflare project environment variables for Preview and Production separately
- point the Pages production branch to the chosen deploy branch
- set Pages root directory to `react-app`

### Pages environment variables

Preview and Production should both define:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_APP_URL`
- `OPENAI_API_KEY`
- optional `OPENAI_MODEL`

Preview and Production should not define:

- `VITE_OPENAI_API_KEY`
- `VITE_SUPABASE_KEY` if it is secret-bearing

### Functional verification

- authenticated login works on the deployed domain
- builder can call page-style AI
- builder can call card-style AI
- public QR link loads without auth
- public QR page renders storefront data correctly
- pushing to the deploy branch triggers automatic rebuilds

## Risks To Watch

- moving AI to Pages Functions without auth gating still leaves a public cost-abuse endpoint
- office ownership checks may be skipped accidentally if the first slice validates only “any logged-in user”
- public storefront may fail after deploy if Supabase RLS is not aligned with publishable-key reads
- existing tests may need environment-aware updates because OpenAI is no longer read from `import.meta.env` on the client
- if root directory is configured incorrectly in Pages, `functions/` will not be discovered

## Non-Goals

- replacing the whole app with SSR
- adding a separate Express or Nest backend
- moving public storefront rendering off the static app
- building global rate-limiting infrastructure in the first slice
- using service-role Supabase keys in the browser

## Result

The application remains a simple Vite frontend on Cloudflare Pages, but secret-bearing AI calls move into protected Pages Functions.

This gives the project a deployment shape that is compatible with Git-based branch deploys, keeps QR and public storefront access simple, and removes the highest-risk production issue: exposing OpenAI credentials in the browser bundle.
