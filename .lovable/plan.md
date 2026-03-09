

## Plan: Fix Price Suggestions Showing Values Below Current Selling Price

### Problem

When "Testar solução" pre-fills the simulator with only `productCost` and `sellingPrice` (iFood fee, packaging, discount etc. all stay 0), the suggested prices are calculated using only the raw product cost. 

Example: Product cost R$15, selling price R$35. Suggested prices:
- Minimum (10%): `15 / 0.9` = R$16.90
- Recommended (15%): `15 / 0.85` = R$17.90
- Healthy (20%): `15 / 0.80` = R$18.90

All suggestions are **below the current selling price** (R$35), making the system look like it's telling the user to lower their price — nonsensical.

### Solution

Two fixes in `src/lib/margin-engine.ts`:

**1. Filter out suggestions below the current selling price**
In `calculate()`, after calling `getSuggestedPrices()`, filter out any suggestion where `price <= sellingPrice`. If all are filtered, don't show the section at all.

**2. Add a "current price is already healthy" fallback**
If all suggested prices are below the current selling price, the result should indicate the current price already exceeds minimum targets — no misleading suggestions shown.

### File to edit
- `src/lib/margin-engine.ts` — filter `priceSuggestions` to exclude prices ≤ current selling price after generation (around line 134)

