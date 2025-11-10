import { ReactNode } from 'react'

type UploadCardProps = {
  stepMessage: string
  status: string
  children: ReactNode
}

export default function UploadCard({
  stepMessage,
  status,
  children,
}: UploadCardProps) {
  return (
    <section className='rounded-2xl bg-white p-8 shadow-xl'>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
        <h2 className='text-lg font-semibold text-gray-900'>{stepMessage}</h2>
        <span className='inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600'>
          {status}
        </span>
      </div>
      <div className='space-y-6'>{children}</div>
    </section>
  )
}
