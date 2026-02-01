import { useEffect, useRef, useState } from 'react'

interface LogEntry {
  id: number
  type: 'log' | 'warn' | 'error' | 'info'
  message: string
  timestamp: Date
}

export default function ConsoleLogOverlay() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isMinimized, setIsMinimized] = useState(false)
  const logIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 원본 콘솔 메서드 저장
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error
    const originalInfo = console.info

    const addLog = (type: LogEntry['type'], args: unknown[]) => {
      const message = args
        .map((arg) => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2)
            } catch {
              return String(arg)
            }
          }
          return String(arg)
        })
        .join(' ')

      setLogs((prev) => {
        const newLogs = [
          ...prev,
          {
            id: logIdRef.current++,
            type,
            message,
            timestamp: new Date(),
          },
        ]
        // 최대 100개 로그 유지
        return newLogs.slice(-100)
      })
    }

    // 콘솔 메서드 오버라이드
    console.log = (...args) => {
      originalLog.apply(console, args)
      addLog('log', args)
    }
    console.warn = (...args) => {
      originalWarn.apply(console, args)
      addLog('warn', args)
    }
    console.error = (...args) => {
      originalError.apply(console, args)
      addLog('error', args)
    }
    console.info = (...args) => {
      originalInfo.apply(console, args)
      addLog('info', args)
    }

    // 클린업: 원본 복원
    return () => {
      console.log = originalLog
      console.warn = originalWarn
      console.error = originalError
      console.info = originalInfo
    }
  }, [])

  // 새 로그 추가 시 스크롤 하단으로
  useEffect(() => {
    if (containerRef.current && !isMinimized) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, isMinimized])

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400'
      case 'warn':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-gray-200'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white shadow-lg"
      >
        <span className="text-xs">{logs.length}</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 z-[9999] w-full max-w-md">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-gray-900 px-3 py-2 text-white">
        <span className="text-xs font-medium">Console ({logs.length})</span>
        <div className="flex gap-2">
          <button
            onClick={() => setLogs([])}
            className="rounded bg-gray-700 px-2 py-0.5 text-xs hover:bg-gray-600"
          >
            Clear
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="rounded bg-gray-700 px-2 py-0.5 text-xs hover:bg-gray-600"
          >
            _
          </button>
        </div>
      </div>

      {/* 로그 목록 */}
      <div
        ref={containerRef}
        className="max-h-48 overflow-y-auto bg-black/90 p-2 font-mono text-[10px] leading-tight"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">No logs yet...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`mb-1 ${getTypeColor(log.type)}`}>
              <span className="text-gray-500">[{formatTime(log.timestamp)}]</span>{' '}
              <span className="whitespace-pre-wrap break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
