# Cascade (WebCanvas) - Agent Coding Guidelines

## Build & Test Commands

```bash
npm run dev          # Start development server (HMR, outputs to dist/)
npm run build        # Production build (tsc + vite build + fix-build.cjs)
npm run lint         # Run ESLint (Currently requires flat config setup)
npm run preview      # Preview the production build
```

**Testing**: Currently **No test suite** exists. If adding tests (Vitest recommended):
- Run all tests: `npx vitest`
- Run single test: `npx vitest src/path/to/file.test.ts`
- Run by pattern: `npx vitest -t "component name"`

**Post-build**: `fix-build.cjs` is CRITICAL. It fixes relative asset paths in `dist/` and updates `manifest.json` side_panel path.

## Tech Stack
React 19 + TypeScript 5.9 + Vite 7 + CRXJS + Dexie (IndexedDB) + Tailwind CSS 4 + @dnd-kit

## Code Style & Conventions

### TypeScript & Naming
- **Strict Mode**: `strict: true` is mandatory. Avoid `any`, prefer `unknown`.
- **Naming**: 
  - Components: `PascalCase` (e.g., `TextCard.tsx`)
  - Services/Utils: `camelCase` (e.g., `db.ts`)
  - Hooks: `use*` (e.g., `useUndo.ts`)
  - Interfaces: `PascalCase`, props often named `ComponentNameProps`.
- **Imports**: External libraries -> Local services/utils -> Components -> Styles. Use `import type` for types.

### React Pattern
- **Functional Components**: Only use functional components with hooks.
- **Props**: Destructure in function signature. Use `interface` for props.
- **State**: `useState` for UI state; `Context API` for cross-component state (e.g., Undo); `Dexie` for persistence.
- **Hooks**: Use `useLiveQuery` for reactive DB data. Always cleanup in `useEffect` (e.g., `URL.revokeObjectURL`).

### Styling (Tailwind 4)
- **Utilities Only**: Use `className`. No inline styles except for dynamic values.
- **Custom Animations**: Defined in `index.css` (e.g., `animate-progress`, `animate-pulse-blue`).
- **Theme**: Primary: `blue-600`, Background: `slate-50`, Inbox/Success: `green-500`.

### Database (Dexie)
- **Indexing**: NEVER index `Blob` fields (like `fileData`) as it crashes IndexedDB.
- **Initialization**: `ensureInboxExists()` must be called on app mount.
- **Transactions**: Use `db.transaction('rw', ...)` for multi-write operations.

### Error Handling & Logging
- **Try-Catch**: Mandatory for all async operations and DB writes.
- **User Feedback**: Use `alert('操作失败: ' + msg)` for user-facing errors (Chinese text).
- **Logging**: Prefix logs with `[Cascade]` or `[CascadeDB]`.

## Domain-Specific Patterns

### Chrome Extension (V3)
- **Content Scripts**: Use **Capture Phase** for drag events: `addEventListener('dragstart', handler, true)`.
- **Service Worker**: Always `return true` in `chrome.runtime.onMessage` for async responses.
- **Payload Fallback**: If `dataTransfer` fails (blocked by site), use background cache via `setDragPayload`.

### UI UX Patterns
- **Quadrant Grid**: Card actions (Restore, Copy, Delete) are often hidden in quadrants, revealed on hover.
- **contentEditable**: 
  - Use `innerText` for plain text.
  - Check `e.relatedTarget` on `onBlur` to avoid race conditions with Save buttons.
  - Handle `onPaste` to ensure plain text only.
- **Language**: 
  - **UI**: Chinese text is preferred for labels/messages.
  - **Comments**: Chinese for business logic; English for technical notes.

### Export Architecture (Stream-to-Grid)
- Data is stored as a 1D list with an `order` field.
- Exported to Obsidian Canvas as a 2D grid using `(index % COLS)` and `Math.floor(index / COLS)`.

## Common Pitfalls
1. Circular dependencies between `db.ts` and components (use services as middleware).
2. Forgetting to `revokeObjectURL` after image export.
3. Not handling extension context invalidation (requires page reload).
