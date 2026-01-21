import { useState, useEffect, useCallback } from 'react'
import { db, VAULT_ROOT_NAME } from '../../services/db'
import { requestDirectoryHandle } from '../../services/fs'

export default function VaultAuth() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [vaultName, setVaultName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Load vault status on mount
  useEffect(() => {
    checkVaultStatus()
  }, [])

  const checkVaultStatus = async () => {
    try {
      const vaultProject = await db.projects.where('name').equals(VAULT_ROOT_NAME).first()
      if (vaultProject && vaultProject.fileHandle) {
        setVaultName(vaultProject.fileHandle.name)
        // Check if we still have permission (might need re-auth on restart)
        // Note: queryPermission might return 'prompt', which means we are "known" but need activation
        // For UI purposes, we show as "Connected" but might need a "Reconnect" click if we try to use it.
        // Here we just check if we have the handle.
        setIsAuthorized(true)
        
        // Optional: Proactively check permission state
        // const hasPerm = await verifyPermission(vaultProject.fileHandle, 'read')
        // setIsAuthorized(hasPerm) 
        // Actually, better to show "Connected" and handle permission errors lazily or show a status indicator.
      } else {
        setIsAuthorized(false)
      }
    } catch (err) {
      console.error('[Cascade] Failed to check vault status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthorize = useCallback(async () => {
    try {
      const handle = await requestDirectoryHandle()
      
      // Save to DB
      const existing = await db.projects.where('name').equals(VAULT_ROOT_NAME).first()
      if (existing) {
        await db.projects.update(existing.id!, {
          fileHandle: handle,
          updatedAt: Date.now()
        })
      } else {
        await db.projects.add({
          name: VAULT_ROOT_NAME,
          updatedAt: Date.now(),
          isInbox: false,
          projectType: 'markdown', // Special type or just markdown
          fileHandle: handle
        })
      }

      setVaultName(handle.name)
      setIsAuthorized(true)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[Cascade] Authorization failed:', err)
        alert('授权失败: ' + (err as Error).message)
      }
    }
  }, [])

  if (loading) return null

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-xl">🗄️</span>
          本地知识库
        </h3>
        {isAuthorized && (
          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
            已连接
          </span>
        )}
      </div>
      
      {isAuthorized ? (
        <div className="space-y-3">
          <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 truncate">
            📂 {vaultName}
          </div>
          <button
            onClick={handleAuthorize}
            className="w-full py-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded transition-colors border border-transparent hover:border-slate-200"
          >
            切换文件夹 / 重新授权
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            授权一个本地文件夹（如 Obsidian Vault），Cascade 将直接在其中读写 Markdown 文件。
          </p>
          <button
            onClick={handleAuthorize}
            className="w-full py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <span>🔐</span>
            授权本地文件夹
          </button>
        </div>
      )}
    </div>
  )
}
