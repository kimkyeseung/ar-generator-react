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

interface Props {
  mindUrl: string
  videoUrl: string
}

const MindARViewer: React.FC<Props> = ({ mindUrl, videoUrl }) => {
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

    const targetEntity =
      sceneEl.querySelector<HTMLElement>('[mindar-image-target]')

    const handleTargetFound = () => {
      console.log('[MindAR] targetFound')
    }
    const handleTargetLost = () => {
      console.log('[MindAR] targetLost')
    }
    targetEntity?.addEventListener('targetFound', handleTargetFound)
    targetEntity?.addEventListener('targetLost', handleTargetLost)

    const styleCameraFeed = () => {
      const cameraFeed = document.querySelector<HTMLVideoElement>(
        'video.mindar-video',
      )
      if (!cameraFeed) {
        return
      }
      cameraFeed.style.position = 'absolute'
      cameraFeed.style.top = '0'
      cameraFeed.style.left = '0'
      cameraFeed.style.width = '100%'
      cameraFeed.style.height = '100%'
      cameraFeed.style.objectFit = 'cover'
      cameraFeed.style.zIndex = '-1'
      cameraFeed.style.transform = ''
    }

    const observer = new MutationObserver(() => styleCameraFeed())
    observer.observe(sceneEl, { childList: true, subtree: true })
    window.addEventListener('resize', styleCameraFeed)

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
      styleCameraFeed()
    }

    sceneEl.addEventListener('renderstart', handleRenderStart)
    return () => {
      sceneEl.removeEventListener('renderstart', handleRenderStart)
      arSystem.stop()
      observer.disconnect()
      window.removeEventListener('resize', styleCameraFeed)
      targetEntity?.removeEventListener('targetFound', handleTargetFound)
      targetEntity?.removeEventListener('targetLost', handleTargetLost)
    }
  }, [])

  return (
    <a-scene
      className="h-full w-full"
      style={{ width: '100%', height: '100%' }}
      ref={sceneRef}
      mindar-image={`imageTargetSrc: ${mindUrl}; autoStart: false; uiLoading: no; uiError: no; uiScanning: no;`}
      color-space="sRGB"
      embedded
      renderer="colorManagement: true, physicallyCorrectLights"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
    >
      <a-assets>
        <video
          id="ar-video"
          src={videoUrl}
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
