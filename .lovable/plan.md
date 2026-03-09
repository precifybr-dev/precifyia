

## Plan: Dr. Margem Alerts with Dismiss/Ignore System

### What exists
- `src/lib/dr-margem-engine.ts` — rule-based engine generating recommendations per recipe (loss, critical, tight, CMV high, healthy)
- `src/components/dashboard/DrMargemAdvisor.tsx` — dashboard widget showing top 3 recommendations (expand/collapse)
- No persistence of alert state (ignored/resolved) — all computed on-the-fly

### What to build

**1. Alert state persistence via localStorage**
- Key: `precify_dr_margem_ignored_{storeId}` storing `Record<string, { ignoredAt: string, productName: string, type: string, conditionHash: string }>`
- `conditionHash` = simple hash of `productName + type + priceRange` so if the product's price/cost changes significantly, the alert can resurface
- No database table needed — this is user-preference UX state

**2. Update `src/lib/dr-margem-engine.ts`**
- Add `id` field to `DrMargemRecommendation` (deterministic: `${productName}-${type}`)
- Add `details` object with `price`, `cmv`, `estimatedProfit`, `margin` for display
- Add `conditionHash` for ignore tracking
- Add helper `generateAlertId(rec)` and `generateConditionHash(rec)`
- Export new `filterIgnoredRecommendations(recs, ignoredMap)` function

**3. Rewrite `src/components/dashboard/DrMargemAdvisor.tsx`**
- Each recommendation card gets 3 action buttons (stacked on mobile):
  - "Testar solução" → navigates to MarginConsultant or recipe page
  - "Ver ficha técnica" → navigates to `/app/recipes`
  - "Ignorar" → adds to localStorage ignored map, removes from view with animation
- Show financial details in each card (price, CMV%, estimated profit)
- Filter out ignored alerts before rendering
- "Ver todas recomendações" button when `hasMore`
- Show ignored count with "Mostrar ignorados" toggle to review/restore
- Pass `maxVisible` as unlimited when "Ver todas" is clicked

**4. Update `src/pages/Dashboard.tsx`**
- No structural changes needed (DrMargemAdvisor already placed)

### Technical details

**Alert ID generation:**
```typescript
// Deterministic ID from product + type
const alertId = `${recipe.name.toLowerCase().replace(/\s+/g, '-')}-${type}`;
```

**Condition hash (for re-alerting after changes):**
```typescript
// Round price to nearest 1 to detect meaningful changes
const hash = `${recipe.name}-${type}-${Math.round(price)}-${Math.round(cost)}`;
```

**Ignore logic:**
- On ignore: store `{ alertId, conditionHash, ignoredAt }` in localStorage
- On next load: if conditionHash changed (price/cost changed), remove from ignored → alert resurfaces
- If conditionHash same → stay ignored

**Action buttons per card (mobile-first, stacked):**
- "Testar solução" (primary outline) → navigate to simulator
- "Ver ficha" (ghost) → navigate to recipes
- "Ignorar" (ghost, muted) → dismiss with confirmation-free click

### Files to change
- **Edit**: `src/lib/dr-margem-engine.ts` — add `id`, `details`, `conditionHash` fields
- **Edit**: `src/components/dashboard/DrMargemAdvisor.tsx` — full rewrite with ignore system and action buttons

