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

> The current screens use local mock data so the UI can run independently. Replace `src/lib/mock-service.ts` calls with the Java REST API client when backend endpoints are connected.
