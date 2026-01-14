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
      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center text-white bg-black/50 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image Container */}
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

      {/* Footer */}
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
