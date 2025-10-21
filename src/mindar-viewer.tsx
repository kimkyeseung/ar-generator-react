import React, { useEffect, useRef } from 'react'
import 'aframe'
import 'mind-ar/dist/mindar-image-aframe.prod.js'

type MindARScene = HTMLElement & {
  systems: {
    ['mindar-image-system']?: {
      start: () => void
      stop: () => void
    }
  }
}

const MindARViewer: React.FC = () => {
  const sceneRef = useRef<MindARScene | null>(null)

  useEffect(() => {
    const sceneEl = sceneRef.current
    if (!sceneEl) {
      return undefined
    }
    const arSystem = sceneEl.systems['mindar-image-system']
    if (!arSystem) {
      return undefined
    }

    const ensureVideoPlayback = () => {
      const videoEl = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
      if (!videoEl) {
        return
      }

      const playVideo = () => {
        void videoEl.play().catch(() => {
          // playback can still be blocked by browser policies without user gesture
        })
      }

      if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        playVideo()
        return
      }

      const handleCanPlay = () => {
        videoEl.removeEventListener('canplay', handleCanPlay)
        playVideo()
      }
      videoEl.addEventListener('canplay', handleCanPlay)
    }

    const handleRenderStart = () => {
      arSystem.start()
      ensureVideoPlayback()
    }

    sceneEl.addEventListener('renderstart', handleRenderStart)
    return () => {
      sceneEl.removeEventListener('renderstart', handleRenderStart)
      arSystem.stop()
    }
  }, [])

  return (
    <a-scene
      ref={sceneRef}
      mindar-image="imageTargetSrc: targets.mind; autoStart: false; uiLoading: no; uiError: no; uiScanning: no;"
      color-space="sRGB"
      embedded
      renderer="colorManagement: true, physicallyCorrectLights"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
    >
      <a-assets>
        <video
          id="ar-video"
          src="/video.mp4"
          loop
          crossOrigin="anonymous"
          playsInline
          webkit-playsinline="true"
          muted
          preload="auto"
        ></video>
      </a-assets>

      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

      <a-entity mindar-image-target="targetIndex: 0">
        <a-video
          src="#ar-video"
          position="0 0 0"
          height="0.552"
          width="1"
          rotation="0 0 0"
          loop="true"
          muted="true"
          autoplay="true"
          playsinline="true"
        ></a-video>
      </a-entity>
    </a-scene>
  )
}

export default MindARViewer
