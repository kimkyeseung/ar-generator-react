/**
 * MindAR 씬 관리 훅
 * A-Frame 씬 초기화, 타겟 이벤트, 카메라 피드 스타일링, 탭 전환 처리 등
 */

import { useEffect, useRef } from 'react'
import { MindARScene, MindARSystem } from './types'

declare const DeviceMotionEvent: any
declare const DeviceOrientationEvent: any

interface UseMindARSceneProps {
  sceneRef: React.RefObject<MindARScene | null>
  targetImageUrl: string
  onLoadingComplete: () => void
  onMainVideoReady: () => void
  onVideoResolutionChange: (resolution: string) => void
}

export function useMindARScene({
  sceneRef,
  targetImageUrl,
  onLoadingComplete,
  onMainVideoReady,
  onVideoResolutionChange,
}: UseMindARSceneProps) {
  const isRestartingRef = useRef(false)

  useEffect(() => {
    const sceneEl = sceneRef.current
    if (!sceneEl) return

    const containerEl = sceneEl.parentElement as HTMLElement | null
    let arSystem: MindARSystem | null = null

    const targetEntity = sceneEl.querySelector<HTMLElement>('[mindar-image-target]')

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

      for (let i = 0; i < allVideos.length; i++) {
        const video = allVideos[i]
        try {
          video.currentTime = 0
          await video.play()
          console.log(`[MindAR] Video ${video.id} playing - Resolution: ${video.videoWidth}x${video.videoHeight}`)
        } catch (e) {
          console.warn(`[MindAR] targetFound -> play() error for ${video.id}`, e)
          video.play().catch(() => {})
        }
      }

      // 메인 비디오 해상도 보고
      const mainVideo = sceneEl.querySelector<HTMLVideoElement>('#ar-video')
      if (mainVideo) {
        const resolution = `${mainVideo.videoWidth}x${mainVideo.videoHeight}`
        onVideoResolutionChange(resolution)
      }
    }

    const handleTargetLost = () => {
      console.log('[MindAR] targetLost')
      // 모든 AR 비디오 일시정지
      const allVideos = sceneEl.querySelectorAll<HTMLVideoElement>('video[id^="ar-video"]')
      allVideos.forEach((video) => {
        video.pause()
        console.log(`[MindAR] Video ${video.id} paused`)
      })
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
      // 모든 AR 비디오 요소 가져오기
      const allVideos = Array.from(sceneEl.querySelectorAll<HTMLVideoElement>('video[id^="ar-video"]'))
      if (allVideos.length === 0) {
        console.warn('[MindAR] No video elements found')
        return
      }

      // 첫 번째 비디오가 이미 로드되었으면 상태 업데이트
      const firstVideo = allVideos[0]
      if (firstVideo && firstVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        console.log('[MindAR] First video already loaded at renderstart, readyState:', firstVideo.readyState)
        onMainVideoReady()
      }

      // 모든 비디오 재생 시도
      allVideos.forEach((videoEl) => {
        void videoEl.play().catch((err) => {
          console.warn(`[MindAR] video ${videoEl.id} autoplay blocked`, err)
        })
      })
    }

    // ==================== iOS 권한 요청 ====================
    const requestIOSPermissions = async () => {
      try {
        if (typeof DeviceMotionEvent?.requestPermission === 'function') {
          await DeviceMotionEvent.requestPermission()
        }
        if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
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

    document.addEventListener('touchend', handleUserGesture)
    document.addEventListener('click', handleUserGesture)

    // ==================== 렌더 시작 ====================
    const handleRenderStart = () => {
      arSystem = sceneEl.systems['mindar-image-system'] ?? null
      arSystem?.start()

      ensureVideoPlayback()
      styleCameraFeed()
      updateVideoPlaneFromTargetImage()
      onLoadingComplete()
    }

    sceneEl.addEventListener('renderstart', handleRenderStart)

    // ==================== 탭 전환 시 카메라 재시작 ====================
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
            try {
              arSystem.stop()
            } catch (stopErr) {
              console.warn('[MindAR] arSystem.stop() failed (may already be stopped):', stopErr)
            }

            await new Promise((r) => setTimeout(r, 500))

            console.log('[MindAR] Calling arSystem.start()...')
            arSystem.start()
            console.log('[MindAR] arSystem.start() called')

            await new Promise((r) => setTimeout(r, 1500))
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
        // 모든 AR 비디오 일시정지 및 음소거
        const allVideos = sceneEl.querySelectorAll<HTMLVideoElement>('video[id^="ar-video"]')
        allVideos.forEach((video) => {
          video.pause()
          video.muted = true
          console.log(`[MindAR] Video ${video.id} paused and muted`)
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ==================== 클린업 ====================
    return () => {
      console.log('[MindAR] Cleanup called, isRestarting:', isRestartingRef.current)
      sceneEl.removeEventListener('renderstart', handleRenderStart)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (arSystem && !isRestartingRef.current) {
        try {
          arSystem.stop()
          console.log('[MindAR] Cleanup: arSystem.stop() called')
        } catch (e) {
          console.warn('[MindAR] cleanup arSystem.stop() failed:', e)
        }
      }

      observer?.disconnect()
      window.removeEventListener('resize', styleCameraFeed)
      window.removeEventListener('orientationchange', handleOrientationChange)
      targetEntity?.removeEventListener('targetFound', handleTargetFound)
      targetEntity?.removeEventListener('targetLost', handleTargetLost)
      document.removeEventListener('touchend', handleUserGesture)
      document.removeEventListener('click', handleUserGesture)
    }
  }, [sceneRef, targetImageUrl, onLoadingComplete, onMainVideoReady, onVideoResolutionChange])

  return { isRestartingRef }
}
