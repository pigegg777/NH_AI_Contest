# Auth Form Hooks Design

**Date:** 2026-06-27

## Goal

Move duplicated auth page state transitions behind small hooks so `LoginPage` and `RegisterPage` stay focused on rendering.

## Approved Direction

- Extract one shared `module` for auth field state and `handleChange`.
- Keep submit logic split into page-specific hooks because login and register have different success, error, and follow-up flows.
- Move the register success redirect `useEffect` into the register hook with the rest of the register state machine.

## Module Shape

### `useAuthFormFields`

- Owns `form`
- Owns shared `handleChange`
- Accepts `initialForm`
- Accepts optional reset callback invoked on every field change

### `useLoginForm`

- Uses `useAuthFormFields`
- Owns login submit state
- Returns `form`, `handleChange`, `handleSubmit`, `errorMessage`, `isSubmitting`

### `useRegisterForm`

- Uses `useAuthFormFields`
- Owns register submit state
- Owns delayed redirect to login after success
- Returns `form`, `handleChange`, `handleSubmit`, `status`, `message`

## Why This Seam

- Shared change handling becomes a deep `module`: callers stop repeating field merge and reset behavior.
- Submit flows stay local to their own `module`, preserving locality and avoiding a shallow "one hook for everything" interface.
- Pages become thinner and easier to scan.

## Verification

- Add focused hook tests for shared field updates and submit flow behavior.
- Keep existing auth page tests green.
