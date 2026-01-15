import { useState, useEffect } from 'react'
import type { Project } from './services/db'
import ProjectList from './components/layout/ProjectList'
import CardStream from './components/layout/CardStream'
import StickyHeader from './components/layout/StickyHeader'
import { db } from './services/db'
import { exportToCanvas } from './services/exporter'

export default function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    console.log('[WebCanvas] App component mounted')
  }, [])

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

  if (!currentProject) {
    return (
      <>
        <StickyHeader title="我的画板" />
        <ProjectList onSelectProject={setCurrentProject} />
      </>
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

      <main className="flex-1 overflow-y-auto">
        <CardStream 
          projectId={currentProject.id!} 
          onDelete={handleDeleteNode}
        />
      </main>
    </div>
  )
}
