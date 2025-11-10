import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import MindARViewerPage from './MindARViewerPage'
import { QRCodePage } from './QRCodePage'
import Home from './components/Home'
import { Template } from './components/Template'

const App: React.FC = () => (
  <main>
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/template' element={<Template />} />
      <Route path='/result/qr/:folderId' element={<QRCodePage />} />
      <Route path='/result/:folderId' element={<MindARViewerPage />} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  </main>
)

export default App
