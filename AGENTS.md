# WebCanvas - Agent Coding Guidelines

## Build Commands

```bash
npm run dev      # Development (Hot reload, outputs to dist/)
npm run build    # Production build (tsc + vite build + fix-build.cjs)
npm run lint     # ESLint check
npm run preview  # Preview build
```

**No test suite**. Post-build: `fix-build.cjs` fixes asset paths (`../assets/` → `./assets/`) and manifest side_panel path.
**ESLint**: Flat config required (not yet configured). Currently `npm run lint` will fail.

## Tech Stack

React 19 + TypeScript 5.9 + Vite 7 + CRXJS + Dexie + Tailwind CSS 4 + @dnd-kit + JSZip

**TypeScript**: Strict mode enabled. `@/*` path alias → `src/*`. Additional flags: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. Prefer `unknown` over `any`. `@ts-ignore` only in exporter.ts for PromiseExtended.

## Code Style

- **Imports**: External → local → relative. Use `import type { }` for type-only imports
- **UI**: Chinese text acceptable (`<button>创建</button>`)
- **Logs**: Prefix with `[WebCanvas]` or `[WebCanvasDB]`
- **Comments**: Chinese for business logic

### File Organization
```
src/
├── sidepanel/
│   ├── components/     # React components (cards, common, layout)
│   ├── contexts/      # React Context providers
│   ├── services/      # Database, export, business logic
│   └── App.tsx       # Main app component
├── content/          # Content scripts injected into web pages
└── background/       # Service worker
```

### React Pattern

```typescript
interface Props { id: number; onDelete: () => void }
export default function Component({ id, onDelete }: Props) {
  const [state, setState] = useState(null)
  const handleX = useCallback(() => { /* ... */ }, [dep])

  useEffect(() => {
    // Setup
    return () => { /* Cleanup */ }
  }, [dep])

  return <div>{state}</div>
}
```

**Structure**: Functional only, `interface` Props, default exports, destructure props, `key` for lists.
**Naming**: Components PascalCase, services camelCase, hooks `use*`, interfaces PascalCase (optionally `Props`).

### contentEditable Pattern

```typescript
// Ignore blur if clicking save button
onBlur={(e) => {
  if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest('[data-action="save"]')) return
  handleSave()
}}
// Paste plain text only
onPaste={(e) => { e.preventDefault(); const text = e.clipboardData.getData('text/plain'); ... }}
```

### Dexie Database

```typescript
interface CanvasNode {
  id?: number; projectId: number; type: 'text' | 'file' | 'link'
  order: number; fileData?: Blob  // ⚠️ NEVER index!
  createdAt: number
}
class WebCanvasDB extends Dexie {
  nodes!: EntityTable<CanvasNode, 'id'>
  constructor() {
    super('WebCanvasDB')
    this.version(2).stores({
      nodes: '++id, projectId, type, order, createdAt',  // No fileData!
    })
  }
}
```

### State Management & Hooks
- Local state: `useState`, Global: Context API (e.g., UndoContext)
- Persistent storage: IndexedDB via Dexie (offline-only)
- Reactive queries: `useLiveQuery` from dexie-react-hooks
- Performance: `useCallback`/`useMemo`, cleanup `URL.revokeObjectURL()`, refs `contentRef.current`

### Error Handling

```typescript
try {
  await operation()
} catch (err) {
  console.error('[WebCanvas] Operation failed:', err)
  alert('操作失败: ' + (err instanceof Error ? err.message : '未知错误'))
}
```

Always use try-catch for async operations. Log with `[WebCanvas]` prefix. Show user-friendly Chinese alerts.

### Service Worker

```typescript
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'downloadImage') {
    handleImageDownload(request.url, request.projectId)
      .then(sendResponse)
      .catch(e => sendResponse({ success: false, error: e.message }))
    return true // Keep channel open for async
  }
})
```

### Tailwind CSS 4
- Utilities only: `className="bg-white rounded-lg p-4"`. No inline CSS.
- Custom animations in index.css: `animate-progress`, `animate-neon-breathe`, `animate-pulse-blue`
- Palette: `slate-50` (bg), `blue-600` (primary), `green-500` (inbox)

### Chrome Extension Patterns

**Content Script**: Capture phase `addEventListener('dragstart', handler, true)`. Fallback via background cache. Graceful degradation on context invalidate.
**Service Worker**: `return true` for async handlers. CORS fetch for cross-origin images. Cache drag payloads 5s.
**Manifest (V3)**: Permissions: `sidePanel`, `storage`, `activeTab`. Host: `https://*/*`, `http://*/*`

## Architecture

**Stream-to-Grid**: Browser stores as 1D list (`order`), exports to 2D Obsidian grid via `(index % COLS, floor(index / COLS))`.
**Database**: IndexedDB via Dexie. Never index Blob fields. Transactions for multi-writes. Offline-only.
**Chrome Extension V3**: Side Panel + content scripts (drag detection) + service worker (cross-origin fetch). Load unpacked from `dist/`.
**Inbox**: Default project with `isInbox: true`, created via `ensureInboxExists()`.
**Drag-Drop**: Content script captures → injects `application/webcanvas-payload` → background caches → DropZone processes. Use capture phase!
**Export**: Fetch → Transform → ZIP → Download. Normalize `\r\n` → `\n`. Revoke Object URLs. Link nodes: `url` field only.

## Common Pitfalls

1. Never index Blobs in Dexie (crashes)
2. Always revoke Object URLs
3. Always return `true` for async service worker
4. Type assertions: `const img = event.target as HTMLImageElement`
5. Prefix logs with `[WebCanvas]`
6. Inbox cannot be deleted (check `isInbox` flag)
7. Avoid circular dependencies (use dynamic imports)

## ⚠️ Critical Gotchas

### UI Renders Empty (No Errors)
**Cause**: Missing `@tailwindcss/vite` in vite.config.ts. **Fix**: Ensure `tailwindcss()` is first plugin:

```typescript
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [tailwindcss(), react(), crx({ manifest })],
})
```

### Content Script DataTransfer Fails
**Issue**: Some sites (GitHub) block custom dataTransfer. **Fallback**: Cache in background via `setDragPayload`, retrieve via `getDragPayload`. Expire after 5 seconds.

### contentEditable Blur Race
**Issue**: Clicking save button triggers blur → save. **Fix**: Check `e.relatedTarget` in blur handler (see pattern above).
