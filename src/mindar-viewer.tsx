import React, { useEffect, useRef } from 'react'
import 'aframe'
import 'mind-ar/dist/mindar-image-aframe.prod.js'

declare const DeviceMotionEvent: any
declare const DeviceOrientationEvent: any

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
    if (!sceneEl) return

    const arSystem = sceneEl.systems['mindar-image-system']
    if (!arSystem) return

    const targetEntity = sceneEl.querySelector<HTMLElement>(
      '[mindar-image-target]',
    )

    /** ---------- 타겟 이벤트 ---------- **/
    const handleTargetFound = () => {
      console.log('[MindAR] targetFound')
      const video = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
      if (video) {
        void video.play().catch((e) => {
          console.warn('[MindAR] targetFound -> play() blocked', e)
        })
      }
    }

    const handleTargetLost = () => {
      console.log('[MindAR] targetLost')
      const video = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
      video?.pause()
    }

    targetEntity?.addEventListener('targetFound', handleTargetFound)
    targetEntity?.addEventListener('targetLost', handleTargetLost)

    /** ---------- 카메라 피드 스타일 ---------- **/
    const styleCameraFeed = () => {
      const cameraFeed =
        document.querySelector<HTMLVideoElement>('video.mindar-video')
      if (!cameraFeed) return

      Object.assign(cameraFeed.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: '-1',
        transform: '',
      })
    }

    const observer = new MutationObserver(() => styleCameraFeed())
    observer.observe(sceneEl, { childList: true, subtree: true })
    window.addEventListener('resize', styleCameraFeed)

    /** ---------- 비디오 재생 보장 ---------- **/
    const ensureVideoPlayback = () => {
      const videoEl = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
      if (!videoEl) return

      const tryPlay = () => {
        void videoEl.play().catch((err) => {
          console.warn('[MindAR] video autoplay blocked', err)
        })
      }

      if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        tryPlay()
      } else {
        videoEl.addEventListener('canplay', tryPlay, { once: true })
      }
    }

    /** ---------- iOS 권한 요청 + 최초 제스처 처리 ---------- **/
    const requestIOSPermissions = async () => {
      try {
        if (
          typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function'
        ) {
          await DeviceMotionEvent.requestPermission()
        }
        if (
          typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function'
        ) {
          await DeviceOrientationEvent.requestPermission()
        }
        console.log('[MindAR] iOS motion/orientation permission granted')
      } catch (e) {
        console.warn('[MindAR] iOS permission denied or unavailable', e)
      }
    }

    const handleUserGesture = async () => {
      await requestIOSPermissions()
      const video = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
      if (video) {
        void video.play().catch((e) => {
          console.warn('[MindAR] manual play blocked', e)
        })
      }
      document.removeEventListener('touchend', handleUserGesture)
      document.removeEventListener('click', handleUserGesture)
    }

    // iOS에서 첫 터치 시 권한 요청 + 비디오 재생
    document.addEventListener('touchend', handleUserGesture)
    document.addEventListener('click', handleUserGesture)

    /** ---------- 렌더 시작 시 ---------- **/
    const handleRenderStart = () => {
      arSystem.start()
      ensureVideoPlayback()
      styleCameraFeed()
    }

    sceneEl.addEventListener('renderstart', handleRenderStart)

    /** ---------- cleanup ---------- **/
    return () => {
      sceneEl.removeEventListener('renderstart', handleRenderStart)
      arSystem.stop()
      observer.disconnect()
      window.removeEventListener('resize', styleCameraFeed)
      targetEntity?.removeEventListener('targetFound', handleTargetFound)
      targetEntity?.removeEventListener('targetLost', handleTargetLost)
      document.removeEventListener('touchend', handleUserGesture)
      document.removeEventListener('click', handleUserGesture)
    }
  }, [])

  return (
    <a-scene
      className="h-full w-full"
      style={{ width: '100%', height: '100%' }}
      ref={sceneRef}
      mindar-image={`imageTargetSrc: ${mindUrl}; autoStart: false; uiLoading: no; uiError: no; uiScanning: no;`}
      assettimeout="15000"
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
