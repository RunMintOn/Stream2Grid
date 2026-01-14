import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../services/db'
import type { Project } from '../../App'

interface ProjectListProps {
  onSelectProject: (project: Project) => void
}

export default function ProjectList({ onSelectProject }: ProjectListProps) {
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const projects = useLiveQuery(() =>
    db.projects.orderBy('updatedAt').reverse().toArray()
  )

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) return

    const id = await db.projects.add({
      name: newProjectName.trim(),
      updatedAt: Date.now(),
    })

    setNewProjectName('')
    setIsCreating(false)

    // Navigate to the new project
    onSelectProject({
      id: id as number,
      name: newProjectName.trim(),
      updatedAt: Date.now(),
    })
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
      {projects.length === 0 && !isCreating ? (
        <div className="text-center text-slate-500 py-8">
          <p className="mb-2">还没有画板</p>
          <p className="text-sm">点击上方按钮创建第一个画板</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project as Project)}
              className="group p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-800 truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteProject(e, project.id!)}
                  className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
