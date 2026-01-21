import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Project } from '../../services/db'
import VaultAuth from '../common/VaultAuth'

interface ProjectListProps {
  onSelectProject: (project: Project) => void
}

export default function ProjectList({ onSelectProject }: ProjectListProps) {
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createType, setCreateType] = useState<'canvas' | 'markdown'>('canvas')
  const [vaultAuthorized, setVaultAuthorized] = useState(false)

  // Check vault status
  const checkVault = async () => {
    const vault = await db.projects.where('name').equals('___VAULT_ROOT___').first()
    setVaultAuthorized(!!vault && !!vault.fileHandle)
  }

  // Check on mount and when creating
  useState(() => {
    checkVault()
  })

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
      let fileHandle: FileSystemHandle | undefined

      if (createType === 'markdown') {
        // Get Vault Root
        const vault = await db.projects.where('name').equals('___VAULT_ROOT___').first()
        if (!vault || !vault.fileHandle) {
          alert('请先授权本地文件夹')
          return
        }
        
        // Create file in Vault
        const rootHandle = vault.fileHandle as FileSystemDirectoryHandle
        // Check permission
        // Note: We assume permission is granted or will be prompted. 
        // In a real app we might need verifyPermission here.
        
        let finalName = newProjectName.trim()
        let filename = `${finalName}.md`
        
        // Check for naming collision
        try {
          // Try to get file without creating to check existence
          await rootHandle.getFileHandle(filename)
          // If successful, file exists. Find a unique name.
          let i = 1
          while (true) {
            finalName = `${newProjectName.trim()} (${i})`
            filename = `${finalName}.md`
            try {
              await rootHandle.getFileHandle(filename)
              i++
            } catch {
              // Not found, safe to use
              break
            }
          }
        } catch {
          // File doesn't exist, safe to use original name
        }

        // Create file handle
        const file = await rootHandle.getFileHandle(filename, { create: true })
        fileHandle = file
        
        // Update project name to match filename (without extension) if it changed
        if (finalName !== newProjectName.trim()) {
          // We'll use the new name for the project too
        }

        const id = await db.projects.add({
          name: finalName,
          updatedAt: Date.now(),
          projectType: createType,
          fileHandle: fileHandle as any // Cast to avoid type issues if DB type is strict
        })

        setNewProjectName('')
        setIsCreating(false)
        setCreateType('canvas') // Reset

        onSelectProject({
          id: id as number,
          name: finalName,
          updatedAt: Date.now(),
          projectType: createType,
          fileHandle: fileHandle as any
        })
        return // Exit function
      }

      const id = await db.projects.add({
        name: newProjectName.trim(),
        updatedAt: Date.now(),
        projectType: createType,
        fileHandle: fileHandle as any // Cast to avoid type issues if DB type is strict
      })

      setNewProjectName('')
      setIsCreating(false)
      setCreateType('canvas') // Reset

      onSelectProject({
        id: id as number,
        name: newProjectName.trim(),
        updatedAt: Date.now(),
        projectType: createType,
        fileHandle: fileHandle as any
      })
    } catch (e) {
      console.error('[WebCanvas] Failed to create project:', e)
      alert('创建失败: ' + (e as Error).message)
    }
  }, [newProjectName, createType, onSelectProject])

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
      {/* Vault Authorization */}
      <VaultAuth />

      {/* Create Project Section */}
      {isCreating ? (
        <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="输入画板名称..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateProject()
              if (e.key === 'Escape') setIsCreating(false)
            }}
          />
          
          {vaultAuthorized && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCreateType('canvas')}
                className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                  createType === 'canvas'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🎨 画布模式
              </button>
              <button
                onClick={() => setCreateType('markdown')}
                className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                  createType === 'markdown'
                    ? 'bg-purple-50 border-purple-200 text-purple-700 font-medium'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📝 Markdown
              </button>
            </div>
          )}

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
            {!project.isInbox && (
              <button
                onClick={(e) => handleDeleteProject(e, project.id!)}
                className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-8 h-8 flex items-center justify-center bg-[#e05f65] hover:bg-[#af3029] text-[#fffcf0] opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 z-30 rounded-full shadow-sm"
                title="删除画板"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-base mb-1 truncate ${
                  project.isInbox ? 'text-green-800' : 'text-slate-800'
                }`}>
                  {project.name}
                  {project.isInbox && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      默认
                    </span>
                  )}
                </h3>
                <p className={`text-[10px] ${
                  project.isInbox ? 'text-green-600/70' : 'text-slate-400'
                }`}>
                  {new Date(project.updatedAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-none ml-4">
                {project.isInbox && (
                  <div className="text-green-500/20 pointer-events-none">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                  project.isInbox
                    ? 'bg-green-200/50 text-green-800 border-green-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {nodeCounts && nodeCounts[project.id!] !== undefined
                    ? `${nodeCounts[project.id!]} 项`
                    : '0 项'
                  }
                </span>
              </div>
            </div>
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
