
# Fix: Race condition between MFA sync and edge function calls

## Problem
When the admin returns from Google OAuth, the security hook sets `isVerified = true` in local state before the database upsert completes. This causes the dashboard to render and fire edge function calls that check `mfa_verified` in the database -- which is still `false` at that moment, resulting in 403 errors.

## Timeline of the bug

```text
1. Google OAuth redirect -> /admin
2. useAdminSecurity detects "admin_mfa_pending" in sessionStorage
3. Sets isVerified = true in React state (IMMEDIATELY)
4. Starts upsert to database (ASYNC, not awaited before setting state)
5. AdminSecurityGate renders children (dashboard, user management)
6. Children call admin-users, admin-stats edge functions
7. Edge functions check DB -> mfa_verified is still false -> 403 error
8. Upsert finally completes -> DB now has mfa_verified = true (too late)
```

## Solution

Restructure `useAdminSecurity.ts` so that `isVerified` is only set to `true` AFTER the database upsert succeeds. The key change is moving the state update to happen after the `await` calls.

### Changes to `src/hooks/useAdminSecurity.ts`

In the `checkSecurityStatus` function, inside the `pendingMfa` block:

1. Move the `isVerified = true` assignment to AFTER the database upsert completes successfully
2. Add error handling: if the upsert AND fallback update both fail, do NOT mark as verified -- show the Google button again
3. Add a small delay after the DB write to ensure edge function replicas see the updated value

```typescript
// BEFORE (broken):
isVerified = true;  // Set immediately
await supabase.from("user_security").upsert(...); // DB update happens after

// AFTER (fixed):
const { error: upsertError } = await supabase.from("user_security").upsert(...);
if (upsertError) {
  const { error: updateError } = await supabase.from("user_security").update(...);
  if (updateError) {
    // Both failed - do NOT mark as verified
    sessionStorage.removeItem("admin_mfa_pending");
    // isVerified stays false, user sees Google button again
  } else {
    isVerified = true;
  }
} else {
  isVerified = true;
}
```

### No changes needed to edge functions

The edge function logic is correct -- it properly checks `mfa_verified` and `mfa_verified_at` in the database. The issue is purely a timing/ordering problem on the frontend.

## Technical details

- File modified: `src/hooks/useAdminSecurity.ts`
- Only the `checkSecurityStatus` function changes
- The `pendingMfa` code block (around lines 72-103) is restructured
- No database migrations needed
- No edge function changes needed
