import { useState, useEffect, useCallback } from 'react'
import type { Project } from './services/db'
import ProjectList from './components/layout/ProjectList'
import CardStream from './components/layout/CardStream'
import StickyHeader from './components/layout/StickyHeader'
import { db, ensureInboxExists } from './services/db'
import { exportToCanvas } from './services/exporter'
import DropZone from './components/common/DropZone'

export default function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [inboxId, setInboxId] = useState<number | null>(null)
  const [showToast, setShowToast] = useState(false)

  // 获取 Inbox ID
  useEffect(() => {
    const fetchInboxId = async () => {
      try {
        await ensureInboxExists()
        
        const inbox = await db.projects.where('isInbox').equals(1).first()
        if (inbox && inbox.id) {
          setInboxId(inbox.id)
        }
      } catch (err) {
        console.error('[WebCanvas] Failed to initialize Inbox:', err)
      }
    }
    fetchInboxId()
  }, [])

  useEffect(() => {
    console.log('[WebCanvas] App component mounted')
  }, [])

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
      console.error('[WebCanvas] Export failed:', error)
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

  // 当不在项目中时（首页），我们使用 Inbox 的 ID 作为 DropZone 的 projectId
  // 这样就可以复用 DropZone 的逻辑！

  if (!currentProject) {
    return (
      <div className="relative h-screen bg-slate-50 flex flex-col">
        <StickyHeader title="我的画板" />
        
        {/* Toast */}
        <Toast />

        {/* 
            全局拖拽区域 (Inbox 模式) 
            只有当 inboxId 存在时才启用 DropZone
        */}
        {inboxId ? (
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
          <ProjectList onSelectProject={setCurrentProject} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
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

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <CardStream 
          projectId={currentProject.id!} 
          onDelete={handleDeleteNode}
        />
      </main>
    </div>
  )
}
