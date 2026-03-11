---
description: Expert guidance for developing React 19 components, pages, hooks and styling in @stubrix/ui and @stubrix/db-ui
---

# React Dashboard Development — @stubrix/ui & @stubrix/db-ui

## When to use
- Creating new dashboard pages or components
- Building forms, tables, modals for the UI
- Adding new routes with React Router 7
- Implementing real-time features with Socket.IO client
- Styling with TailwindCSS
- Working on the db-ui microfrontend

## Component Architecture

### Page Component
```tsx
// PascalCase filename: src/pages/FeaturePage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SomeIcon } from 'lucide-react';

export default function FeaturePage() {
  const { projectId } = useParams();
  // ...
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Feature</h1>
      {/* content */}
    </div>
  );
}
```

### Reusable Component
```tsx
// src/components/FeatureCard.tsx
interface FeatureCardProps {
  title: string;
  children: React.ReactNode;
}

export function FeatureCard({ title, children }: FeatureCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}
```

### Custom Hook
```tsx
// src/hooks/useFeature.ts
export function useFeature(projectId: string) {
  const [data, setData] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  // ...
  return { data, loading, refresh };
}
```

## Styling Rules
- **TailwindCSS only** — no inline styles, no CSS modules, no styled-components
- Use `clsx` + `tailwind-merge` for conditional classes
- Dark theme support via `dark:` prefix where applicable
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- Consistent spacing: use `space-y-*` and `gap-*` utilities

## Icons
- **Lucide React only** — import from `lucide-react`
- Use size prop for consistent sizing: `<Icon size={20} />`
- Common icons: `Database`, `Server`, `Play`, `Square`, `RefreshCw`, `Trash2`, `Plus`, `Settings`

## Routing
- React Router 7 with `<BrowserRouter>`
- Routes defined in `src/App.tsx` or `src/routes.tsx`
- Project-scoped routes: `/projects/:projectId/...`
- Use `useParams()`, `useNavigate()`, `useSearchParams()`

## API Communication
- API client in `src/lib/api.ts` — fetch wrapper with base URL
- WebSocket client in `src/lib/ws.ts` — Socket.IO client
- All API calls go through the client, never raw fetch in components
- Vite dev proxy: `/api/*` → `localhost:9090`, `/ws/*` → `localhost:9090`

## db-ui Microfrontend
- Self-contained React components in `packages/db-ui/`
- Exports pages, components, hooks via `src/index.ts`
- Consumed by `@stubrix/ui` as a workspace dependency
- Shares types from `@stubrix/shared`
- Has its own API client pointing to `/api/db/*` and `/api/projects/*/databases/*`

## State Management
- Local state with `useState` and `useReducer`
- No global state library — use React Context for shared state if needed
- Server state via custom hooks with fetch + useEffect

## MCP Tools to Use
- **Playwright MCP**: for E2E testing dashboard interactions
- **DeepWiki**: `ask_question("facebook/react", ...)` or `ask_question("vitejs/vite", ...)`
- **Memory MCP**: store UI/UX decisions
