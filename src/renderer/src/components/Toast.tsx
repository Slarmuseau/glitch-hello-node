import React, { createContext, useCallback, useContext, useState } from 'react'

interface ToastMsg {
  id: number
  text: string
  tone: 'info' | 'good' | 'bad'
}

const ToastCtx = createContext<(text: string, tone?: ToastMsg['tone']) => void>(() => {})

export function useToast(): (text: string, tone?: ToastMsg['tone']) => void {
  return useContext(ToastCtx)
}

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [msgs, setMsgs] = useState<ToastMsg[]>([])
  const push = useCallback((text: string, tone: ToastMsg['tone'] = 'info') => {
    const id = Date.now() + Math.random()
    setMsgs((m) => [...m, { id, text, tone }])
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`card px-4 py-3 text-sm shadow-lift border-l-4 ${
              m.tone === 'good'
                ? 'border-l-sage-500'
                : m.tone === 'bad'
                  ? 'border-l-clay-500'
                  : 'border-l-amber-400'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
