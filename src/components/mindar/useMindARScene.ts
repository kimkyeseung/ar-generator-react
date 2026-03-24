/**
 * MindAR 씬 관리 훅
 * A-Frame 씬 초기화, 타겟 이벤트, 카메라 피드 스타일링, 탭 전환 처리 등
 */

import { useEffect, useRef } from 'react'
import { MindARScene, MindARSystem } from './types'

declare const DeviceMotionEvent: any
declare const DeviceOrientationEvent: any

// iOS 권한 요청 Promise (모듈 레벨 - 페이지당 1회만 요청, 에러 시 재시도 가능)
let iosPermissionPromise: Promise<boolean> | null = null

interface UseMindARSceneProps {
  sceneRef: React.RefObject<MindARScene | null>
  targetImageUrl: string
  isMutedRef: React.RefObject<boolean>
  onLoadingComplete: () => void
  onArReady: () => void
  onVideoResolutionChange: (resolution: string) => void
}

export function useMindARScene({
  sceneRef,
  targetImageUrl,
  isMutedRef,
  onLoadingComplete,
  onArReady,
  onVideoResolutionChange,
}: UseMindARSceneProps) {
  const isRestartingRef = useRef(false)

  useEffect(() => {
    let isMounted = true
    const sceneEl = sceneRef.current
    if (!sceneEl) return

    const containerEl = sceneEl.parentElement as HTMLElement | null
    let arSystem: MindARSystem | null = null
    let restartSafetyTimer: ReturnType<typeof setTimeout> | null = null

    const targetEntity = sceneEl.querySelector<HTMLElement>('[mindar-image-target]')

    // ==================== iOS 권한 요청 ====================
    const requestIOSPermissions = async (): Promise<boolean> => {
      // 이미 진행 중이거나 완료된 요청이 있으면 동일 Promise 반환
      if (iosPermissionPromise) return iosPermissionPromise

      iosPermissionPromise = (async () => {
        try {
          let allGranted = true

          if (typeof DeviceMotionEvent?.requestPermission === 'function') {
            const motionResult = await DeviceMotionEvent.requestPermission()
            if (motionResult !== 'granted') {
              console.warn('[MindAR] DeviceMotion permission not granted:', motionResult)
              allGranted = false
            }
          }
          if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
            const orientationResult = await DeviceOrientationEvent.requestPermission()
            if (orientationResult !== 'granted') {
              console.warn('[MindAR] DeviceOrientation permission not granted:', orientationResult)
              allGranted = false
            }
          }

          console.log(`[MindAR] iOS motion/orientation permission ${allGranted ? 'granted' : 'partially denied'}`)
          return allGranted
        } catch (e) {
          console.warn('[MindAR] iOS permission denied or unavailable', e)
          // 에러 시 Promise 초기화하여 재시도 가능
          iosPermissionPromise = null
          return false
        }
      })()

      return iosPermissionPromise
    }

    // ==================== 비디오 재생 재시도 로직 ====================
    const playVideoWithRetry = async (video: HTMLVideoElement, maxRetries = 3): Promise<boolean> => {
      // 첫 시도는 사용자 설정 존중, 실패 시 muted 폴백
      const preferredMuted = isMutedRef.current ?? true
      let useMuted = preferredMuted

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          video.muted = useMuted
          video.currentTime = 0
          await video.play()
          console.log(`[MindAR] Video ${video.id} playing (attempt ${attempt}, muted=${video.muted})`)
          return true
        } catch (e) {
          // unmuted 재생 실패 시 muted로 폴백 (iOS: 유저 제스처 없이 unmuted 재생 불가)
          if (!useMuted) {
            console.log(`[MindAR] Video ${video.id} unmuted play failed, falling back to muted`)
            useMuted = true
            continue
          }
          if (attempt < maxRetries) {
            console.log(`[MindAR] Video ${video.id} play attempt ${attempt} failed, retrying...`)
            await new Promise(r => setTimeout(r, 100))
          } else {
            console.warn(`[MindAR] Video ${video.id} play failed after ${maxRetries} attempts:`, e)
          }
        }
      }
      return false
    }

    // ==================== 타겟 이미지 비율로 비디오 plane 크기 설정 ====================
    const updateVideoPlaneFromTargetImage = () => {
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

    // ==================== 타겟 이벤트 핸들러 ====================
    const handleTargetFound = async () => {
      console.log('[MindAR] targetFound')

      // 모든 AR 비디오 요소 가져오기 (메인 + 추가 tracking 비디오)
      const allVideos = Array.from(sceneEl.querySelectorAll<HTMLVideoElement>('video[id^="ar-video"]'))
      console.log(`[MindAR] Found ${allVideos.length} video(s) to play`)

      // 모든 비디오를 병렬로 처리
      // targetLost에서 비디오를 pause하지 않으므로 대부분 이미 재생 중
      // play() 호출 최소화로 iOS 자동재생 정책 문제 방지
      const preferredMuted = isMutedRef.current ?? true
      await Promise.all(allVideos.map(async (video) => {
        // muted 상태 동기화 및 처음부터 재생
        video.muted = preferredMuted
        video.currentTime = 0

        if (video.paused) {
          // 초기 로드 등으로 아직 재생 시작 전인 경우에만 play() 호출
          const success = await playVideoWithRetry(video, 3)
          if (success) {
            console.log(`[MindAR] Video ${video.id} started - Resolution: ${video.videoWidth}x${video.videoHeight}`)
          }
        } else {
          console.log(`[MindAR] Video ${video.id} reset to start, synced muted=${preferredMuted}`)
        }
      }))

      // 메인 비디오 해상도 보고
      const mainVideo = sceneEl.querySelector<HTMLVideoElement>('#ar-video') ||
        allVideos.find(v => v.id.startsWith('ar-video'))
      if (mainVideo) {
        const resolution = `${mainVideo.videoWidth}x${mainVideo.videoHeight}`
        onVideoResolutionChange(resolution)
      }
    }

    const handleTargetLost = () => {
      console.log('[MindAR] targetLost')
      // 비디오를 pause하지 않음 - MindAR이 entity를 자동으로 숨김
      // pause → play 사이클을 피해 iOS 자동재생 정책 문제 및
      // 오디오 디코더 재초기화로 인한 영상 멈춤 방지
    }

    targetEntity?.addEventListener('targetFound', handleTargetFound)
    targetEntity?.addEventListener('targetLost', handleTargetLost)

    // ==================== 카메라 피드 스타일링 ====================
    const getCameraFeed = () => {
      if (!containerEl) return null
      return Array.from(containerEl.querySelectorAll<HTMLVideoElement>('video')).find(
        (videoEl) => !sceneEl.contains(videoEl)
      ) ?? null
    }

    const styleCameraFeed = () => {
      const cameraFeed = getCameraFeed()
      if (!cameraFeed) return

      // MindAR의 aframe.js _resize() 함수가 정확한 위치/크기를 계산함
      // 여기서는 최소한의 스타일만 설정
      cameraFeed.style.position = 'absolute'
      cameraFeed.style.zIndex = '-1'
      cameraFeed.style.transform = ''
    }

    const observer = containerEl ? new MutationObserver(styleCameraFeed) : null
    if (observer && containerEl) {
      observer.observe(containerEl, { childList: true, subtree: true })
    }

    window.addEventListener('resize', styleCameraFeed)

    const handleOrientationChange = () => {
      setTimeout(styleCameraFeed, 100)
    }
    window.addEventListener('orientationchange', handleOrientationChange)

    // ==================== 비디오 재생 보장 ====================
    const ensureVideoPlayback = () => {
      const allVideos = Array.from(sceneEl.querySelectorAll<HTMLVideoElement>('video[id^="ar-video"]'))
      if (allVideos.length === 0) {
        console.warn('[MindAR] No video elements found')
        return
      }

      // 모든 비디오 재생 시도 (로드 카운팅은 JSX onLoadedData에서 처리)
      allVideos.forEach((videoEl) => {
        void videoEl.play().catch((err) => {
          console.warn(`[MindAR] video ${videoEl.id} autoplay blocked`, err)
        })
      })
    }

    // ==================== 사용자 제스처 핸들러 ====================
    const handleUserGesture = async () => {
      console.log('[MindAR] User gesture detected, requesting permissions and playing videos')

      await requestIOSPermissions()

      // 사용자 제스처 후 모든 비디오 재생/음소거 해제 시도
      const preferredMuted = isMutedRef.current ?? true
      const allVideos = Array.from(sceneEl.querySelectorAll<HTMLVideoElement>('video[id^="ar-video"]'))
      for (const video of allVideos) {
        if (video.paused) {
          await playVideoWithRetry(video, 1) // 제스처 후에는 1회만 시도
        } else if (video.muted !== preferredMuted) {
          // 이미 재생 중이지만 muted 상태가 사용자 설정과 다른 경우 동기화
          // (autoplay 정책으로 muted fallback된 비디오를 제스처 후 unmute)
          video.muted = preferredMuted
          console.log(`[MindAR] Video ${video.id} unmuted after user gesture`)
        }
      }

      document.removeEventListener('touchend', handleUserGesture)
      document.removeEventListener('click', handleUserGesture)
    }

    document.addEventListener('touchend', handleUserGesture, { passive: true })
    document.addEventListener('click', handleUserGesture, { passive: true })

    // ==================== 렌더 시작 ====================
    const handleRenderStart = () => {
      arSystem = sceneEl.systems['mindar-image-system'] ?? null
      arSystem?.start()

      ensureVideoPlayback()
      styleCameraFeed()
      updateVideoPlaneFromTargetImage()
      // renderstart에서 로딩 화면 해제 (카메라 피드 + 가이드 이미지 먼저 표시)
      onLoadingComplete()
    }

    // arReady: mind 파일 다운로드 + 컴파일 + GPU 워밍업 완료 시점
    const handleArReady = () => {
      console.log('[MindAR] arReady - AR fully initialized')
      onArReady()
    }

    sceneEl.addEventListener('renderstart', handleRenderStart)
    sceneEl.addEventListener('arReady', handleArReady)

    // ==================== 탭 전환 시 카메라 재시작 ====================
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (isRestartingRef.current) {
          console.log('[MindAR] Already restarting, skipping...')
          return
        }

        isRestartingRef.current = true
        console.log('[MindAR] Tab became visible, restarting AR system...')

        // 안전 타임아웃: 5초 후 강제 리셋 (stuck 방지)
        restartSafetyTimer = setTimeout(() => {
          if (isRestartingRef.current) {
            console.warn('[MindAR] Restart safety timeout, forcing reset')
            isRestartingRef.current = false
          }
        }, 5000)

        if (arSystem) {
          try {
            try {
              arSystem.stop()
            } catch (stopErr) {
              console.warn('[MindAR] arSystem.stop() failed (may already be stopped):', stopErr)
            }

            await new Promise((r) => setTimeout(r, 500))
            if (!isMounted) return

            console.log('[MindAR] Calling arSystem.start()...')
            arSystem.start()
            console.log('[MindAR] arSystem.start() called')

            await new Promise((r) => setTimeout(r, 1500))
            if (!isMounted) return

            styleCameraFeed()
            console.log('[MindAR] AR system restart completed')
          } catch (e) {
            console.error('[MindAR] Failed to restart AR system', e)
          } finally {
            if (restartSafetyTimer) clearTimeout(restartSafetyTimer)
            restartSafetyTimer = null
            isRestartingRef.current = false
          }
        } else {
          console.warn('[MindAR] arSystem is null, cannot restart')
          if (restartSafetyTimer) clearTimeout(restartSafetyTimer)
          restartSafetyTimer = null
          isRestartingRef.current = false
        }
      } else {
        console.log('[MindAR] Tab became hidden')
        // 모든 AR 비디오 일시정지 (음소거 상태는 유지 - 사용자 설정 존중)
        const allVideos = sceneEl.querySelectorAll<HTMLVideoElement>('video[id^="ar-video"]')
        allVideos.forEach((video) => {
          video.pause()
          console.log(`[MindAR] Video ${video.id} paused`)
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ==================== 클린업 ====================
    return () => {
      isMounted = false
      console.log('[MindAR] Cleanup called, isRestarting:', isRestartingRef.current)

      sceneEl.removeEventListener('renderstart', handleRenderStart)
      sceneEl.removeEventListener('arReady', handleArReady)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // 안전 타이머 정리
      if (restartSafetyTimer) {
        clearTimeout(restartSafetyTimer)
        restartSafetyTimer = null
      }

      // 컴포넌트 언마운트 시 항상 arSystem 정지 시도
      if (arSystem) {
        try {
          arSystem.stop()
          console.log('[MindAR] Cleanup: arSystem.stop() called')
        } catch (e) {
          console.warn('[MindAR] cleanup arSystem.stop() failed:', e)
        }
      }
      isRestartingRef.current = false

      observer?.disconnect()
      window.removeEventListener('resize', styleCameraFeed)
      window.removeEventListener('orientationchange', handleOrientationChange)
      targetEntity?.removeEventListener('targetFound', handleTargetFound)
      targetEntity?.removeEventListener('targetLost', handleTargetLost)
      document.removeEventListener('touchend', handleUserGesture)
      document.removeEventListener('click', handleUserGesture)
    }
  }, [sceneRef, targetImageUrl, onLoadingComplete, onArReady, onVideoResolutionChange])

  return { isRestartingRef }
}
