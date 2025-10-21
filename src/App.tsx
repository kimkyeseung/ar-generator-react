import React, { useState } from 'react';
import './App.css';
import MindARViewer from './mindar-viewer';
import MindARThreeViewer from './mindar-three-viewer';

type ViewerVariant = 'aframe' | 'three';

const App: React.FC = () => {
  const [started, setStarted] = useState<ViewerVariant | null>(null);

  return (
    <div className="App">
      <h1>Example React component with <a href="https://github.com/hiukim/mind-ar-js" target="_blank" rel="noreferrer">MindAR</a></h1>

      <div className="control-buttons">
        {started === null && <button onClick={() => {setStarted('aframe');}}>Start AFRAME version</button>}
        {started === null && <button onClick={() => {setStarted('three');}}>Start ThreeJS version</button>}
        {started !== null && <button onClick={() => {setStarted(null);}}>Stop</button>}
      </div>

      {started === 'aframe' && (
        <div className="container">
          <MindARViewer/>
          <video></video>
        </div>
      )}

      {started === 'three' && (
        <div className="container">
          <MindARThreeViewer />
        </div>
      )}
    </div>
  );
};

export default App;
