import { useState, useEffect } from 'react'

interface ImageCardProps {
  id: number
  fileData?: Blob
  fileName: string
  sourceUrl?: string
  onDelete: () => void
}

export default function ImageCard({
  id: _id,
  fileData,
  fileName,
  sourceUrl,
  onDelete,
}: ImageCardProps) {
  const [objectUrl, setObjectUrl] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (sourceUrl) {
      try {
        await navigator.clipboard.writeText(sourceUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } catch (err) {
        console.error('[Cascade] Copy failed:', err)
      }
    }
  }

  useEffect(() => {
    if (!fileData) {
      setLoading(false)
      setError(true)
      return
    }

    const url = URL.createObjectURL(fileData)
    setObjectUrl(url)

    return () => {
      URL.revokeObjectURL(url)  // Prevent memory leak
    }
  }, [fileData])

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden group relative">
      <div className="absolute inset-0 z-40 pointer-events-none">
        <div className="absolute top-0 left-0 w-[42%] h-[42%] pointer-events-auto group/tl" />

        <div className="absolute top-0 right-0 w-[42%] h-[42%] pointer-events-auto group/tr relative">
          {sourceUrl && (
            <button
              onClick={handleCopy}
              className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 z-50 w-8 h-8 flex items-center justify-center bg-[#879a39] hover:bg-[#606e2c] text-[#fffcf0] rounded-full shadow-sm opacity-0 group-hover/tr:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
              title="Copy URL"
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 w-[42%] h-[42%] pointer-events-auto group/bl" />

        <div className="absolute bottom-0 right-0 w-[42%] h-[42%] pointer-events-auto group/br relative">
          <button
            onClick={onDelete}
            className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 z-50 w-7 h-7 flex items-center justify-center bg-[#e05f65] hover:bg-[#af3029] text-[#fffcf0] rounded-full shadow-sm opacity-0 group-hover/br:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
            title="Delete Card"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative">
        {loading && !error && (
          <div className="h-44 bg-slate-200 animate-pulse" />
        )}

        {error && (
          <div className="h-44 flex flex-col items-center justify-center bg-slate-100 text-slate-400">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">加载失败</span>
          </div>
        )}

        {objectUrl && !error && (
          <img
            src={objectUrl}
            alt={fileName}
            className="w-full max-h-44 object-cover"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setError(true)
            }}
            style={{ display: loading ? 'none' : 'block' }}
          />
        )}
      </div>

      <div className="p-3 flex items-center justify-between text-xs text-slate-400">
        <span className="truncate max-w-[140px]">{fileName}</span>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 truncate max-w-[100px]"
          >
            {getDomain(sourceUrl)}
          </a>
        )}
      </div>
    </div>
  )
}
