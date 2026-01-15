import { useState, useCallback, useRef, useEffect } from 'react'
import { db, updateTextNode } from '../../services/db'

interface TextCardProps {
  id: number
  text: string
  originalText?: string
  sourceUrl?: string
  sourceIcon?: string
  onDelete: () => void
}

export default function TextCard({
  id,
  text,
  originalText,
  sourceUrl,
  sourceIcon,
  onDelete,
}: TextCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const [iconError, setIconError] = useState(false)
  const [isShowingOriginal, setIsShowingOriginal] = useState(false)
  const [hasEdited, setHasEdited] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isSavingRef = useRef(false)
  const lastSaveTimeRef = useRef(0)
  
  // Fetch node data to get hasEdited status
  useEffect(() => {
    console.log('[TextCard DEBUG] Fetching node data...', {
      id,
      text,
      originalText,
      hasEdited
    })
    
    db.nodes.get(id).then((nodeData) => {
      if (nodeData) {
        console.log('[TextCard DEBUG] DB data fetched:', {
          id: nodeData.id,
          hasEdited: nodeData.hasEdited,
          text: nodeData.text,
          originalText: nodeData.originalText,
          editedText: nodeData.editedText,
        })
        
        // Only update state if hasEdited changed
        if (nodeData.hasEdited !== hasEdited) {
          console.log('[TextCard DEBUG] Updating hasEdited state from', hasEdited, 'to', nodeData.hasEdited)
          setHasEdited(!!nodeData.hasEdited)
        } else {
          console.log('[TextCard DEBUG] hasEdits unchanged, skipping state update')
        }
      } else {
        console.error('[TextCard DEBUG] Node not found:', id)
      }
    })
  }, [id, text, hasEdited]) // Add text and hasEdited to dependencies

  const lines = text.split('\n')
  const isLongText = lines.length > 4 || text.length > 300

  // Update local state when prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditText(text)
    }
  }, [text, isEditing])

  // Auto-resize textarea is now handled by CSS grid technique
  // Removed the useEffect that caused layout jumps

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(editText.length, editText.length)
    }
  }, [isEditing])

  const handleEnterEdit = useCallback(() => {
    // 防止保存瞬间的布局抖动触发双击重新进入
    if (Date.now() - lastSaveTimeRef.current < 300) return
    // 如果在查看原文，先切换回编辑版
    if (isShowingOriginal) {
      setIsShowingOriginal(false)
    }
    setIsEditing(true)
  }, [isShowingOriginal])
  
  const handleSave = useCallback(async () => {
    if (isSavingRef.current) return
    
    const trimmed = editText.trim()
    const currentText = text  // Use prop 'text' for comparison
    
    // 如果内容没变（包括查看原文时的回退），直接关闭编辑
    if (trimmed === currentText) {
      setIsEditing(false)
      return
    }
    
    try {
      isSavingRef.current = true
      await updateTextNode(id, trimmed)
      lastSaveTimeRef.current = Date.now()
      setIsEditing(false)
    } catch (err) {
      console.error('[WebCanvas] Save failed:', err)
    } finally {
      isSavingRef.current = false
    }
  }, [id, editText, text])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // 如果相关联的焦点目标是“完成”按钮，则忽略 blur
    // 因为按钮的 onClick 会处理保存逻辑，避免重复触发
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest('[data-action="save-text"]')) {
      return
    }
    handleSave()
  }, [handleSave])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-4 group relative transition-all duration-300 ${
        isEditing ? 'border-blue-400 animate-pulse-blue ring-1 ring-blue-100' : 'border-slate-200'
      }`}
    >
      {/* Version Toggle Icon - Top Left Corner */}
      {(() => {
        const shouldShow = hasEdited && !isEditing
        console.log('[TextCard DEBUG] Icon render check:', { hasEdited, isEditing, shouldShow, originalText })
        return shouldShow
      })() && (
        <button
          onClick={() => setIsShowingOriginal(!isShowingOriginal)}
          className={`
            absolute top-2 left-2 w-6 h-6 rounded-full 
            flex items-center justify-center 
            transition-all duration-200
            z-10
            ${isShowingOriginal 
              ? 'bg-blue-500 hover:bg-blue-600 text-white scale-105' 
              : 'bg-slate-100 ring-1 ring-slate-300 text-slate-400 hover:bg-slate-200'
            }
          `}
          title={isShowingOriginal ? "查看编辑版" : "查看原始版"}
        >
          {isShowingOriginal ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
          )}
        </button>
      )}
      
      {/* Delete Button - Top Right Corner */}
      {!isEditing && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-slate-100 z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Content */}
      <div className="relative">
        {isEditing ? (
          <div className="grid">
            {/* Ghost element for auto-sizing */}
            <div
              className="invisible whitespace-pre-wrap break-words text-sm font-sans leading-relaxed pointer-events-none"
              style={{ 
                gridArea: '1 / 1 / 2 / 2',
                padding: '0',
                margin: '0',
                minHeight: '1.625em'
              }}
            >
              {editText + (editText.endsWith('\n') ? ' ' : '')}
            </div>
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              spellCheck={false}
              className="w-full text-sm font-sans text-slate-700 bg-transparent border-none focus:ring-0 p-0 resize-none overflow-hidden block shadow-none outline-none"
              style={{ 
                gridArea: '1 / 1 / 2 / 2',
                boxShadow: 'none', 
                outline: 'none',
                minHeight: '1.625em',
                lineHeight: '1.625',
                fontSize: '0.875rem',
                padding: '0',
                margin: '0',
                border: 'none'
              }}
            />
          </div>
        ) : (
          <div
            onDoubleClick={handleEnterEdit}
            className={`text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed transition-colors ${
              !expanded && isLongText ? 'line-clamp-4' : ''
            } ${expanded || !isLongText ? 'hover:bg-slate-50 cursor-text' : ''}`}
            style={{
              lineHeight: '1.625', // 强制对齐
              fontSize: '0.875rem' // 强制对齐
            }}
          >
            {isShowingOriginal ? (
              <span className="text-slate-500 italic">原文：{originalText}</span>
            ) : (
              <span>{text}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between mt-2 min-h-[24px]">
        <div>
          {isLongText && !isEditing && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
            >
              {expanded ? '收起' : '展开全部'}
            </button>
          )}
        </div>

        <div className="relative group/tooltip">
          {(!isLongText || expanded || isEditing) && (
            <>
              {!isEditing && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block z-20">
                  <div className="bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap animate-in fade-in zoom-in duration-200">
                    双击也可以进入编辑
                    <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              )}
              {isEditing ? (
                <button
                  key="save-btn"
                  data-action="save-text"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSave}
                  className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  完成
                </button>
              ) : isShowingOriginal ? (
                <button
                  disabled
                  className="text-xs px-2 py-1 rounded text-slate-300 cursor-not-allowed bg-slate-50"
                  title="无法编辑原始版本"
                >
                  编辑
                </button>
              ) : (
                <button
                  key="edit-btn"
                  onClick={handleEnterEdit}
                  className="text-xs px-2 py-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  编辑
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer with source */}
      {sourceUrl && !isEditing && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5 text-xs text-slate-400">
          {sourceIcon && !iconError && (
            <img
              src={sourceIcon}
              alt=""
              className="w-4 h-4 rounded-sm object-contain"
              onError={() => setIconError(true)}
            />
          )}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 truncate max-w-[180px]"
          >
            {getDomain(sourceUrl)}
          </a>
        </div>
      )}
    </div>
  )
}
