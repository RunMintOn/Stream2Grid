import { useState, MouseEvent } from 'react'

interface LinkCardProps {
  id: number
  url: string
  title?: string
  sourceIcon?: string
  onDelete: () => void
}

export default function LinkCard({
  id: _id,
  url,
  title,
  sourceIcon,
  onDelete,
}: LinkCardProps) {
  const [iconError, setIconError] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('[Cascade] Failed to copy:', err)
    }
  }

  const handleDelete = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete()
  }

  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname.replace('www.', '')
    } catch {
      return urlStr
    }
  }

  const displayTitle = title || getDomain(url)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 group relative transition-all duration-300 hover:border-blue-200">
      {/* Quadrant Grid & Buttons */}
      <div className="absolute inset-0 z-40 pointer-events-none">
        {/* Top Left - Empty */}
        <div className="absolute top-0 left-0 w-[48%] h-[48%] pointer-events-auto group/tl" />

        {/* Top Right - Copy */}
        <div className="absolute top-0 right-0 w-[48%] h-[48%] pointer-events-auto group/tr">
          <button
            onClick={handleCopy}
            className={`
              absolute top-0 right-0 translate-x-1/4 -translate-y-1/4
              w-8 h-8 flex items-center justify-center rounded-full shadow-md
              transition-all duration-200 z-50
              opacity-0 group-hover/tr:opacity-100 hover:scale-110 active:scale-95
              bg-[#879a39] hover:bg-[#606e2c] text-[#fffcf0]
            `}
            title="复制链接"
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Bottom Left - Empty */}
        <div className="absolute bottom-0 left-0 w-[48%] h-[48%] pointer-events-auto group/bl" />

        {/* Bottom Right - Delete */}
        <div className="absolute bottom-0 right-0 w-[48%] h-[48%] pointer-events-auto group/br">
          <button
            onClick={handleDelete}
            className={`
              absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4
              w-7 h-7 flex items-center justify-center rounded-full shadow-md
              transition-all duration-200 z-50
              opacity-0 group-hover/br:opacity-100 hover:scale-110 active:scale-95
              bg-[#e05f65] hover:bg-[#af3029] text-[#fffcf0]
            `}
            title="删除卡片"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-start gap-3 m-4 p-2 hover:bg-slate-50 transition-colors cursor-pointer rounded-lg relative z-50 max-w-[80%] pointer-events-auto"
        >
          <div className="shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
            {sourceIcon && !iconError ? (
              <img
                src={sourceIcon}
                alt=""
                className="w-6 h-6 object-contain"
                onError={() => setIconError(true)}
              />
            ) : (
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-slate-800 truncate">
              {displayTitle}
            </h4>
            <p className="text-xs text-slate-400 truncate mt-1">
              {getDomain(url)}
            </p>
          </div>
        </a>
      </div>
    </div>
  )
}
