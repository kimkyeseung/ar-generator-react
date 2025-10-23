import React, { useEffect, useRef } from 'react'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import * as THREE from 'three'

type MindARAnchor = {
  group: THREE.Group
}

type MindARThreeInstance = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  addAnchor: (targetIndex: number) => MindARAnchor
  start: () => Promise<void>
  stop: () => Promise<void>
}

const MindARThreeViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const containerEl = containerRef.current
    if (!containerEl) {
      return undefined
    }

    const mindarThree = new MindARThree({
      container: containerEl,
      imageTargetSrc: '/targets.mind',
    }) as MindARThreeInstance
    const { renderer, scene, camera } = mindarThree
    const anchor = mindarThree.addAnchor(0)
    const geometry = new THREE.PlaneGeometry(1, 0.55)
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
    })
    const plane = new THREE.Mesh(geometry, material)
    anchor.group.add(plane)

    mindarThree.start()
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera)
    })

    return () => {
      renderer.setAnimationLoop(null)
      void mindarThree.stop()
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%' }} ref={containerRef}></div>
  )
}

export default MindARThreeViewer
