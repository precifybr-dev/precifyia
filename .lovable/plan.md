

## Analysis

There is **no CSP meta tag or header** currently configured in this project. The project is a Vite SPA served from Lovable's preview/published infrastructure. The CSP restrictions you're seeing likely come from Lovable's hosting headers, not from your code.

However, there's a more immediate issue: the GA4 measurement ID is still the placeholder `G-XXXXXXXXXX` in both `index.html` and `src/hooks/useGoogleAnalytics.ts`. This means GA isn't actually tracking anything regardless of CSP.

## Plan

### 1. Add CSP meta tag to `index.html`

Add a `<meta http-equiv="Content-Security-Policy">` tag in the `<head>` section with the following policy:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.googletagservices.com https://www.gstatic.com https://www.google.com https://cdn.tailwindcss.com;
connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://stats.g.doubleclick.net https://*.supabase.co https://*.supabase.in wss://*.supabase.co;
img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com;
frame-src 'self' https://www.googletagmanager.com https://www.google.com https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com;
font-src 'self' https://fonts.gstatic.com;
default-src 'self';
```

Notes:
- `'unsafe-inline'` and `'unsafe-eval'` are needed because Vite dev mode injects inline scripts, and the GTM snippet itself is inline.
- Supabase domains are included in `connect-src` so the backend integration continues working.
- Cloudflare Turnstile (`challenges.cloudflare.com`) is included in `frame-src` since the project uses `react-turnstile`.

### 2. Replace placeholder GA ID

You'll need to provide your real `G-XXXXXXXXXX` measurement ID. Without it, even with CSP fixed, GA won't track anything. The ID needs updating in two places:
- `index.html` (lines 8 and 13)
- `src/hooks/useGoogleAnalytics.ts` (line 4)

