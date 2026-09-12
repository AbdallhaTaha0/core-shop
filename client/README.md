# Core Shop frontend

React, TypeScript, Vite, and Tailwind CSS storefront for the completed Core Shop API. The UI reads live catalog data and uses the backend's cookie session for cart, checkout, account, and admin requests.

```bash
# Start the API and PostgreSQL first (see the root README).
cd client
npm ci
npm run dev
```

Open `http://localhost:5173`. The backend's default `FRONTEND_ORIGIN` is this exact origin. Vite proxies `/api` to `http://127.0.0.1:3000`. Run `npm run build` for a TypeScript and production-build check, and `npm run format` to check Prettier formatting.

Code is organized by role: `src/lib` holds the typed API client, `src/app` the shared shop context, `src/hooks` request state, `src/components` reused UI, `src/pages` route screens, and `src/styles` the design system and responsive rules. Tailwind supplies reusable utilities and tokens; the component diagrams and page-specific layouts use focused CSS.
