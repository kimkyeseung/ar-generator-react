import React from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import MindARViewer from './mindar-viewer'
import MindARThreeViewer from './mindar-three-viewer'
import { Home } from './components/Home'

const Navigation: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isAframe = location.pathname === '/aframe'
  const isThree = location.pathname === '/three'

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {!isHome && (
        <button
          type="button"
          onClick={() => {
            navigate('/')
          }}
          className="rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2 text-sm font-semibold text-slate-200 shadow transition hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Home
        </button>
      )}
      {!isAframe && (
        <button
          type="button"
          onClick={() => {
            navigate('/aframe')
          }}
          className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-emerald-950 shadow transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          AFRAME viewer
        </button>
      )}
      {!isThree && (
        <button
          type="button"
          onClick={() => {
            navigate('/three')
          }}
          className="rounded-full bg-sky-400 px-6 py-2 text-sm font-semibold text-sky-950 shadow transition hover:bg-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Three.js viewer
        </button>
      )}
    </div>
  )
}

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
  <div className="flex min-h-full flex-col px-4 pb-14 pt-10 text-slate-100">
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="space-y-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
          Augmented Reality Generator
        </span>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">
          Explore AR examples built with{' '}
          <a
            href="https://github.com/hiukim/mind-ar-js"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-4 transition hover:text-emerald-300"
          >
            MindAR
          </a>
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-400">
          Switch between the AFRAME scene and the Three.js integration to compare different ways of embedding MindAR
          inside a React application.
        </p>
      </header>

      <Navigation />

      <main className="mt-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/aframe" element={<AframePage />} />
          <Route path="/three" element={<ThreePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  </div>
)

export default App
