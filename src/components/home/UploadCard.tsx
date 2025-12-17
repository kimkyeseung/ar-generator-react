import { ReactNode } from 'react'
import { Loader2, CheckCircle2, Upload, AlertCircle } from 'lucide-react'

type StatusType = 'idle' | 'compiling' | 'uploading' | 'ready' | 'error'

type UploadCardProps = {
  stepMessage: string
  status: string
  statusType?: StatusType
  children: ReactNode
}

function StatusBadge({ status, statusType = 'idle' }: { status: string; statusType: StatusType }) {
  const config = {
    idle: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      icon: <Upload className='h-3.5 w-3.5' />,
    },
    compiling: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      icon: <Loader2 className='h-3.5 w-3.5 animate-spin' />,
    },
    uploading: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: <Loader2 className='h-3.5 w-3.5 animate-spin' />,
    },
    ready: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      icon: <CheckCircle2 className='h-3.5 w-3.5' />,
    },
    error: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: <AlertCircle className='h-3.5 w-3.5' />,
    },
  }

  const { bg, text, icon } = config[statusType]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${bg} ${text}`}
    >
      {icon}
      {status}
    </span>
  )
}

export default function UploadCard({
  stepMessage,
  status,
  statusType = 'idle',
  children,
}: UploadCardProps) {
  return (
    <section className='rounded-2xl bg-white p-8 shadow-xl'>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
        <h2 className='text-lg font-semibold text-gray-900'>{stepMessage}</h2>
        <StatusBadge status={status} statusType={statusType} />
      </div>
      <div className='space-y-6'>{children}</div>
    </section>
  )
}
