import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onUndo: () => void
  duration?: number
}

export default function Toast({ message, onUndo, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timer)
  }, [duration])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-4 z-50 animate-in fade-in">
      <span>{message}</span>
      <button
        onClick={onUndo}
        className="text-blue-300 hover:text-blue-200 underline font-medium"
      >
        撤销
      </button>
    </div>
  )
}
