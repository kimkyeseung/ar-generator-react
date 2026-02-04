/* eslint-disable no-undef */
import { Controller, UI } from './index.js'

const needsDOMRefresh =
  document.readyState === 'complete' || document.readyState == 'interactive'
AFRAME.registerSystem('mindar-image-system', {
  container: null,
  video: null,
  processingImage: false,

  init: function () {
    this.anchorEntities = []
  },

  tick: function () {},

  setup: function ({
    imageTargetSrc,
    maxTrack,
    showStats,
    uiLoading,
    uiScanning,
    uiError,
    missTolerance,
    warmupTolerance,
    filterMinCF,
    filterBeta,
    cameraResolution,
  }) {
    this.imageTargetSrc = imageTargetSrc
    this.maxTrack = maxTrack
    this.filterMinCF = filterMinCF
    this.filterBeta = filterBeta
    this.missTolerance = missTolerance
    this.warmupTolerance = warmupTolerance
    this.showStats = showStats
    this.cameraResolution = cameraResolution || 'fhd'
    console.log(`[MindAR Setup] cameraResolution received: "${cameraResolution}" -> using: "${this.cameraResolution}"`)
    this.ui = new UI({ uiLoading, uiScanning, uiError })
  },

  registerAnchor: function (el, targetIndex) {
    this.anchorEntities.push({ el: el, targetIndex: targetIndex })
  },

  start: function () {
    this.container = this.el.sceneEl.parentNode

    if (this.showStats) {
      this.mainStats = new Stats()
      this.mainStats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
      this.mainStats.domElement.style.cssText =
        'position:absolute;top:0px;left:0px;z-index:999'
      this.container.appendChild(this.mainStats.domElement)
    }

    this.ui.showLoading()
    this._startVideo()
  },

  switchTarget: function (targetIndex) {
    this.controller.interestedTargetIndex = targetIndex
  },

  stop: function () {
    this.pause()
    const tracks = this.video.srcObject.getTracks()
    tracks.forEach(function (track) {
      track.stop()
    })
    this.video.remove()
    this.controller.dispose()
  },

  pause: function (keepVideo = false) {
    if (!keepVideo) {
      this.video.pause()
    }
    this.controller.stopProcessVideo()
  },

  unpause: function () {
    this.video.play()
    this.controller.processVideo(this.video)
  },

  _startVideo: function () {
    this.video = document.createElement('video')

    this.video.setAttribute('autoplay', '')
    this.video.setAttribute('muted', '')
    this.video.setAttribute('playsinline', '')
    this.video.style.position = 'absolute'
    this.video.style.top = '0px'
    this.video.style.left = '0px'
    this.video.style.zIndex = '-2'
    this.container.appendChild(this.video)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // TODO: show unsupported error
      this.el.emit('arError', { error: 'VIDEO_FAIL' })
      this.ui.showCompatibility()
      return
    }

    // 해상도 설정에 따른 카메라 크기 (iPhone 브라우저 최대 FHD 지원)
    // 기존 프로젝트가 다른 해상도를 가지고 있어도 fallback으로 fhd 사용
    const resolutionMap = {
      'fhd': { width: 1920, height: 1080 },
      'hd': { width: 1280, height: 720 },
    }
    const { width: cameraWidth, height: cameraHeight } = resolutionMap[this.cameraResolution] || resolutionMap['fhd']
    console.log(`[MindAR Camera] Requested resolution: ${this.cameraResolution} (${cameraWidth}x${cameraHeight})`)

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: 'environment',
          width: { ideal: cameraWidth, max: cameraWidth },
          height: { ideal: cameraHeight, max: cameraHeight },
        },
      })
      .then((stream) => {
        this.video.addEventListener('loadedmetadata', () => {
          console.log(`[MindAR Camera] Resolution: ${this.video.videoWidth}x${this.video.videoHeight}`)
          this.video.setAttribute('width', this.video.videoWidth)
          this.video.setAttribute('height', this.video.videoHeight)
          this._startAR()
        })
        this.video.srcObject = stream
      })
      .catch((err) => {
        console.log('getUserMedia error', err)
        this.el.emit('arError', { error: 'VIDEO_FAIL' })
      })
  },

  _startAR: async function () {
    const video = this.video
    const container = this.container

    // 트래킹 해상도 제한 - 가로/세로 모드 모두 지원
    // 가장 긴 변이 1920 이하면 그대로 사용 (세로 모드 1080x1920도 OK)
    const MAX_DIMENSION = 1920

    let trackingWidth, trackingHeight
    const maxDimension = Math.max(video.videoWidth, video.videoHeight)

    if (maxDimension > MAX_DIMENSION) {
      // 긴 변 기준으로 비율 유지하며 축소
      const scale = MAX_DIMENSION / maxDimension
      trackingWidth = Math.round(video.videoWidth * scale)
      trackingHeight = Math.round(video.videoHeight * scale)
    } else {
      // 1920 이하면 카메라 해상도 그대로 사용
      trackingWidth = video.videoWidth
      trackingHeight = video.videoHeight
    }

    console.log(`[MindAR] Camera: ${video.videoWidth}x${video.videoHeight}, Tracking: ${trackingWidth}x${trackingHeight}, Ratio: ${(video.videoWidth/trackingWidth).toFixed(2)}x`)

    // _resize에서 사용할 수 있도록 저장
    this.trackingWidth = trackingWidth
    this.trackingHeight = trackingHeight

    this.controller = new Controller({
      inputWidth: trackingWidth,
      inputHeight: trackingHeight,
      maxTrack: this.maxTrack,
      filterMinCF: this.filterMinCF,
      filterBeta: this.filterBeta,
      missTolerance: this.missTolerance,
      warmupTolerance: this.warmupTolerance,
      onUpdate: (data) => {
        if (data.type === 'processDone') {
          if (this.mainStats) this.mainStats.update()
        } else if (data.type === 'updateMatrix') {
          const { targetIndex, worldMatrix } = data

          for (let i = 0; i < this.anchorEntities.length; i++) {
            if (this.anchorEntities[i].targetIndex === targetIndex) {
              this.anchorEntities[i].el.updateWorldMatrix(worldMatrix)
            }
          }

          let isAnyVisible = this.anchorEntities.reduce((acc, entity) => {
            return acc || entity.el.el.object3D.visible
          }, false)
          if (isAnyVisible) {
            this.ui.hideScanning()
          } else {
            this.ui.showScanning()
          }
        }
      },
    })

    this._resize()
    window.addEventListener('resize', this._resize.bind(this))
    // 모바일 가로/세로 전환 시 orientationchange 이벤트 핸들링
    window.addEventListener('orientationchange', () => {
      // 레이아웃이 업데이트될 시간을 주고 리사이즈 실행
      setTimeout(() => this._resize(), 100)
    })

    const { dimensions: imageTargetDimensions } =
      await this.controller.addImageTargets(this.imageTargetSrc)

    for (let i = 0; i < this.anchorEntities.length; i++) {
      const { el, targetIndex } = this.anchorEntities[i]
      if (targetIndex < imageTargetDimensions.length) {
        el.setupMarker(imageTargetDimensions[targetIndex])
      }
    }

    await this.controller.dummyRun(this.video)
    this.el.emit('arReady')
    this.ui.hideLoading()
    this.ui.showScanning()

    this.controller.processVideo(this.video)
  },

  _resize: function () {
    const video = this.video
    const container = this.container

    // 초기화 전에 호출되는 경우 무시
    if (!this.controller || !video || !container) {
      return
    }

    let vw, vh // display css width, height
    const videoRatio = video.videoWidth / video.videoHeight
    const containerRatio = container.clientWidth / container.clientHeight
    if (videoRatio > containerRatio) {
      vh = container.clientHeight
      vw = vh * videoRatio
    } else {
      vw = container.clientWidth
      vh = vw / videoRatio
    }

    const proj = this.controller.getProjectionMatrix()

    // MindAR의 proj[5]는 고정된 45° FOV 기준으로 계산됨 (≈2.414, 해상도 무관)
    // proj[5] = 1 / tan(22.5°) = 상수
    // 따라서 트래킹 해상도와 비디오 해상도의 비율 조정은 불필요
    //
    // FOV 공식: 비디오가 컨테이너에 어떻게 맞춰지는지에 따라 조정
    // - vh == container.clientHeight → fov ≈ 45°
    // - vh > container.clientHeight → fov < 45° (비디오 일부만 보임)
    const fov =
      (2 * Math.atan((1 / proj[5] / vh) * container.clientHeight) * 180) /
      Math.PI // vertical fov
    const near = proj[14] / (proj[10] - 1.0)
    const far = proj[14] / (proj[10] + 1.0)
    const ratio = proj[5] / proj[0] // (r-l) / (t-b)
    //console.log("loaded proj: ", proj, ". fov: ", fov, ". near: ", near, ". far: ", far, ". ratio: ", ratio);
    const newAspect = container.clientWidth / container.clientHeight
    const cameraEle = container.getElementsByTagName('a-camera')[0]
    if (!cameraEle) {
      // A-Frame 카메라가 아직 초기화되지 않음
      return
    }
    const camera = cameraEle.getObject3D('camera')
    if (!camera) {
      // THREE.js 카메라 객체가 아직 생성되지 않음
      return
    }
    camera.fov = fov
    camera.aspect = newAspect
    camera.near = near
    camera.far = far
    camera.updateProjectionMatrix()
    //const newCam = new AFRAME.THREE.PerspectiveCamera(fov, newRatio, near, far);
    //camera.getObject3D('camera').projectionMatrix = newCam.projectionMatrix;

    const videoTop = -(vh - container.clientHeight) / 2
    const videoLeft = -(vw - container.clientWidth) / 2
    this.video.style.top = videoTop + 'px'
    this.video.style.left = videoLeft + 'px'
    this.video.style.width = vw + 'px'
    this.video.style.height = vh + 'px'

    console.log(`[MindAR _resize] Container: ${container.clientWidth}x${container.clientHeight}, Video CSS: ${vw.toFixed(0)}x${vh.toFixed(0)}, Offset: (${videoLeft.toFixed(0)}, ${videoTop.toFixed(0)}), FOV: ${fov.toFixed(1)}°`)
  },
})

AFRAME.registerComponent('mindar-image', {
  dependencies: ['mindar-image-system'],

  schema: {
    imageTargetSrc: { type: 'string' },
    maxTrack: { type: 'int', default: 1 },
    filterMinCF: { type: 'number', default: -1 },
    filterBeta: { type: 'number', default: -1 },
    missTolerance: { type: 'int', default: -1 },
    warmupTolerance: { type: 'int', default: -1 },
    showStats: { type: 'boolean', default: false },
    autoStart: { type: 'boolean', default: true },
    uiLoading: { type: 'string', default: 'yes' },
    uiScanning: { type: 'string', default: 'yes' },
    uiError: { type: 'string', default: 'yes' },
    cameraResolution: { type: 'string', default: 'fhd' },
  },

  init: function () {
    const arSystem = this.el.sceneEl.systems['mindar-image-system']

    arSystem.setup({
      imageTargetSrc: this.data.imageTargetSrc,
      maxTrack: this.data.maxTrack,
      filterMinCF: this.data.filterMinCF === -1 ? null : this.data.filterMinCF,
      filterBeta: this.data.filterBeta === -1 ? null : this.data.filterBeta,
      missTolerance:
        this.data.missTolerance === -1 ? null : this.data.missTolerance,
      warmupTolerance:
        this.data.warmupTolerance === -1 ? null : this.data.warmupTolerance,
      showStats: this.data.showStats,
      uiLoading: this.data.uiLoading,
      uiScanning: this.data.uiScanning,
      uiError: this.data.uiError,
      cameraResolution: this.data.cameraResolution,
    })
    if (this.data.autoStart) {
      this.el.sceneEl.addEventListener('renderstart', () => {
        arSystem.start()
      })
    }
  },
  remove: function () {
    const arSystem = this.el.sceneEl.systems['mindar-image-system']
    arSystem.stop()
  },
})

AFRAME.registerComponent('mindar-image-target', {
  dependencies: ['mindar-image-system'],

  schema: {
    targetIndex: { type: 'number' },
  },

  postMatrix: null, // rescale the anchor to make width of 1 unit = physical width of card

  init: function () {
    const arSystem = this.el.sceneEl.systems['mindar-image-system']
    arSystem.registerAnchor(this, this.data.targetIndex)

    this.invisibleMatrix = new AFRAME.THREE.Matrix4().set(
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    )

    const root = this.el.object3D
    root.visible = false
    root.matrixAutoUpdate = false

    root.matrix = this.invisibleMatrix

    // GC 압박 방지: Matrix4 객체 사전 할당 (매 프레임 new 방지)
    this._worldMatrix = new AFRAME.THREE.Matrix4()
  },

  setupMarker([markerWidth, markerHeight]) {
    const position = new AFRAME.THREE.Vector3()
    const quaternion = new AFRAME.THREE.Quaternion()
    const scale = new AFRAME.THREE.Vector3()
    position.x = markerWidth / 2
    position.y = markerWidth / 2 + (markerHeight - markerWidth) / 2
    scale.x = markerWidth
    scale.y = markerWidth
    scale.z = markerWidth
    this.postMatrix = new AFRAME.THREE.Matrix4()
    this.postMatrix.compose(position, quaternion, scale)
  },

  updateWorldMatrix(worldMatrix) {
    this.el.emit('targetUpdate')
    if (!this.el.object3D.visible && worldMatrix !== null) {
      this.el.emit('targetFound')
    } else if (this.el.object3D.visible && worldMatrix === null) {
      this.el.emit('targetLost')
    }

    this.el.object3D.visible = worldMatrix !== null
    if (worldMatrix === null) {
      this.el.object3D.matrix = this.invisibleMatrix
      return
    }
    // 사전 할당된 Matrix4 재사용 (GC 압박 방지)
    this._worldMatrix.elements = worldMatrix
    this._worldMatrix.multiply(this.postMatrix)
    this.el.object3D.matrix = this._worldMatrix
  },
})
/*
This is a hack.
If the user's browser has cached A-Frame,
then A-Frame will process the webpage *before* the system and components get registered.
Resulting in a blank page. This happens because module loading is deferred. 
*/
/* if(needsDOMRefresh){
  console.log("mindar-face-aframe::Refreshing DOM...")
  document.body.innerHTML=document.body.innerHTML;
} */
