import { AlertCircle } from 'lucide-react'

type StatusCalloutProps = {
  message: string
  variant?: 'info' | 'error'
}

export default function StatusCallout({
  message,
  variant = 'info',
}: StatusCalloutProps) {
  const isError = variant === 'error'
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        isError
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-indigo-100 bg-indigo-50 text-indigo-700'
      }`}
    >
      <AlertCircle
        className={`mt-0.5 h-4 w-4 ${
          isError ? 'text-red-500' : 'text-indigo-500'
        }`}
      />
      <span>{message}</span>
    </div>
  )
}
