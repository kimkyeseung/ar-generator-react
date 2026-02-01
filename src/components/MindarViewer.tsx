import React, { useEffect, useRef, useState, useCallback } from 'react'
import 'aframe'
import 'mind-ar/dist/mindar-image-aframe.prod.js'
import { CameraResolution } from '../types/project'
import { SpeakerIcon } from './ui/SpeakerIcon'

declare const DeviceMotionEvent: any
declare const DeviceOrientationEvent: any
declare const AFRAME: any

type OneEuroFilter = {
  minCutOff: number
  beta: number
  reset: () => void
}

type TrackingState = {
  showing: boolean
  isTracking: boolean
  filter: OneEuroFilter
}

type MindARController = {
  filterMinCF: number
  filterBeta: number
  trackingStates: TrackingState[]
}

type MindARSystem = {
  start: () => void
  stop: () => void
  controller?: MindARController
}

type MindARScene = HTMLElement & {
  systems: {
    ['mindar-image-system']?: MindARSystem
  }
}

interface Props {
  mindUrl: string
  videoUrl: string
  previewVideoUrl?: string
  targetImageUrl: string
  chromaKeyColor?: string
  flatView?: boolean
  highPrecision?: boolean
  cameraResolution?: CameraResolution
  debugMode?: boolean
}

// billboard 컴포넌트를 모듈 로드 시점에 미리 등록 (flatView용)
if (typeof AFRAME !== 'undefined' && !AFRAME.components['billboard']) {
  AFRAME.registerComponent('billboard', {
    tick: function () {
      const camera = this.el.sceneEl?.camera
      if (!camera) return

      const object3D = this.el.object3D
      if (!object3D) return

      // 카메라의 world quaternion을 가져와서 적용
      const cameraWorldQuaternion = new AFRAME.THREE.Quaternion()
      camera.getWorldQuaternion(cameraWorldQuaternion)

      // 부모의 world quaternion을 역으로 적용하여 로컬 회전 계산
      const parent = object3D.parent
      if (parent) {
        const parentWorldQuaternion = new AFRAME.THREE.Quaternion()
        parent.getWorldQuaternion(parentWorldQuaternion)
        parentWorldQuaternion.invert()
        cameraWorldQuaternion.premultiply(parentWorldQuaternion)
      }

      object3D.quaternion.copy(cameraWorldQuaternion)
    },
  })
}

// 크로마키 컴포넌트를 모듈 로드 시점에 미리 등록
if (typeof AFRAME !== 'undefined' && !AFRAME.components['chromakey-material']) {
  AFRAME.registerComponent('chromakey-material', {
    schema: {
      src: { type: 'selector' },
      color: { type: 'color', default: '#00FF00' },
      similarity: { type: 'number', default: 0.4 },
      smoothness: { type: 'number', default: 0.08 },
    },
    init: function () {
      const videoEl = this.data.src as HTMLVideoElement | null
      if (!videoEl) return

      // Three.js VideoTexture 생성
      const THREE = AFRAME.THREE
      const texture = new THREE.VideoTexture(videoEl)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.format = THREE.RGBAFormat

      // 크로마키 색상을 RGB로 변환 (0~1 범위)
      const color = new THREE.Color(this.data.color)

      // ShaderMaterial 생성
      this.material = new THREE.ShaderMaterial({
        uniforms: {
          src: { value: texture },
          color: { value: new THREE.Vector3(color.r, color.g, color.b) },
          similarity: { value: this.data.similarity },
          smoothness: { value: this.data.smoothness },
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
        side: THREE.DoubleSide,
      })

      // mesh에 material 적용
      const mesh = this.el.getObject3D('mesh')
      if (mesh && 'material' in mesh) {
        ;(mesh as { material: unknown }).material = this.material
      }
    },
    tick: function () {
      // 매 프레임마다 비디오 텍스처 갱신
      if (this.material && this.material.uniforms.src.value) {
        this.material.uniforms.src.value.needsUpdate = true
      }
    },
    remove: function () {
      if (this.material) {
        this.material.dispose()
      }
    },
  })
}

// iOS 감지
const isIOS = () => {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

const MindARViewer: React.FC<Props> = ({
  mindUrl,
  videoUrl,
  previewVideoUrl,
  targetImageUrl,
  chromaKeyColor,
  flatView,
  highPrecision,
  cameraResolution = 'fhd',
  debugMode = false,
}) => {
  const sceneRef = useRef<MindARScene | null>(null)
  const isRestartingRef = useRef(false)
  // iOS는 muted 기본값, Android는 unmuted 기본값
  const [isMuted, setIsMuted] = useState(isIOS())
  const [isLoading, setIsLoading] = useState(true)
  // 현재 재생 중인 비디오 URL (프리뷰 → 원본 전환)
  const [currentVideoUrl, setCurrentVideoUrl] = useState(previewVideoUrl || videoUrl)
  const [isHDReady, setIsHDReady] = useState(!previewVideoUrl) // 프리뷰가 없으면 이미 HD

  // 디버그 모드: 필터 설정
  const [stabilizationEnabled, setStabilizationEnabled] = useState(true)
  const [filterMinCF, setFilterMinCF] = useState(0.001)
  const [filterBeta, setFilterBeta] = useState(10)

  // 디버그 모드: 필터 파라미터 실시간 업데이트
  useEffect(() => {
    if (!debugMode) return

    const sceneEl = sceneRef.current
    if (!sceneEl) return

    const arSystem = sceneEl.systems?.['mindar-image-system'] as MindARSystem | undefined
    if (!arSystem?.controller) return

    const { controller } = arSystem
    const newMinCF = stabilizationEnabled ? filterMinCF : 1000
    const newBeta = stabilizationEnabled ? filterBeta : 0

    // 컨트롤러 속성 업데이트
    controller.filterMinCF = newMinCF
    controller.filterBeta = newBeta

    // 각 트래킹 상태의 필터 인스턴스 직접 업데이트
    if (controller.trackingStates) {
      controller.trackingStates.forEach((state) => {
        if (state.filter) {
          state.filter.minCutOff = newMinCF
          state.filter.beta = newBeta
        }
      })
    }

    console.log('[Debug] Filter updated:', {
      stabilizationEnabled,
      minCutOff: newMinCF,
      beta: newBeta,
      trackingStatesCount: controller.trackingStates?.length ?? 0,
    })
  }, [debugMode, stabilizationEnabled, filterMinCF, filterBeta])

  // 스피커 버튼 클릭 핸들러
  const handleToggleMute = useCallback(async () => {
    const sceneEl = sceneRef.current
    if (!sceneEl) return

    const video = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
    if (!video) return

    const newMutedState = !isMuted

    if (!newMutedState) {
      // unmute 시도 - 사용자 제스처이므로 재생 가능
      try {
        video.muted = false
        // 비디오가 일시정지 상태면 재생
        if (video.paused) {
          await video.play()
        }
        setIsMuted(false)
        console.log('[MindAR] Sound enabled')
      } catch (e) {
        console.warn('[MindAR] Failed to unmute:', e)
        // 실패하면 muted 상태 유지
        video.muted = true
      }
    } else {
      // mute
      video.muted = true
      setIsMuted(true)
      console.log('[MindAR] Sound disabled')
    }
  }, [isMuted])

  // 원본 HD 비디오를 백그라운드에서 미리 로드
  useEffect(() => {
    if (!previewVideoUrl || isHDReady) return // 프리뷰가 없거나 이미 HD면 스킵

    console.log('[MindAR] Preloading HD video in background...')
    const hdVideo = document.createElement('video')
    hdVideo.preload = 'auto'
    hdVideo.muted = true
    hdVideo.playsInline = true
    hdVideo.crossOrigin = 'anonymous'
    hdVideo.src = videoUrl

    const handleCanPlay = () => {
      console.log('[MindAR] HD video ready, switching source...')
      setIsHDReady(true)
      setCurrentVideoUrl(videoUrl)
    }

    hdVideo.addEventListener('canplaythrough', handleCanPlay, { once: true })

    // 로드 시작
    hdVideo.load()

    return () => {
      hdVideo.removeEventListener('canplaythrough', handleCanPlay)
      hdVideo.src = ''
    }
  }, [videoUrl, previewVideoUrl, isHDReady])

  // 비디오 소스가 변경되면 현재 재생 중인 비디오 업데이트
  useEffect(() => {
    const sceneEl = sceneRef.current
    if (!sceneEl) return

    const video = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
    if (!video) return

    // 현재 재생 시간 저장
    const currentTime = video.currentTime
    const wasPlaying = !video.paused

    // 새 소스로 변경
    if (video.src !== currentVideoUrl) {
      console.log('[MindAR] Switching video source to:', currentVideoUrl.includes('preview') ? 'preview' : 'HD')
      video.src = currentVideoUrl
      video.currentTime = currentTime
      if (wasPlaying) {
        video.play().catch(() => {})
      }
    }
  }, [currentVideoUrl])

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
    const handleTargetFound = async () => {
      console.log('[MindAR] targetFound')
      const video = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
      if (!video) return

      try {
        // 비디오 시작 위치로 이동
        video.currentTime = 0
        // 현재 mute 상태 유지하며 재생
        await video.play()
        console.log('[MindAR] Video playing')
      } catch (e) {
        console.warn('[MindAR] targetFound -> play() error', e)
        video.play().catch(() => {})
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
      // 로딩 완료
      setIsLoading(false)
    }

    sceneEl.addEventListener('renderstart', handleRenderStart)

    /** ---------- 탭 전환 시 카메라 재시작 ---------- **/
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (isRestartingRef.current) {
          console.log('[MindAR] Already restarting, skipping...')
          return
        }
        isRestartingRef.current = true
        console.log('[MindAR] Tab became visible, restarting AR system...')

        if (arSystem) {
          try {
            // MindAR 내부 상태 확인 후 stop 호출
            try {
              arSystem.stop()
            } catch (stopErr) {
              console.warn('[MindAR] arSystem.stop() failed (may already be stopped):', stopErr)
            }

            await new Promise((resolve) => setTimeout(resolve, 500))

            console.log('[MindAR] Calling arSystem.start()...')
            arSystem.start()
            console.log('[MindAR] arSystem.start() called')

            // 카메라 피드가 나타날 때까지 대기
            await new Promise((resolve) => setTimeout(resolve, 1500))
            styleCameraFeed()
            console.log('[MindAR] AR system restart completed')
          } catch (e) {
            console.error('[MindAR] Failed to restart AR system', e)
          } finally {
            isRestartingRef.current = false
          }
        } else {
          console.warn('[MindAR] arSystem is null, cannot restart')
          isRestartingRef.current = false
        }
      } else {
        console.log('[MindAR] Tab became hidden')
        // 탭이 숨겨지면 AR 비디오 일시정지 및 음소거
        const video = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
        if (video) {
          video.pause()
          video.muted = true
          console.log('[MindAR] Video paused and muted')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    /** ---------- cleanup ---------- **/
    return () => {
      console.log('[MindAR] Cleanup called, isRestarting:', isRestartingRef.current)
      sceneEl.removeEventListener('renderstart', handleRenderStart)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // 재시작 중이면 stop() 호출 건너뛰기
      if (arSystem && !isRestartingRef.current) {
        try {
          arSystem.stop()
          console.log('[MindAR] Cleanup: arSystem.stop() called')
        } catch (e) {
          console.warn('[MindAR] cleanup arSystem.stop() failed:', e)
        }
      } else if (isRestartingRef.current) {
        console.log('[MindAR] Cleanup: skipping stop() because restart in progress')
      }

      observer?.disconnect()
      window.removeEventListener('resize', styleCameraFeed)
      targetEntity?.removeEventListener('targetFound', handleTargetFound)
      targetEntity?.removeEventListener('targetLost', handleTargetLost)
      document.removeEventListener('touchend', handleUserGesture)
      document.removeEventListener('click', handleUserGesture)
    }
  }, [targetImageUrl, chromaKeyColor, flatView])

  return (
    <>
      {/* 커스텀 로딩 화면 */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
          <div className="mb-6">
            <img
              src={targetImageUrl}
              alt="타겟 이미지"
              className="h-40 w-40 rounded-xl border-4 border-white/30 object-cover shadow-2xl"
            />
          </div>
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
          <p className="text-lg font-medium text-white">AR 준비 중...</p>
          <p className="mt-2 text-sm text-white/70">카메라 권한을 허용해주세요</p>
        </div>
      )}

      {/* 스피커 토글 버튼 */}
      <button
        onClick={handleToggleMute}
        className="fixed top-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/70 active:scale-95"
        aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
      >
        <SpeakerIcon muted={isMuted} />
      </button>

      {/* HD 로딩 표시기 */}
      {previewVideoUrl && !isHDReady && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400"></div>
          <span>HD 로딩 중...</span>
        </div>
      )}
      {previewVideoUrl && isHDReady && !debugMode && (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
          <div className="h-2 w-2 rounded-full bg-green-400"></div>
          <span>HD</span>
        </div>
      )}

      {/* 디버그 패널 */}
      {debugMode && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 p-4 text-white backdrop-blur-sm">
          <div className="mx-auto max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">디버그 모드</span>
              {previewVideoUrl && (
                <span className={`text-xs px-2 py-0.5 rounded ${isHDReady ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  {isHDReady ? 'HD' : 'Preview'}
                </span>
              )}
            </div>

            {/* 떨림 보정 토글 */}
            <div className="flex items-center justify-between">
              <span className="text-sm">떨림 보정 (Stabilization)</span>
              <button
                onClick={() => setStabilizationEnabled(!stabilizationEnabled)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  stabilizationEnabled
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {stabilizationEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 필터 파라미터 */}
            {stabilizationEnabled && (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>filterMinCF (낮을수록 부드러움)</span>
                    <span className="font-mono">{filterMinCF}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0001"
                    max="0.1"
                    step="0.0001"
                    value={filterMinCF}
                    onChange={(e) => setFilterMinCF(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>filterBeta (높을수록 반응 빠름)</span>
                    <span className="font-mono">{filterBeta}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={filterBeta}
                    onChange={(e) => setFilterBeta(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </>
            )}

            <p className="text-xs text-gray-400">
              * 실시간 반영됨
            </p>
          </div>
        </div>
      )}

      <a-scene
        className='h-full w-full'
        style={{ width: '100%', height: '100%' }}
        ref={sceneRef}
        mindar-image={`imageTargetSrc: ${mindUrl}; autoStart: false; uiLoading: no; uiError: no; uiScanning: no; cameraResolution: ${cameraResolution};${stabilizationEnabled ? ` filterMinCF: ${filterMinCF}; filterBeta: ${filterBeta};` : ''}${highPrecision ? ' warmupTolerance: 2; missTolerance: 8;' : ''}`}
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
            src={currentVideoUrl}
            loop
            crossOrigin='anonymous'
            playsInline
            webkit-playsinline='true'
            muted={isMuted}
            preload='auto'
            autoPlay
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
              chromakey-material={`src: #ar-video; color: ${chromaKeyColor}`}
              {...(flatView ? { billboard: '' } : {})}
            ></a-plane>
          ) : (
            <a-video
              src='#ar-video'
              position='0 0 0'
              height='1'
              width='1'
              rotation='0 0 0'
              loop='true'
              muted={isMuted ? 'true' : 'false'}
              autoplay='true'
              playsinline='true'
              {...(flatView ? { billboard: '' } : {})}
            ></a-video>
          )}
        </a-entity>
      </a-scene>
    </>
  )
}

export default MindARViewer
