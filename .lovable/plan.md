

## Fix: Add `mfa_verified_at` timestamp to verify-mfa-code edge function

### Problem
The `verify-mfa-code` edge function sets `mfa_verified = true` but does not set `mfa_verified_at`. The `useAdminSecurity` hook relies on `mfa_verified_at` to enforce the 30-minute session expiration for admin roles (`master`, `financeiro`). Without this timestamp, re-verified sessions may fail the database-side validity check, forcing repeated re-authentication or leaving sessions in an inconsistent state.

### Solution
Add `mfa_verified_at: new Date().toISOString()` to the update payload in `supabase/functions/verify-mfa-code/index.ts`.

### Technical details

**File:** `supabase/functions/verify-mfa-code/index.ts`

In the success branch (around line 89), the `.update()` call currently sets:
```text
mfa_verified: true,
last_mfa_code: null,
mfa_code_expires_at: null,
```

It will be updated to:
```text
mfa_verified: true,
mfa_verified_at: new Date().toISOString(),
last_mfa_code: null,
mfa_code_expires_at: null,
```

This is a one-line addition. No other files or database schema changes are needed -- the `mfa_verified_at` column already exists in `user_security` and is already consumed by `useAdminSecurity.ts`.

