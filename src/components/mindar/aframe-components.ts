/**
 * A-Frame 커스텀 컴포넌트 등록
 * - billboard: flatView 모드에서 오브젝트가 항상 카메라를 향하도록 함
 * - chromakey-material: 크로마키(그린스크린) 제거 셰이더
 */

declare const AFRAME: any

// billboard 컴포넌트 (flatView용)
export function registerBillboardComponent() {
  if (typeof AFRAME === 'undefined' || AFRAME.components['billboard']) return

  AFRAME.registerComponent('billboard', {
    init: function () {
      // GC 압박 방지: Quaternion 객체 사전 할당 (매 프레임 new 방지)
      this._cameraQuaternion = new AFRAME.THREE.Quaternion()
      this._parentQuaternion = new AFRAME.THREE.Quaternion()
    },
    tick: function () {
      const camera = this.el.sceneEl?.camera
      if (!camera) return

      const object3D = this.el.object3D
      if (!object3D) return

      // 사전 할당된 객체 재사용
      camera.getWorldQuaternion(this._cameraQuaternion)

      // 부모의 world quaternion을 역으로 적용하여 로컬 회전 계산
      const parent = object3D.parent
      if (parent) {
        parent.getWorldQuaternion(this._parentQuaternion)
        this._parentQuaternion.invert()
        this._cameraQuaternion.premultiply(this._parentQuaternion)
      }

      object3D.quaternion.copy(this._cameraQuaternion)
    },
  })
}

// 크로마키 셰이더
const CHROMAKEY_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const CHROMAKEY_FRAGMENT_SHADER = `
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
`

// 크로마키 머티리얼 컴포넌트
export function registerChromakeyMaterialComponent() {
  if (typeof AFRAME === 'undefined' || AFRAME.components['chromakey-material']) return

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

      const THREE = AFRAME.THREE

      // VideoTexture 생성
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
        vertexShader: CHROMAKEY_VERTEX_SHADER,
        fragmentShader: CHROMAKEY_FRAGMENT_SHADER,
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
      // 비디오가 재생 중일 때만 텍스처 갱신 (불필요한 GPU 업로드 방지)
      const video = this.data.src as HTMLVideoElement | null
      if (!video || video.paused || video.ended) return

      if (this.material?.uniforms?.src?.value) {
        this.material.uniforms.src.value.needsUpdate = true
      }
    },
    remove: function () {
      if (this.material) {
        // 텍스처도 함께 dispose (GPU 메모리 누수 방지)
        if (this.material.uniforms?.src?.value) {
          this.material.uniforms.src.value.dispose()
        }
        this.material.dispose()
      }
    },
  })
}

// 모든 A-Frame 컴포넌트 등록
export function registerAllAFrameComponents() {
  registerBillboardComponent()
  registerChromakeyMaterialComponent()
}
