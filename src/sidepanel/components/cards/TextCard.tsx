import { useState, useCallback, useRef, useEffect } from 'react'
import { db } from '../../services/db'

interface TextCardProps {
  id: number
  text: string
  sourceUrl?: string
  sourceIcon?: string
  onDelete: () => void
}

export default function TextCard({
  id,
  text,
  sourceUrl,
  sourceIcon,
  onDelete,
}: TextCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const lines = text.split('\n')
  const isLongText = lines.length > 4 || text.length > 300

  // Update local state when prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditText(text)
    }
  }, [text, isEditing])

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = '0px' // Reset height to get correct scrollHeight
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${scrollHeight}px`
    }
  }, [editText, isEditing])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(editText.length, editText.length)
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    const trimmed = editText.trim()
    if (trimmed !== text) {
      await db.nodes.update(id, { text: trimmed })
    }
    setIsEditing(false)
  }, [id, editText, text])

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
      {/* Delete Button */}
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
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            spellCheck={false}
            className="w-full text-sm font-sans text-slate-700 bg-transparent border-none focus:ring-0 p-0 resize-none overflow-hidden block shadow-none outline-none"
            style={{ 
              boxShadow: 'none', 
              outline: 'none',
              minHeight: '1em',
              lineHeight: '1.625', // 对应 Tailwind 的 leading-relaxed (1.625)
              fontSize: '0.875rem', // 对应 text-sm (14px)
              padding: '0',
              margin: '0',
              border: 'none'
            }}
          />
        ) : (
          <div
            onDoubleClick={() => (!isLongText || expanded) && setIsEditing(true)}
            className={`text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed transition-colors ${
              !expanded && isLongText ? 'line-clamp-4' : ''
            } ${expanded || !isLongText ? 'hover:bg-slate-50 cursor-text' : ''}`}
            style={{
              lineHeight: '1.625', // 强制对齐
              fontSize: '0.875rem' // 强制对齐
            }}
          >
            {text}
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
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  isEditing 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {isEditing ? '完成' : '编辑'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer with source */}
      {sourceUrl && !isEditing && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5 text-xs text-slate-400">
          {sourceIcon && (
            <img
              src={sourceIcon}
              alt=""
              className="w-4 h-4 rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
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
