---
trigger: always
description: React 19 UI conventions for @stubrix/ui and @stubrix/db-ui — components, styling, routing
---

# UI Conventions

## Components
- Functional components with hooks only — no class components
- PascalCase filenames for components (`MockEditor.tsx`)
- camelCase filenames for hooks and utilities (`useProjects.ts`, `api.ts`)
- No default exports except for page components where idiomatic

## Styling
- **TailwindCSS only** — no inline styles, no CSS modules, no styled-components
- Use `clsx` + `tailwind-merge` for conditional classes:
  ```tsx
  import { clsx } from 'clsx';
  import { twMerge } from 'tailwind-merge';
  const cn = (...args) => twMerge(clsx(args));
  ```
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints

## Icons
- **Lucide React only** — `import { Icon } from 'lucide-react'`
- Never use emoji, Font Awesome, or other icon libraries

## Routing
- React Router 7 with `<BrowserRouter>`
- Project-scoped routes: `/projects/:projectId/{page}`
- Use `useParams()`, `useNavigate()`, `useSearchParams()`

## API Communication
- All API calls go through `src/lib/api.ts` — never raw `fetch` in components
- WebSocket via `src/lib/ws.ts` (Socket.IO client)
- Vite dev proxy handles `/api/*` and `/ws/*` → `localhost:9090`

## State
- Local state with `useState` / `useReducer`
- No global state library — use React Context if truly shared state is needed
- Server state via custom hooks with fetch + useEffect
