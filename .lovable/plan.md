

## Plan: Make "Testar solução" Pre-fill the Margin Simulator

### Problem
The "Testar solução" button just scrolls to the simulator but doesn't pre-fill it with the product's data. The user has to manually enter everything — defeating the purpose.

### Solution
Use a custom event to pass the product data from DrMargemAdvisor to MarginConsultant, pre-filling the form automatically.

### Changes

**1. `src/components/dashboard/DrMargemAdvisor.tsx`**
- Change the "Testar solução" onClick to dispatch a `CustomEvent` with the recommendation's financial data (product name, price, cost) before scrolling:
```typescript
window.dispatchEvent(new CustomEvent("dr-margem-test", { detail: { productName, price, cost } }));
```

**2. `src/components/dashboard/MarginConsultant.tsx`**
- In the `SimulatorForm` component, add a `useEffect` listening for `dr-margem-test` events
- When received, auto-fill `productName`, `sellingPrice`, and `productCost` fields from the event detail
- Set `autoFilled = true` to show the "preenchido automaticamente" hint
- This reuses the exact same pattern as `handleSelectRecipe` (line 175-183)

### Technical details
- No new dependencies or database changes
- The custom event approach avoids prop-drilling or context — both components are siblings on the Dashboard page
- The simulator form already supports external pre-filling via `handleSelectRecipe`, so the pattern is proven

