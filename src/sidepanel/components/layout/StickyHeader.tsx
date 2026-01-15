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
    <header className="h-[60px] flex items-center justify-between px-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shrink-0 sticky top-0 z-40 gap-2">
      {/* Left: Back Button - Fixed width container to prevent shrinking */}
      <div className="flex-none w-[72px] flex justify-start">
        {showBack && (
          <button
            onClick={onBack}
            className="group flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 whitespace-nowrap"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 shrink-0"
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
            <span className="text-sm font-medium">返回</span>
          </button>
        )}
      </div>

      {/* Center: Title - Takes up remaining space and handles truncation */}
      <div className="flex-1 min-w-0 flex justify-center">
        <h1 className="text-[15px] font-bold text-slate-800 truncate tracking-tight text-center">
          {title}
        </h1>
      </div>

      {/* Right: Actions - Fixed width container, ensures buttons never wrap */}
      <div className="flex-none flex items-center justify-end gap-1.5">
        {showExport && (
          <>
            <div className="relative group/help flex-none">
              <button className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-90 shrink-0">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* Tooltip Popover */}
              <div className="absolute top-[calc(100%+8px)] right-0 w-52 hidden group-hover/help:block z-50">
                <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3.5 rounded-xl shadow-2xl text-[11px] space-y-2.5 animate-in fade-in zoom-in slide-in-from-top-2 duration-200 ring-1 ring-white/10">
                  <div className="font-bold text-[12px] border-b border-white/10 pb-2 mb-1.5 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    快捷键说明
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400 whitespace-nowrap">保存编辑</span>
                    <kbd className="bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-600 font-sans shadow-inner shrink-0 text-[9px]">Shift+Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400 whitespace-nowrap">文字换行</span>
                    <kbd className="bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-600 font-sans shadow-inner shrink-0 text-[9px]">Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400 whitespace-nowrap">进入编辑</span>
                    <span className="text-blue-300 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">双击卡片</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400 whitespace-nowrap">采集内容</span>
                    <span className="text-blue-300 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">网页拖拽</span>
                  </div>
                  <div className="absolute top-0 right-3.5 -mt-1 border-4 border-transparent border-b-slate-900"></div>
                </div>
              </div>
            </div>
            
            <button
              onClick={onExport}
              className="flex-none flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 active:shadow-inner whitespace-nowrap shrink-0"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>导出</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
