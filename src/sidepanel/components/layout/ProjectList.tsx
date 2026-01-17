import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Project } from '../../services/db'

interface ProjectListProps {
  onSelectProject: (project: Project) => void
}

export default function ProjectList({ onSelectProject }: ProjectListProps) {
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const projects = useLiveQuery(async () => {
    // 获取所有项目
    const allProjects = await db.projects.orderBy('updatedAt').reverse().toArray()

    // 分离 Inbox 和普通项目
    const inbox = allProjects.find(p => p.isInbox)
    const others = allProjects.filter(p => !p.isInbox)

    // Inbox 置顶
    return inbox ? [inbox, ...others] : others
  })

  // 获取每个项目的节点数量
  const nodeCounts = useLiveQuery(async () => {
    const counts: Record<number, number> = {}
    const nodes = await db.nodes.toArray()
    nodes.forEach(node => {
      if (node.projectId) {
        counts[node.projectId] = (counts[node.projectId] || 0) + 1
      }
    })
    return counts
  })

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) return

    try {
      const id = await db.projects.add({
        name: newProjectName.trim(),
        updatedAt: Date.now(),
      })

      setNewProjectName('')
      setIsCreating(false)

      onSelectProject({
        id: id as number,
        name: newProjectName.trim(),
        updatedAt: Date.now(),
      })
    } catch (e) {
      console.error('[WebCanvas] Failed to create project:', e)
    }
  }, [newProjectName, onSelectProject])

  const handleDeleteProject = useCallback(async (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation()
    if (confirm('确定要删除这个画板吗？所有卡片也会被删除。')) {
      await db.nodes.where('projectId').equals(projectId).delete()
      await db.projects.delete(projectId)
    }
  }, [])

  if (projects === undefined) {
    return (
      <div className="p-4 text-slate-500 text-center">
        加载中...
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Create Project Section */}
      {isCreating ? (
        <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="输入画板名称..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateProject()
              if (e.key === 'Escape') setIsCreating(false)
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreateProject}
              className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              创建
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-md hover:bg-slate-200"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full mb-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          + 新建画板
        </button>
      )}

      {/* Projects List */}
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onSelectProject(project)}
            className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
              project.isInbox 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-400' 
                : 'bg-white border-slate-200 hover:border-blue-400'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className={`font-semibold text-base mb-1 ${
                  project.isInbox ? 'text-green-800' : 'text-slate-800'
                }`}>
                  {project.name}
                  {project.isInbox && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      默认
                    </span>
                  )}
                  {/* Node count badge */}
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    project.isInbox
                      ? 'bg-green-200 text-green-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {nodeCounts && nodeCounts[project.id!] !== undefined
                      ? `${nodeCounts[project.id!]} 项`
                      : '0 项'
                    }
                  </span>
                </h3>
                <p className={`text-xs ${
                  project.isInbox ? 'text-green-600/70' : 'text-slate-400'
                }`}>
                  {new Date(project.updatedAt).toLocaleString()}
                </p>
              </div>
              
              {!project.isInbox && (
                <button
                  onClick={(e) => handleDeleteProject(e, project.id!)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                  title="删除画板"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            
            {project.isInbox && (
              <div className="absolute top-2 right-2 text-green-400/20 pointer-events-none">
                 <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {projects.length === 0 && !isCreating && (
        <div className="text-center text-slate-500 py-8">
          <p className="mb-2">还没有画板</p>
          <p className="text-sm">点击上方按钮创建第一个画板</p>
        </div>
      )}
    </div>
  )
}
