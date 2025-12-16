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
  width?: number
  height?: number
}

const MindARViewer: React.FC<Props> = ({
  mindUrl,
  videoUrl,
  width = 1,
  height = 1,
}) => {
  const sceneRef = useRef<MindARScene | null>(null)

  useEffect(() => {
    const sceneEl = sceneRef.current
    if (!sceneEl) return
    const containerEl = sceneEl.parentElement as HTMLElement | null

    const arSystem = sceneEl.systems['mindar-image-system']
    if (!arSystem) return

    const targetEntity = sceneEl.querySelector<HTMLElement>(
      '[mindar-image-target]'
    )

    // width/height가 props로 전달되므로 자동 비율 조정은 불필요

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
    const getCameraFeed = () => {
      if (!containerEl) return null
      const cameraFeed = Array.from(
        containerEl.querySelectorAll<HTMLVideoElement>('video')
      ).find((videoEl) => !sceneEl.contains(videoEl))
      if (!cameraFeed) return null
      cameraFeed.classList.add('mindar-camera-feed') // 나중에 스타일링 할 수 있을 수도
      return cameraFeed
    }

    const styleCameraFeed = () => {
      const cameraFeed = getCameraFeed()
      if (!cameraFeed) return

      cameraFeed.style.position = 'absolute'
      cameraFeed.style.zIndex = '-1'
      cameraFeed.style.transform = ''

      const isMobileViewport =
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 768px)').matches

      if (isMobileViewport) {
        cameraFeed.dataset.mindarViewport = 'mobile'
        Object.assign(cameraFeed.style, {
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        })
        return
      }

      if (cameraFeed.dataset.mindarViewport === 'mobile') {
        delete cameraFeed.dataset.mindarViewport
        cameraFeed.style.removeProperty('top')
        cameraFeed.style.removeProperty('left')
        cameraFeed.style.removeProperty('width')
        cameraFeed.style.removeProperty('height')
        cameraFeed.style.removeProperty('object-fit')
      }
    }

    const observer = containerEl ? new MutationObserver(styleCameraFeed) : null
    if (observer && containerEl) {
      observer.observe(containerEl, { childList: true, subtree: true })
    }
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
      observer?.disconnect()
      window.removeEventListener('resize', styleCameraFeed)
      targetEntity?.removeEventListener('targetFound', handleTargetFound)
      targetEntity?.removeEventListener('targetLost', handleTargetLost)
      document.removeEventListener('touchend', handleUserGesture)
      document.removeEventListener('click', handleUserGesture)
    }
  }, [width, height])

  return (
    <a-scene
      className='h-full w-full'
      style={{ width: '100%', height: '100%' }}
      ref={sceneRef}
      mindar-image={`imageTargetSrc: ${mindUrl}; autoStart: false; uiLoading: no; uiError: no; uiScanning: no;`}
      assettimeout='15000'
      color-space='sRGB'
      embedded
      renderer='colorManagement: true, physicallyCorrectLights'
      vr-mode-ui='enabled: false'
      device-orientation-permission-ui='enabled: false'
    >
      <a-assets>
        <video
          id='ar-video'
          src={videoUrl}
          loop
          crossOrigin='anonymous'
          playsInline
          webkit-playsinline='true'
          muted
          // preload="auto"
          preload='metadata' // 전체 파일을 받지 않고 메타데이터만 받으라는 힌트
        ></video>
      </a-assets>

      <a-camera position='0 0 0' look-controls='enabled: false'></a-camera>

      <a-entity mindar-image-target='targetIndex: 0'>
        <a-video
          src='#ar-video'
          position='0 0 0'
          height={height.toString()}
          width={width.toString()}
          rotation='0 0 0'
          loop='true'
          muted='true'
          autoplay='true'
          playsinline='true'
        ></a-video>
      </a-entity>
    </a-scene>
  )
}

export default MindARViewer
