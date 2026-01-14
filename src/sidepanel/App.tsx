import { useState, useCallback, useEffect } from 'react'
import ProjectList from './components/layout/ProjectList'
import CardStream from './components/layout/CardStream'
import StickyHeader from './components/layout/StickyHeader'
import Toast from './components/common/Toast'
import { db } from './services/db'
import { exportToCanvas } from './services/exporter'

export interface Project {
  id: number
  name: string
  updatedAt: number
}

type ViewState = 
  | { type: 'projects' }
  | { type: 'cards'; project: Project }

export default function App() {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    console.log('[WebCanvas] App component mounted')
    setMounted(true)
    
    // Test DB connection
    db.open().then(() => {
      console.log('[WebCanvas] Database connected')
    }).catch(err => {
      console.error('[WebCanvas] Database error:', err)
      setError(`Database Error: ${err.message}`)
    })
  }, [])

  const [view, setView] = useState<ViewState>({ type: 'projects' })
  const [deletedItem, setDeletedItem] = useState<{ id: number; data: any } | null>(null)

  const handleSelectProject = useCallback((project: Project) => {
    setView({ type: 'cards', project })
    setDeletedItem(null)
  }, [])

  const handleBack = useCallback(() => {
    setView({ type: 'projects' })
  }, [])

  const handleExport = useCallback(async () => {
    if (view.type !== 'cards') return
    await exportToCanvas(view.project.id, view.project.name)
  }, [view])

  const handleDelete = useCallback(async (nodeId: number) => {
    const node = await db.nodes.get(nodeId)
    if (node) {
      await db.nodes.delete(nodeId)
      setDeletedItem({ id: nodeId, data: node })
      setTimeout(() => setDeletedItem(null), 3000)
    }
  }, [])

  const handleUndo = useCallback(async () => {
    if (deletedItem) {
      await db.nodes.add(deletedItem.data)
      setDeletedItem(null)
    }
  }, [deletedItem])

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 h-screen">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
      </div>
    )
  }

  if (!mounted) {
    return <div className="p-4">Initializing...</div>
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900" style={{ minHeight: '100vh', minWidth: '300px' }}>
      <StickyHeader
        title={view.type === 'projects' ? 'WebCanvas' : view.project.name}
        showBack={view.type === 'cards'}
        showExport={view.type === 'cards'}
        onBack={handleBack}
        onExport={handleExport}
      />

      <main className="flex-1 overflow-y-auto relative">
        {view.type === 'projects' ? (
          <ProjectList onSelectProject={handleSelectProject} />
        ) : (
          <CardStream projectId={view.project.id} onDelete={handleDelete} />
        )}
      </main>

      {deletedItem && (
        <Toast
          message="已删除 1 个项目"
          onUndo={handleUndo}
          duration={3000}
        />
      )}
    </div>
  )
}
