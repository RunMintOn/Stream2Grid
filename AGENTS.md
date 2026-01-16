# WebCanvas - Agent Coding Guidelines

## Build Commands

```bash
npm run dev      # Development (Hot reload, outputs to dist/)
npm run build    # Production build (tsc + vite build + fix-build.cjs)
npm run lint     # ESLint check
npm run preview  # Preview build
```

**No test suite** - Project has no test framework.

## Tech Stack

React 19 + TypeScript 5.9 + Vite 7 + CRXJS + Dexie + Tailwind CSS 4 + @dnd-kit + JSZip

## Project Structure

```
src/
├── background/        # Chrome service worker (cross-origin requests)
├── content/           # Content scripts (drag detection on web pages)
└── sidepanel/         # React app
    ├── components/    # cards/, layout/, common/
    ├── services/      # db.ts (Dexie), exporter.ts (ZIP export)
    ├── App.tsx       # Main component (currently minimal)
    └── main.tsx      # React mount
```

## Code Style

- **TypeScript**: Strict mode, ESNext modules, `@/*` path alias. Prefer `unknown` over `any`. Use `@ts-ignore` sparingly (see exporter.ts)
- **Imports**: External → local → relative
- **UI**: Chinese text acceptable (`<button>创建</button>`)
- **Logs**: Always prefix with `[WebCanvas]`

### React Pattern

```typescript
// Props interface → default export → hooks
interface Props { id: number; onDelete: () => void }
export default function Component({ id, onDelete }: Props) {
  const [state, setState] = useState(null)
  const handleX = useCallback(() => { /* ... */ }, [dep])
  return <div>{state}</div>
}
```

### Dexie Database

```typescript
// Interface → Dexie class → Export singleton
interface Node {
  id?: number; projectId: number; type: 'text' | 'file' | 'link'
  order: number; fileData?: Blob  // ⚠️ NEVER index!
}
class WebCanvasDB extends Dexie {
  nodes!: EntityTable<Node, 'id'>
  constructor() {
    super('WebCanvasDB')
    this.version(1).stores({
      nodes: '++id, projectId, type, order',  // No fileData!
    })
  }
}
export const db = new WebCanvasDB()
```

### Hooks & Patterns
- `useCallback`/`useMemo` for performance
- `useLiveQuery` (dexie-react-hooks) for reactive DB queries
- Cleanup: `URL.revokeObjectURL()` in useEffect
- Optional fields: `?` with null checks

### Service Worker (Async Handler)

```typescript
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'downloadImage') {
    handleImageDownload(request.url, request.projectId)
      .then(sendResponse)
      .catch(e => sendResponse({ success: false, error: e.message }))
    return true // Keep channel open
  }
})
```

### Tailwind CSS 4
- Utilities only: `className="bg-white rounded-lg p-4"`
- No inline CSS, custom animations via `animate-pulse-blue`

## Architecture

**Stream-to-Grid**: Browser stores as 1D list (`order`), exports to 2D Obsidian grid via `(index % COLS, floor(index / COLS))`

**Database**: IndexedDB via Dexie. Never index Blob fields. Use transactions for multi-writes. Offline-only.

**Chrome Extension (V3)**: Side Panel API + content scripts (drag detection) + service worker (cross-origin fetch). Load unpacked from `dist/`.

## Export Pattern

Fetch → Transform → ZIP → Download. Normalize `\r\n` → `\n`. Use `URL.createObjectURL()`/`revokeObjectURL()`. Link nodes: `url` field only in Obsidian spec.

## Common Pitfalls

1. Never index Blobs in Dexie (crashes)
2. Always revoke Object URLs
3. Always return `true` for async service worker
4. Use type assertions: `const img = event.target as HTMLImageElement`
5. Prefix all logs with `[WebCanvas]`

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
**Issue**: Some sites (GitHub) block custom dataTransfer. **Fallback**: Cache in background via `setDragPayload`, retrieve via `getDragPayload`.
