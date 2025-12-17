import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import MindARViewerPage from './MindARViewerPage'
import { QRCodePage } from './QRCodePage'
import TestPage from './TestPage'
import { Template } from './components/Template'
import ProjectListPage from './pages/ProjectListPage'
import CreateProjectPage from './pages/CreateProjectPage'
import EditProjectPage from './pages/EditProjectPage'

const App: React.FC = () => (
  <main>
    <Routes>
      <Route path='/' element={<ProjectListPage />} />
      <Route path='/create' element={<CreateProjectPage />} />
      <Route path='/edit/:id' element={<EditProjectPage />} />
      <Route path='/template' element={<Template />} />
      <Route path='/result/qr/:folderId' element={<QRCodePage />} />
      <Route path='/result/:folderId' element={<MindARViewerPage />} />
      <Route path='/test/:folderId' element={<TestPage />} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  </main>
)

export default App
