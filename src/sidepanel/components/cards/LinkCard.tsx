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
  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname.replace('www.', '')
    } catch {
      return urlStr
    }
  }

  const displayTitle = title || getDomain(url)

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

      {/* Link Content */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:no-underline"
      >
        <div className="flex items-start gap-3">
          {/* Favicon */}
          <div className="shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            {sourceIcon ? (
              <img
                src={sourceIcon}
                alt=""
                className="w-6 h-6"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.parentElement!.innerHTML = `
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  `
                }}
              />
            ) : (
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-slate-800 truncate">
              {displayTitle}
            </h4>
            <p className="text-xs text-slate-400 truncate mt-1">
              {getDomain(url)}
            </p>
          </div>
        </div>
      </a>
    </div>
  )
}
