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
  const cursorOffsetRef = useRef<number | null>(null)
  
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
      setEditText(text)
    }
  }, [text, isEditing])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true })
      
      const len = editText.length
      // 如果是通过双击进入，尝试根据点击位置定位光标
      // 否则（如通过按钮）默认定位到末尾
      const pos = cursorOffsetRef.current !== null ? cursorOffsetRef.current : len
      textareaRef.current.setSelectionRange(pos, pos)
      
      // 重置，确保下次如果是按钮进入，默认还是末尾
      cursorOffsetRef.current = null
    }
  }, [isEditing])

  const handleEnterEdit = useCallback((e?: React.MouseEvent) => {
    // 防止保存瞬间的布局抖动触发双击重新进入
    if (Date.now() - lastSaveTimeRef.current < 300) return
    
    // 获取精确的光标位置
    if (e && e.type === 'dblclick') {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY)
      if (range && range.startContainer) {
        // 如果点击的是文本节点，直接取 offset
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          cursorOffsetRef.current = range.startOffset
        } else {
          // 如果点击的是容器（比如行尾或空白处），尝试找到最近的文本位置
          cursorOffsetRef.current = editText.length
        }
      }
    } else {
      cursorOffsetRef.current = null
    }

    // 如果在查看原文，先切换回编辑版
    if (isShowingOriginal) {
      setIsShowingOriginal(false)
    }
    setIsEditing(true)
  }, [isShowingOriginal, editText.length])
  
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
      <div className="relative">
        {isEditing ? (
          <div className="grid w-full max-w-full">
            {/* Ghost element for auto-sizing */}
            <div
              className="invisible whitespace-pre-wrap break-all text-sm font-sans leading-relaxed pointer-events-none -mx-1 px-1"
              style={{ 
                gridArea: '1 / 1 / 2 / 2',
                margin: '0 -0.25rem', // Match -mx-1
                padding: '0 0.25rem', // Match px-1
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
              className="w-full text-sm font-sans text-slate-700 bg-transparent border-none focus:ring-0 resize-none overflow-hidden block shadow-none outline-none break-all"
              style={{ 
                gridArea: '1 / 1 / 2 / 2',
                boxShadow: 'none', 
                outline: 'none',
                minHeight: '1.625em',
                lineHeight: '1.625',
                fontSize: '0.875rem',
                margin: '0 -0.25rem', // Match -mx-1
                padding: '0 0.25rem', // Match px-1
                border: 'none'
              }}
            />
          </div>
        ) : (
          <div
            onDoubleClick={handleEnterEdit}
            className={`text-sm whitespace-pre-wrap break-all max-w-full leading-relaxed transition-all duration-300 rounded-md -mx-1 px-1 ${
              !expanded && isLongText ? 'line-clamp-4' : ''
            } ${expanded || !isLongText ? 'hover:bg-slate-50 cursor-text' : ''} ${
              isShowingOriginal ? 'text-slate-500 bg-slate-50/50 italic' : 'text-slate-700'
            }`}
            style={{
              lineHeight: '1.625',
              fontSize: '0.875rem'
            }}
          >
            {isShowingOriginal ? originalText : text}
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
