import React from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import './App.css'
import MindARViewer from './mindar-viewer'
import MindARThreeViewer from './mindar-three-viewer'
import { Home } from './components/Home'

const AframePage: React.FC = () => (
  <div className="container">
    <MindARViewer />
    <video></video>
  </div>
)

const ThreePage: React.FC = () => (
  <div className="container">
    <MindARThreeViewer />
  </div>
)

const Navigation: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const isAframe = location.pathname === '/aframe'
  const isThree = location.pathname === '/three'

  return (
    <div className="control-buttons">
      <button
        type="button"
        onClick={() => {
          navigate('/')
        }}
      >
        Home
      </button>
      {!isAframe && (
        <button
          type="button"
          onClick={() => {
            navigate('/aframe')
          }}
        >
          Go to AFRAME version
        </button>
      )}
      {!isThree && (
        <button
          type="button"
          onClick={() => {
            navigate('/three')
          }}
        >
          Go to ThreeJS version
        </button>
      )}
    </div>
  )
}

const App: React.FC = () => (
  <div className="App">
    <h1>
      Example React component with{' '}
      <a
        href="https://github.com/hiukim/mind-ar-js"
        target="_blank"
        rel="noreferrer"
      >
        MindAR
      </a>
    </h1>

    <Navigation />

    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/aframe" element={<AframePage />} />
      <Route path="/three" element={<ThreePage />} />
    </Routes>
  </div>
)

export default App
