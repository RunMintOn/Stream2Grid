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
  const [iconError, setIconError] = useState(false)
  const [isShowingOriginal, setIsShowingOriginal] = useState(false)
  const [hasEdited, setHasEdited] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const isSavingRef = useRef(false)
  const lastSaveTimeRef = useRef(0)
  
  // Fetch node data to get hasEdited status
  useEffect(() => {
    db.nodes.get(id).then((nodeData) => {
      if (nodeData) {
        // Only update state if hasEdited changed
        if (nodeData.hasEdited !== hasEdited) {
          setHasEdited(!!nodeData.hasEdited)
        }
      }
    })
  }, [id, text, hasEdited]) // Add text and hasEdited to dependencies

  const lines = text.split('\n')
  const isLongText = lines.length > 4 || text.length > 300
  
  // Update local state when prop changes
  useEffect(() => {
    if (!isEditing) {
      if (contentRef.current) {
        contentRef.current.innerText = isShowingOriginal ? (originalText || text) : text
      }
    }
  }, [text, isEditing, isShowingOriginal, originalText])

  // Focus and setup contentEditable when entering edit mode
  useEffect(() => {
    if (isEditing && contentRef.current) {
      const el = contentRef.current
      el.focus()
      
      // 如果是通过双击进入，浏览器通常会自动处理光标位置
      // 但为了保险，如果没有选区，我们将光标放到最后
      const selection = window.getSelection()
      if (selection && selection.rangeCount === 0) {
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false) // false means end of range
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }, [isEditing])

  const handleEnterEdit = useCallback(() => {
    // 防止保存瞬间的布局抖动触发双击重新进入
    if (Date.now() - lastSaveTimeRef.current < 300) return
    
    // 如果在查看原文，先切换回编辑版
    if (isShowingOriginal) {
      setIsShowingOriginal(false)
      // 这里的副作用会在 useEffect 中处理内容更新
    }
    
    setIsEditing(true)
  }, [isShowingOriginal])
  
  const handleSave = useCallback(async () => {
    if (isSavingRef.current || !contentRef.current) return
    
    const currentContent = contentRef.current.innerText
    // 处理可能的尾部多余换行（某些浏览器 contentEditable 可能会在末尾加换行）
    const trimmed = currentContent.replace(/\n$/, '').trim() === '' ? '' : currentContent
    
    const currentText = text
    
    // 如果内容没变，直接关闭编辑
    if (trimmed === currentText) {
      setIsEditing(false)
      // 恢复显示内容（防止编辑时产生的临时换行等影响）
      if (contentRef.current) contentRef.current.innerText = currentText
      return
    }
    
    try {
      isSavingRef.current = true
      await updateTextNode(id, trimmed)
      lastSaveTimeRef.current = Date.now()
      setIsEditing(false)
    } catch (err) {
      console.error('[WebCanvas] Save failed:', err)     // 恢复原始内容
      if (contentRef.current) contentRef.current.innerText = text
    } finally {
      isSavingRef.current = false
    }
  }, [id, text])

  const handleInput = useCallback(() => {
    // 可以在这里做自动调整高度等操作（如果需要），但在 contentEditable div 中通常不需要
    // 我们不更新 React state 以避免 re-render 导致光标跳动
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      // 插入纯文本
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        selection.deleteFromDocument()
        selection.getRangeAt(0).insertNode(document.createTextNode(text))
        selection.collapseToEnd()
      } else {
        // Fallback
        document.execCommand('insertText', false, text)
      }
    }
  }, [])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // 如果相关联的焦点目标是“完成”按钮，则忽略 blur
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
        isEditing ? 'border-blue-400 animate-pulse-blue' : 'border-slate-200 hover:border-blue-200'
      }`}
    >
      {/* Version Toggle Icon & Sliding Label - Top Left Corner Vertex */}
      {hasEdited && !isEditing && (
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 z-20 group/version">
          <button
            onClick={() => setIsShowingOriginal(!isShowingOriginal)}
            className={`
              shrink-0 w-5 h-5 rounded-full 
              flex items-center justify-center 
              transition-all duration-500 ease-in-out
              shadow-md ring-2 ring-white
              ${isShowingOriginal 
                ? 'bg-blue-500 rotate-180 scale-110' 
                : 'bg-slate-300 hover:bg-slate-400 hover:scale-110'
              }
              active:scale-90
            `}
          >
            <div className={`
              rounded-full transition-all duration-500
              ${isShowingOriginal 
                ? 'w-2 h-2 border-2 border-white bg-transparent' 
                : 'w-1.5 h-1.5 bg-slate-600'
              }
            `} />
          </button>
          
          {/* Sliding Label - Only shows ORIGINAL when viewing original version */}
          <div className={`
            absolute left-full top-1/2 -translate-y-1/2 ml-1.5 overflow-hidden transition-all duration-500 ease-out flex items-center
            ${isShowingOriginal ? 'max-w-24 opacity-100' : 'max-w-0 opacity-0'}
          `}>
            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded shadow-sm border animate-in slide-in-from-left-2 duration-500 bg-blue-50 text-blue-500 border-blue-100">
              ORIGINAL
            </span>
          </div>
        </div>
      )}
      
      {/* Delete Button - Top Right Corner Vertex */}
      {!isEditing && (
        <button
          onClick={onDelete}
          className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full bg-white shadow-md ring-2 ring-white hover:scale-110 active:scale-90 z-20"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Content */}
      <div 
        ref={contentRef}
        contentEditable={isEditing}
        suppressContentEditableWarning={true}
        onDoubleClick={handleEnterEdit}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onPaste={handlePaste}
        className={`
          w-full max-w-full text-sm font-sans leading-relaxed whitespace-pre-wrap break-all 
          -mx-1 px-1 rounded-md transition-all duration-200 outline-none
          ${!isEditing && !expanded && isLongText ? 'line-clamp-4' : ''}
          ${!isEditing && (expanded || !isLongText) ? 'hover:bg-slate-50 cursor-text' : ''}
          ${!isEditing && isShowingOriginal ? 'text-slate-500 bg-slate-50/50 italic' : 'text-slate-700'}
          ${isEditing ? 'cursor-text' : ''}
        `}
        style={{
          lineHeight: '1.625',
          fontSize: '0.875rem',
          margin: '0 -0.25rem',
          padding: '0 0.25rem',
          minHeight: '1.625em'
        }}
      >
        {isShowingOriginal ? originalText : text}
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
