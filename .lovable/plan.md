

## Plan: Implement "Dr. Margem" Advisor Character

### Overview
Create a recommendation engine persona called "Dr. Margem" that analyzes the user's recipe/pricing data and surfaces actionable recommendations. This is NOT a chatbot — it's a rule-based recommendation system (like Google Ads suggestions) wrapped in a consultive persona.

### Architecture

**1. New file: `src/lib/dr-margem-engine.ts`** — Recommendation engine
- Takes array of recipes (with costs, prices, margins) and generates prioritized recommendations
- Each recommendation: `{ advisor: "Dr. Margem", priority: "alta"|"media"|"baixa", title, message, actions[], type }`
- Rules based on existing margin bands from `margin-engine.ts`:
  - Loss (lucro < 0) → priority alta
  - Critical (margin < 5%) → priority alta  
  - Tight (5-12%) → priority media
  - CMV > 40% → priority media
  - iFood fee ≥ 25% → priority media
  - Healthy (≥ 20%) → priority baixa (opportunity)
- Price adjustment suggestions: "Se subir R$2, margem sobe de X% para Y%"
- Limit output to top 3 by priority, with flag for "has more"

**2. New component: `src/components/dashboard/DrMargemAdvisor.tsx`** — Dashboard widget
- Fetches user's recipes from Supabase (reusing existing pattern from MarginConsultant)
- Passes recipe data through the engine
- Shows card with Dr. Margem identity: avatar/icon, name, speech bubble style
- Collapsed: shows top recommendation + "Ver recomendações" button
- Expanded: shows up to 3 recommendations with actions
- "Ver todas" button if more exist
- Empty state when no recipes: "Cadastre seus produtos para receber recomendações"
- Mobile-first: stacked cards, large touch targets

**3. Integration in `src/pages/Dashboard.tsx`**
- Add DrMargemAdvisor below MarginConsultant (between Consultor de Margem and post-onboarding sections)

**4. Integration in `src/components/dashboard/MarginConsultant.tsx`**
- After simulation result, show a Dr. Margem recommendation bubble below the existing recommendation section
- Reuse the engine with the single simulated product

**5. Integration in `src/components/menu-mirror/MenuPerformanceDashboard.tsx`**
- Add a Dr. Margem section when menu items have risk diagnostics
- Reuse the engine filtered by items flagged as risky

### Visual Identity
- Icon: `Stethoscope` from lucide-react (medical/consultant metaphor)
- Name always shown: "Dr. Margem"
- Speech bubble styling: rounded card with left accent border in primary color
- Persona tone: direct, simple, consultive Portuguese

### Key Design Decisions
- Engine is pure functions (no side effects), easily testable
- Reuses `MARGIN_BANDS` from existing `margin-engine.ts`
- No database tables needed — recommendations are computed on-the-fly from existing recipe data
- No AI/LLM needed — purely rule-based heuristics
- Max 3 recommendations visible by default to avoid visual pollution

