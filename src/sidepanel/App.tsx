import { useState, useEffect, useCallback } from 'react'
import type { Project } from './services/db'
import ProjectList from './components/layout/ProjectList'
import CardStream from './components/layout/CardStream'
import LocalMDView from './components/local/LocalMDView'
import StickyHeader from './components/layout/StickyHeader'
import { db, ensureInboxExists, restoreNode } from './services/db'
import { exportToCanvas } from './services/exporter'
import DropZone from './components/common/DropZone'
import { useLiveQuery } from 'dexie-react-hooks'
import { UndoProvider } from './contexts/UndoContext'
import { useUndo } from './contexts/UndoContext'
import UndoToast from './components/common/UndoToast'

function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const { deletedNode, hideUndo } = useUndo()

  // Debug: Log when project changes
  useEffect(() => {
    console.log('[Cascade App] currentProject changed to:', currentProject?.id, 'name:', currentProject?.name)
  }, [currentProject])

  // 使用 useLiveQuery 响应式查询 Inbox
  const inbox = useLiveQuery(() =>
    db.projects.filter(p => p.isInbox === true).first()
  )

  // 确保 Inbox 存在（初始化时）
  useEffect(() => {
    ensureInboxExists().catch(err => {
      console.error('[Cascade] Failed to initialize Inbox:', err)
    })
  }, [])

  // 从响应式查询结果获取 inboxId
  const inboxId = inbox?.id || null

  useEffect(() => {
    console.log('[Cascade] App component mounted')
  }, [])

  // Handle Ctrl+Z (or Cmd+Z on Mac) for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && deletedNode) {
        e.preventDefault()
        e.stopPropagation()
        performUndo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [deletedNode])

  // Handle undo event from UndoToast button click
  useEffect(() => {
    const handleUndoEvent = () => {
      performUndo()
    }

    window.addEventListener('webcanvas-undo', handleUndoEvent)
    return () => window.removeEventListener('webcanvas-undo', handleUndoEvent)
  }, [deletedNode])

  // Perform undo operation
  const performUndo = useCallback(async () => {
    if (!deletedNode) return

    try {
      console.log('[Cascade] Performing undo:', deletedNode)

      // Remove 'id' field before restoring (it will be auto-generated)
      const { id, ...nodeToRestore } = deletedNode

      // Restore node to database
      await restoreNode(nodeToRestore)

      // Hide undo toast
      hideUndo()

      console.log('[Cascade] Undo successful')
    } catch (err) {
      console.error('[Cascade] Undo failed:', err)
      alert('撤回失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }, [deletedNode, hideUndo])

  // 监听数据库变化，如果 Inbox 有新增内容，显示 Toast
  // 注意：这里简单起见，我们在 DropZone 成功添加后触发一个全局事件或者回调
  // 但由于 DropZone 是深层组件，我们可以在这里监听 storage 或者 custom event
  // 为了简单，我们暂时不监听，而是把 DropZone 放在外层

  const handleDeleteNode = async (nodeId: number) => {
    await db.nodes.delete(nodeId)
  }

  const handleExport = async () => {
    if (!currentProject || !currentProject.id) return
    
    setIsExporting(true)
    try {
      await exportToCanvas(currentProject.id, currentProject.name)
    } catch (error) {
      console.error('[Cascade] Export failed:', error)
      alert('导出失败，请检查控制台。')
    } finally {
      setIsExporting(false)
    }
  }

  // Toast 提示组件
  const Toast = () => (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[200] transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
      <div className="bg-slate-800/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium border border-slate-700/50">
        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        已保存到收集箱
      </div>
    </div>
  )

  // 监听来自 DropZone 的成功事件
  const handleInboxSuccess = useCallback(() => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }, [])

  // 监听项目页面的成功事件
  const handleProjectSuccess = useCallback(() => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }, [])

  // 当不在项目中时（首页），我们使用 Inbox 的 ID 作为 DropZone 的 projectId
  // 这样就可以复用 DropZone 的逻辑！

  if (!currentProject) {
    return (
      <div className="relative h-full bg-slate-50 flex flex-col">
        <StickyHeader title="Cascade" />

        {/* Toast */}
        <Toast />

        {/*
            全局拖拽区域 (Inbox 模式)
            加载中 / 错误 / DropZone 三种状态
        */}
        {inbox === undefined ? (
          // 加载状态
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-2"></div>
              <p>初始化中...</p>
            </div>
          </div>
        ) : inboxId ? (
          <DropZone
            projectId={inboxId}
            isInboxMode={true}
            onSuccess={handleInboxSuccess}
          >
            <div className="flex-1 overflow-y-auto">
              <ProjectList onSelectProject={setCurrentProject} />
            </div>
          </DropZone>
        ) : (
          // 错误状态 - inbox 查询返回 null
          <div className="flex-1 flex items-center justify-center text-red-500 p-4">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="font-medium mb-1">收集箱初始化失败</p>
              <p className="text-sm text-slate-400">请刷新页面重试</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <StickyHeader
        title={currentProject.name}
        showBack
        showExport
        onBack={() => setCurrentProject(null)}
        onExport={handleExport}
      />

      {isExporting && (
        <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 overflow-hidden z-50">
          <div className="h-full bg-blue-500 animate-progress"></div>
        </div>
      )}

      <DropZone
        projectId={currentProject.id!}
        isInboxMode={false}
        onSuccess={handleProjectSuccess}
      >
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {currentProject.projectType === 'markdown' && currentProject.fileHandle && currentProject.fileHandle.kind === 'file' ? (
            <LocalMDView 
              fileHandle={currentProject.fileHandle as FileSystemFileHandle} 
              project={currentProject} 
            />
          ) : (
            <CardStream
              projectId={currentProject.id!}
              onDelete={handleDeleteNode}
            />
          )}
        </main>
      </DropZone>
    </div>
  )
}

// Wrap App with UndoProvider
function AppWithProvider() {
  return (
    <UndoProvider>
      <App />
      <UndoToast />
    </UndoProvider>
  )
}

export default AppWithProvider
