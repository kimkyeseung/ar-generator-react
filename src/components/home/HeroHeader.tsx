import { Sparkles } from 'lucide-react'

export default function HeroHeader() {
  return (
    <header className='text-center'>
      <div className='mb-4 flex items-center justify-center gap-2'>
        <Sparkles className='h-8 w-8 text-indigo-600' />
        <h1 className='text-3xl font-semibold text-gray-900'>
          Viswave{' '}
          <strong className='text-emerald-400 underline decoration-emerald-500/40 underline-offset-4 transition hover:text-emerald-300'>
            AR site
          </strong>{' '}
          publisher
        </h1>
      </div>
      <p className='text-gray-600'>
        AR 콘텐츠를 업로드하고 QR 코드로 빠르게 배포하세요
      </p>
    </header>
  )
}
