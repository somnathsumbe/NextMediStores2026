# Angular 9 → Next.js UI Migration

Source reviewed: `medistores-master.zip` (Angular 9) and the existing `medistores-nextjs-converted.zip` baseline.

## Legacy UI/components identified
- Administration: login, signup, forgot password, profile, bank details, sidebar, footer, auth guard/service.
- Masters: products, product add, party, order, transport, HSN, header.
- Angular routing: loginPage, profile, bankinfo, forgetPassword, ragisterUser, HSN, purchase, sales, party, products, transport.

## Converted frontend
- Next.js App Router + TypeScript.
- Bootstrap 5.3 and Bootstrap Icons.
- Reusable `AppShell`, `PageHeader`, `DataTable`, `Status`, and `MasterPage` components.
- Responsive sidebar/header/table/form layout for desktop, tablet and mobile.
- Semantic landmarks and accessible labels/focus handling.
- PWA manifest + service worker registration.
- Mock/localStorage data retained for UI-only development.
- `src/lib/api-client.ts` added for future Java REST API integration.

## Backend integration
The existing Java + Oracle backend is intentionally not rewritten. Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` and replace mock-service calls page-by-page with `apiClient()` calls as backend endpoints are confirmed.

## Important note
The original Angular application is a legacy Angular 9 application. This package is the frontend migration target; it does not attempt to reproduce Angular internals such as NgModules, RxJS services, Angular guards or pipes one-to-one. Their responsibilities are mapped to Next.js routing, React components/hooks and client-side utilities.
