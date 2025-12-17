import React, { useEffect, useRef } from 'react'
import 'aframe'
import 'mind-ar/dist/mindar-image-aframe.prod.js'

declare const DeviceMotionEvent: any
declare const DeviceOrientationEvent: any
declare const AFRAME: any

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
  targetImageUrl: string
  chromaKeyColor?: string
}

// HEX 색상을 RGB 배열로 변환 (0~1 범위)
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ]
  }
  return [0, 1, 0] // 기본값: 녹색
}

// 크로마키 쉐이더를 모듈 로드 시점에 미리 등록 (렌더링 전에 실행됨)
if (typeof AFRAME !== 'undefined' && !AFRAME.shaders['chromakey']) {
  AFRAME.registerShader('chromakey', {
    schema: {
      src: { type: 'map' },
      color: { type: 'vec3', default: { x: 0, y: 1, z: 0 } },
      similarity: { type: 'number', default: 0.4 },
      smoothness: { type: 'number', default: 0.08 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D src;
      uniform vec3 color;
      uniform float similarity;
      uniform float smoothness;
      varying vec2 vUv;
      void main() {
        vec4 texColor = texture2D(src, vUv);
        float diff = length(texColor.rgb - color);
        float alpha = smoothstep(similarity, similarity + smoothness, diff);
        gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
      }
    `,
    transparent: true,
  })
}

const MindARViewer: React.FC<Props> = ({
  mindUrl,
  videoUrl,
  targetImageUrl,
  chromaKeyColor,
}) => {
  const sceneRef = useRef<MindARScene | null>(null)

  useEffect(() => {
    const sceneEl = sceneRef.current
    if (!sceneEl) return
    const containerEl = sceneEl.parentElement as HTMLElement | null

    // arSystem은 renderstart 이벤트 시점에 사용 가능
    let arSystem: { start: () => void; stop: () => void } | null = null

    const targetEntity = sceneEl.querySelector<HTMLElement>(
      '[mindar-image-target]'
    )

    // 타겟 이미지 비율로 비디오 plane 크기 설정
    const updateVideoPlaneFromTargetImage = () => {
      // a-video 또는 a-plane (크로마키) 중 하나를 찾음
      const videoPlane =
        sceneEl.querySelector<HTMLElement>('a-video[src="#ar-video"]') ??
        sceneEl.querySelector<HTMLElement>('a-plane') ??
        null

      if (!videoPlane || !targetImageUrl) return

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const { width: imgWidth, height: imgHeight } = img
        if (!imgWidth || !imgHeight) return

        const planeWidth = 1
        const planeHeight = (imgHeight / imgWidth) * planeWidth
        videoPlane.setAttribute('width', planeWidth.toString())
        videoPlane.setAttribute('height', planeHeight.toString())
      }
      img.src = targetImageUrl
    }

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
      // renderstart 시점에 arSystem 가져오기
      arSystem = sceneEl.systems['mindar-image-system'] ?? null
      if (arSystem) {
        arSystem.start()
      }
      ensureVideoPlayback()
      styleCameraFeed()
      updateVideoPlaneFromTargetImage()
    }

    sceneEl.addEventListener('renderstart', handleRenderStart)

    /** ---------- cleanup ---------- **/
    return () => {
      sceneEl.removeEventListener('renderstart', handleRenderStart)
      if (arSystem) {
        arSystem.stop()
      }
      observer?.disconnect()
      window.removeEventListener('resize', styleCameraFeed)
      targetEntity?.removeEventListener('targetFound', handleTargetFound)
      targetEntity?.removeEventListener('targetLost', handleTargetLost)
      document.removeEventListener('touchend', handleUserGesture)
      document.removeEventListener('click', handleUserGesture)
    }
  }, [targetImageUrl, chromaKeyColor])

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
          preload='auto'
        ></video>
      </a-assets>

      <a-camera position='0 0 0' look-controls='enabled: false'></a-camera>

      <a-entity mindar-image-target='targetIndex: 0'>
        {chromaKeyColor ? (
          <a-plane
            position='0 0 0'
            height='1'
            width='1'
            rotation='0 0 0'
            material={`shader: chromakey; src: #ar-video; color: ${hexToRgb(chromaKeyColor).join(' ')}; transparent: true;`}
          ></a-plane>
        ) : (
          <a-video
            src='#ar-video'
            position='0 0 0'
            height='1'
            width='1'
            rotation='0 0 0'
            loop='true'
            muted='true'
            autoplay='true'
            playsinline='true'
          ></a-video>
        )}
      </a-entity>
    </a-scene>
  )
}

export default MindARViewer
