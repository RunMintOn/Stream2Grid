import { useState } from 'react'

interface TextCardProps {
  id: number
  text: string
  sourceUrl?: string
  sourceIcon?: string
  onDelete: () => void
}

export default function TextCard({
  id: _id,
  text,
  sourceUrl,
  sourceIcon,
  onDelete,
}: TextCardProps) {
  const [expanded, setExpanded] = useState(false)

  const lines = text.split('\n')
  const isLongText = lines.length > 4 || text.length > 300

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 group relative">
      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-slate-100"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div
        className={`text-sm text-slate-700 whitespace-pre-wrap break-words ${
          !expanded && isLongText ? 'line-clamp-4' : ''
        }`}
      >
        {text}
      </div>

      {/* Expand/Collapse Button */}
      {isLongText && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 hover:text-blue-700 text-xs mt-2"
        >
          {expanded ? '收起' : '展开全部'}
        </button>
      )}

      {/* Footer with source */}
      {sourceUrl && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5 text-xs text-slate-400">
          {sourceIcon && (
            <img
              src={sourceIcon}
              alt=""
              className="w-4 h-4"
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
