import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

// Eager load - 자주 사용되는 메인 페이지
import ProjectListPage from './pages/ProjectListPage'

// Lazy load - 무거운 컴포넌트들 (MindAR, Three.js, A-Frame 포함)
const MindARViewerPage = lazy(() => import('./MindARViewerPage'))
const CreateProjectPage = lazy(() => import('./pages/CreateProjectPage'))
const EditProjectPage = lazy(() => import('./pages/EditProjectPage'))
const QRCodePage = lazy(() => import('./QRCodePage').then(m => ({ default: m.QRCodePage })))
const TestPage = lazy(() => import('./TestPage'))
const Template = lazy(() => import('./components/Template').then(m => ({ default: m.Template })))
const CleanupPage = lazy(() => import('./pages/CleanupPage'))

// 로딩 폴백 컴포넌트
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      <p className="mt-2 text-gray-600">로딩 중...</p>
    </div>
  </div>
)

const App: React.FC = () => (
  <main>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path='/' element={<ProjectListPage />} />
        <Route path='/create' element={<CreateProjectPage />} />
        <Route path='/edit/:id' element={<EditProjectPage />} />
        <Route path='/template' element={<Template />} />
        <Route path='/result/qr/:folderId' element={<QRCodePage />} />
        <Route path='/result/:folderId' element={<MindARViewerPage />} />
        <Route path='/test/:folderId' element={<TestPage />} />
        <Route path='/cleanup' element={<CleanupPage />} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </Suspense>
  </main>
)

export default App
