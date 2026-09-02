# SteelSnap Frontend Standards

React Doctor score baseline: **84/100** (3 errors, 68 warnings).
Target: **95+/100** with zero errors.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (Vite plugin) |
| State | Zustand (domain stores) |
| Server state | TanStack Query v5 |
| Routing | React Router v7 |
| Components | Radix UI primitives + CVA variants |
| Icons | Lucide React |
| Toasts | Sonner |

---

## Project Structure

```
src/
  components/
    auth/          # Auth pages, AuthGuard
    detection/     # Detection workspace, modals, canvas
    layout/        # Root, App, Auth layouts, Header, Sidebar
    projects/      # Project listing and cards
    admin/         # Admin pages (lazy-loaded)
    ui/            # Reusable primitives (Button, Input, Dialog, etc.)
  config/          # API config, constants
  hooks/           # Custom React hooks
  lib/             # Utilities (cn)
  routes/          # React Router configuration
  services/        # API service modules
  store/           # Zustand stores
  types/           # TypeScript interfaces
```

### Naming Conventions

- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase` (function name), one component per file
- Hooks: `use-kebab-case.ts`, exported as `useCamelCase`
- Stores: `domain-store.ts`, exported as `useDomainStore`
- Types: `domain.ts` in `types/`, using `interface` (not `type` unless union/intersection)
- Services: `domain-service.ts` or `domain-api-service.ts`
- Constants: `UPPER_SNAKE_CASE`, centralized in `config/constants.ts`

---

## Zustand Standards

These rules are validated against the official Zustand documentation (pmndrs/zustand).

### Store Architecture

**One store per domain.** The codebase uses five domain stores:

| Store | Responsibility |
|---|---|
| `auth-store` | Token, user, login/register/logout/hydrate |
| `project-store` | Projects list, active project, CRUD |
| `session-store` | PDF session (url, page, drawing mode, labels) |
| `beam-store` | Beams/columns by page, selection, dirty tracking |
| `ui-store` | Backend status, modals, global error |

Do not merge unrelated concerns into a single store. Do not create micro-stores for single booleans -- group related UI state in `ui-store`.

### Store Definition Pattern

Separate the state interface from the action interface for readability. Always define an `initialState` constant for stores that need a reset action.

```typescript
// Good -- explicit interface with state and actions together
import { create } from 'zustand';

interface SessionState {
  // State
  pdfUrl: string | null;
  currentPage: number;

  // Actions
  setPdf: (url: string, pageCount: number) => void;
  clearPdf: () => void;
}

const initialState = {
  pdfUrl: null,
  currentPage: 1,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,

  setPdf: (url, pageCount) => set({ pdfUrl: url, currentPage: 1 }),
  clearPdf: () => set(initialState),
}));
```

### Selectors

**Always use atomic selectors.** Select only the fields you need. Never subscribe to the entire store.

```typescript
// Good -- component re-renders only when currentPage changes
const currentPage = useSessionStore((s) => s.currentPage);

// Bad -- re-renders on ANY store change
const state = useSessionStore();
```

When selecting multiple fields, use `useShallow` to prevent re-renders when the selected values are shallowly equal:

```typescript
import { useShallow } from 'zustand/react/shallow';

// Good -- re-renders only when bears OR food changes
const { bears, food } = useBearStore(
  useShallow((s) => ({ bears: s.bears, food: s.food })),
);

// Bad -- new object reference every render, always re-renders
const { bears, food } = useBearStore((s) => ({ bears: s.bears, food: s.food }));
```

### Actions

**Colocate actions in the store.** Do not define state-mutation logic in components. Components call store actions; stores own the logic.

```typescript
// Good -- action lives in the store
const toggleDrawingMode = useSessionStore((s) => s.toggleDrawingMode);

// Bad -- mutating store from component
const setDrawingMode = useSessionStore((s) => s.setDrawingMode);
const handleClick = () => setDrawingMode(!drawingMode); // logic in component
```

### Cross-Store Communication

Use `getState()` / `setState()` on the other store. Do not pass store A into store B's `create()`.

```typescript
// Good -- auth-store resets project-store on logout
logout: () => {
  localStorage.removeItem(TOKEN_KEY);
  useProjectStore.setState({ projects: [], activeProject: null });
  set({ token: null, user: null });
},
```

### Async Actions

Keep async actions inside the store. Handle loading/error states with `set()`. Use `get()` to read current state mid-action.

```typescript
fetchProjects: async (force = false) => {
  const { projects, isLoading } = get();
  if (!force && (isLoading || projects.length > 0)) return;

  set({ isLoading: true });
  try {
    const projects = await projectApi.listProjects();
    set({ projects, isLoading: false });
  } catch {
    set({ isLoading: false });
  }
},
```

### Immutable Updates

Use spread operators for shallow state. For deeply nested updates (like `beamsByPage`), iterate and produce new references. If nested update logic becomes painful, consider `immer` middleware:

```typescript
import { immer } from 'zustand/middleware/immer';

export const useBeamStore = create<BeamState>()(
  immer((set) => ({
    // Now you can mutate directly inside set()
    updateBeam: (id, updates) =>
      set((state) => {
        for (const beams of Object.values(state.beamsByPage)) {
          const beam = beams.find((b) => b.id === id);
          if (beam) Object.assign(beam, updates);
        }
      }),
  })),
);
```

### What NOT to Put in Zustand

| Data | Where it belongs |
|---|---|
| Server data (projects list, detection results) | TanStack Query cache via custom hooks |
| Form input state | Local `useState` or `useReducer` in the form component |
| Derived/computed values | Compute inline during render, not in a store |
| URL state (current route, query params) | React Router |
| Ephemeral UI (tooltip open, hover state) | Local `useState` |

Zustand is for **client-owned state** that multiple components share: auth session, active selections, drawing mode, PDF navigation.

### Testing Stores

Test stores by calling actions and asserting on `getState()` directly. No need to render components for pure store logic:

```typescript
import { useCounterStore } from '../stores/use-counter-store';

test('increment updates count', () => {
  const { increment } = useCounterStore.getState();
  increment();
  expect(useCounterStore.getState().count).toBe(1);
});
```

---

## React Patterns

### Data Fetching

Use TanStack Query for all server data. Never use raw `fetch()` inside `useEffect`.

```typescript
// Good
const { data, isLoading } = useQuery({
  queryKey: detectionKeys.job(jobId),
  queryFn: () => detectionService.getJob(jobId),
  refetchInterval: (query) =>
    query.state.data?.status === 'completed' ? false : POLL_INTERVAL,
});

// Bad -- no caching, no dedup, race conditions
useEffect(() => {
  fetch(`/api/jobs/${jobId}`).then(r => r.json()).then(setData);
}, [jobId]);
```

Use `apiFetch()` from `config/api.ts` for all authenticated requests. It auto-injects the Bearer token.

### State Reset on Prop Change

Use a `key` prop to reset component state. Do not reset state in `useEffect`.

```typescript
// Good -- React unmounts and remounts, state resets naturally
<DetectionWorkspace key={projectId} projectId={projectId} />

// Bad -- stale state flash, extra render cycle
useEffect(() => {
  setBeams([]);
  setPage(1);
}, [projectId]);
```

### Derived State

Compute inline during render. Do not sync props to state via `useEffect`.

```typescript
// Good
const filteredBeams = beams.filter((b) => b.page === currentPage);

// Bad
const [filteredBeams, setFilteredBeams] = useState([]);
useEffect(() => {
  setFilteredBeams(beams.filter((b) => b.page === currentPage));
}, [beams, currentPage]);
```

### useState Limits

If a component has 5+ `useState` calls with related state, consolidate with `useReducer`:

```typescript
// Good -- related state grouped
const [state, dispatch] = useReducer(reducer, {
  email: '',
  password: '',
  error: null,
  loading: false,
});

// Bad -- 5 independent useState for related form state
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState(null);
const [loading, setLoading] = useState(false);
const [submitted, setSubmitted] = useState(false);
```

### Lazy useState Initialization

When the initial value requires computation, wrap it in an arrow function:

```typescript
// Good -- runs once
const [length, setLength] = useState(() => value.toFixed(2));

// Bad -- toFixed() called every render
const [length, setLength] = useState(value.toFixed(2));
```

### Default Prop References

Extract constant default values to module scope to avoid new references each render:

```typescript
// Good
const EMPTY_BEAMS: Beam[] = [];

function BeamCanvas({ beams = EMPTY_BEAMS }: Props) { ... }

// Bad -- new [] every render, breaks memoization
function BeamCanvas({ beams = [] }: Props) { ... }
```

### Component Size

Keep components under 300 lines. Extract logical sections:

```
BeamCanvas (orchestrator)
  CanvasToolbar
  CanvasViewport
  BeamOverlay
  SelectionHandles
```

Large components (500+ lines) must be broken up. The current offenders: `beam-canvas.tsx`, `quantity-table.tsx`, `detection-workspace.tsx`.

### Event Handlers vs useEffect

If logic runs in response to a user action, put it in the event handler. Do not route user-triggered logic through `useEffect`.

```typescript
// Good
const handleSelectBeam = (id: string) => {
  select(id);
  scrollToBeam(id);
};

// Bad -- useEffect watching selectedId to scroll
useEffect(() => {
  if (selectedId) scrollToBeam(selectedId);
}, [selectedId]);
```

---

## Accessibility

### Labels

Every form input must have an associated label via `htmlFor` or wrapping:

```typescript
// Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Also good
<label>
  Email
  <input type="email" />
</label>
```

### Interactive Elements

Clickable non-interactive elements (`div`, `span`) must have:
1. A `role` attribute (`role="button"`, `role="tab"`, etc.)
2. A keyboard event listener (`onKeyDown`, `onKeyUp`)
3. `tabIndex={0}` for focusability

Prefer semantic HTML (`<button>`, `<a>`) over `div` with click handlers.

### Array Keys

Never use array index as `key` on lists that can be reordered, filtered, or modified:

```typescript
// Good
{beams.map((beam) => <BeamRow key={beam.id} beam={beam} />)}

// Bad -- breaks on reorder/filter
{beams.map((beam, idx) => <BeamRow key={idx} beam={beam} />)}
```

---

## Performance

### Passive Event Listeners

Add `{ passive: true }` to scroll and wheel listeners:

```typescript
element.addEventListener('wheel', handler, { passive: true });
```

### will-change

Never apply `will-change` permanently in CSS. Apply on interaction start, remove on end:

```typescript
onMouseEnter={() => el.style.willChange = 'transform'}
onAnimationEnd={() => el.style.willChange = 'auto'}
```

### Memoization

Use `React.memo` only when profiling shows unnecessary re-renders. Do not preemptively memo everything. When you do memo, ensure all props have stable references (use `useCallback` for functions, `useMemo` for objects/arrays passed as props).

---

## TypeScript

### Interfaces Over Types

Use `interface` for object shapes. Use `type` only for unions, intersections, and mapped types:

```typescript
// Good
interface Beam {
  id: string;
  label: string;
  length: number;
}

type UserRole = 'admin' | 'user';
type BeamUpdate = Partial<Beam>;

// Bad
type Beam = {
  id: string;
  label: string;
  length: number;
};
```

### Strict Mode

`tsconfig.json` enforces `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. Do not relax these.

### Path Aliases

Always use `@/` for imports from `src/`:

```typescript
import { useBeamStore } from '@/store/beam-store';
import type { Beam } from '@/types/beam';
```

### Type Files

One file per domain in `types/`. Export interfaces and union types. Do not define types inline in components or stores -- import from `types/`.

---

## Dead Code Policy

- Remove unused files. Current dead files: `use-project-summary.ts`, `detection-controls.tsx`, `upload-section.tsx`, `gradient-background.tsx`, `status-indicator.tsx`
- Remove unused exports. If an export has no importers, delete it.
- Remove unused types. If a type/interface has no references, delete it.
- Run `npx react-doctor . --verbose` to detect dead code after changes.

---

## Services Layer

### API Communication

All HTTP calls go through service modules in `services/`. Components never call `fetch()` directly.

```
Component -> Hook (TanStack Query) -> Service (apiFetch) -> Backend
```

### apiFetch

Use `apiFetch()` from `config/api.ts` for all authenticated endpoints. It auto-injects the Bearer token from localStorage.

### Error Handling

Services throw on non-OK responses with specific error messages. Hooks/components catch and display via Sonner toasts or store error state.

---

## Validation Checklist

Run before every PR:

```bash
# Type check
npx tsc --noEmit

# React Doctor scan (target: 0 errors, <20 warnings)
npx react-doctor . --verbose --diff
```

Errors must be zero. Warnings should trend down, never up.