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

      {/* Right: Actions */}
      <div className="w-16 flex items-center justify-end gap-3">
        {showExport && (
          <>
            <div className="relative group/help">
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* Tooltip Popover */}
              <div className="absolute top-full right-0 mt-2 w-48 hidden group-hover/help:block z-50">
                <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl text-xs space-y-2 animate-in fade-in zoom-in duration-200">
                  <div className="font-bold border-b border-slate-700 pb-1 mb-1">快捷键说明</div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">保存编辑</span>
                    <kbd className="bg-slate-700 px-1 rounded">Shift+Enter</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">文字换行</span>
                    <kbd className="bg-slate-700 px-1 rounded">Enter</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">进入编辑</span>
                    <span className="text-blue-300">双击卡片</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">采集内容</span>
                    <span className="text-blue-300">从网页拖拽</span>
                  </div>
                  <div className="absolute top-0 right-3 -mt-1 border-4 border-transparent border-b-slate-800"></div>
                </div>
              </div>
            </div>
            
            <button
              onClick={onExport}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              导出
            </button>
          </>
        )}
      </div>
    </header>
  )
}
