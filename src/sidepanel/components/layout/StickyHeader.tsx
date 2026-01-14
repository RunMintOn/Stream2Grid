interface StickyHeaderProps {
  title: string
  showBack?: boolean
  showExport?: boolean
  onBack?: () => void
  onExport?: () => void
}

export default function StickyHeader({
  title,
  showBack = false,
  showExport = false,
  onBack,
  onExport,
}: StickyHeaderProps) {
  return (
    <header className="h-[50px] flex items-center justify-between px-4 bg-white border-b border-slate-200 shrink-0">
      {/* Left: Back Button */}
      <div className="w-16">
        {showBack && (
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回
          </button>
        )}
      </div>

      {/* Center: Title */}
      <h1 className="text-base font-semibold text-slate-800 truncate max-w-[180px]">
        {title}
      </h1>

      {/* Right: Export Button */}
      <div className="w-16 flex justify-end">
        {showExport && (
          <button
            onClick={onExport}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            导出
          </button>
        )}
      </div>
    </header>
  )
}
