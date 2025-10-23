import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import MindARViewer from './mindar-viewer'
import MindARThreeViewer from './mindar-three-viewer'
import Home from './components/Home'
import { Template } from './components/Template'

const AframePage: React.FC = () => (
  <section className="flex w-full justify-center">
    <div className="relative h-[360px] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-transparent shadow-2xl">
      <MindARViewer />
    </div>
  </section>
)

const ThreePage: React.FC = () => (
  <section className="flex w-full justify-center">
    <div className="relative h-[360px] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-transparent shadow-2xl">
      <MindARThreeViewer />
    </div>
  </section>
)

const App: React.FC = () => (
  <main>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/aframe" element={<AframePage />} />
      <Route path="/three" element={<ThreePage />} />
      <Route path="/template" element={<Template />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </main>
)

export default App
