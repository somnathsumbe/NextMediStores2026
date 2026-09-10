# MediStores – Next.js Frontend Migration

Modern frontend migration of the legacy Angular 9 MediStores application.

## Stack
- Next.js 14 App Router
- React 18 + TypeScript 5
- Semantic HTML5
- Bootstrap 5.3 + Bootstrap Icons
- Responsive desktop/tablet/mobile UI
- PWA manifest + service worker
- Accessibility-focused labels, landmarks, keyboard focus and reduced-motion support
- Existing Java + Oracle backend can be integrated through `src/lib/api-client.ts`

## Angular → Next.js route map
- `loginPage` → `/login`
- `forgetPassword` → `/forgot-password`
- `ragisterUser` → `/signup`
- `profile` → `/profile`
- `party` → `/parties`
- `products` → `/products`
- `purchase` → `/purchase-orders`
- `sales` → `/sales-orders`
- `transport` → `/masters/transport`
- `HSN` → `/masters/hsn`
- category → `/masters/category`
- brand → `/masters/brand`
- users → `/users`
- reports → `/reports`
- invoice → `/invoice`
- transactions → `/transactions`

## Run
```bash
npm install
npm run dev
```

## Production
```bash
npm run build
npm start
```

The root layout contains global concerns only. Authentication routes are under `(auth)` and the shared `AppShell` is provided by `(app)/layout.tsx`. The GitHub Pages demo protects routes client-side with localStorage; the server middleware and auth handlers are preserved under the server-only source tree for a future Node deployment.

The recommended production deployment is a Node-compatible Next.js host, with the future Java REST API deployed separately. GitHub Pages is supported for the frontend-only demo export.

Copy `.env.example` to `.env.local` for local API configuration. `.env.local` must not be committed.

## GitHub Pages demo

This repository also supports a frontend-only static demo at `/NextMediStores2026/`. The export uses localStorage demo authentication; it is not production security. Server auth handlers are kept under `src/server/api` for a future Node deployment and are not part of the static App Router build.

Enable **Settings > Pages > Source: GitHub Actions**. The workflow deploys `out/` to `https://somnathsumbe.github.io/NextMediStores2026/`.

> The current screens use local mock data so the UI can run independently. Replace `src/lib/mock-service.ts` calls with the Java REST API client when backend endpoints are connected.
