# Auth Form Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract shared auth field handling into one hook and move page-specific submit logic into dedicated auth hooks.

**Architecture:** Add one shared field-state module and two page-specific modules. Refactor both auth pages to consume those modules so render code stays separate from submit state transitions.

**Tech Stack:** React 19, Vitest, React Testing Library

---

### Task 1: Add failing hook tests

**Files:**
- Create: `react-app/src/features/auth/hooks/useAuthFormFields.test.jsx`
- Create: `react-app/src/features/auth/hooks/useLoginForm.test.jsx`
- Create: `react-app/src/features/auth/hooks/useRegisterForm.test.jsx`

- [ ] Write failing tests for shared field updates and login/register submit behavior.
- [ ] Run `npm run test:run -- src/features/auth/hooks/useAuthFormFields.test.jsx src/features/auth/hooks/useLoginForm.test.jsx src/features/auth/hooks/useRegisterForm.test.jsx` from `react-app`.
- [ ] Confirm failure because new hook modules do not exist yet.

### Task 2: Implement hook modules

**Files:**
- Create: `react-app/src/features/auth/hooks/useAuthFormFields.js`
- Create: `react-app/src/features/auth/hooks/useLoginForm.js`
- Create: `react-app/src/features/auth/hooks/useRegisterForm.js`

- [ ] Implement shared field state and page-specific submit modules with minimal interfaces.
- [ ] Re-run new hook tests until green.

### Task 3: Refactor auth pages

**Files:**
- Modify: `react-app/src/features/auth/pages/LoginPage.jsx`
- Modify: `react-app/src/features/auth/pages/RegisterPage.jsx`

- [ ] Replace inline auth state logic with hook usage.
- [ ] Keep rendered markup and user-visible messages unchanged.

### Task 4: Regression verification

**Files:**
- Verify: `react-app/src/features/auth/pages/RegisterPage.test.jsx`

- [ ] Run `npm run test:run -- src/features/auth/hooks/useAuthFormFields.test.jsx src/features/auth/hooks/useLoginForm.test.jsx src/features/auth/hooks/useRegisterForm.test.jsx src/features/auth/pages/RegisterPage.test.jsx`.
- [ ] Run `npm run test:run -- src/features/auth/services/authService.test.js`.
- [ ] Confirm all targeted auth tests pass.
