import { ReactNode } from 'react'

export default function PageBackground({ children }: { children: ReactNode }) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'>
      {children}
    </div>
  )
}
