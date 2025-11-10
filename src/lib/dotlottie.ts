import { strFromU8, unzipSync } from 'fflate'

export type DotLottieAnimation = {
  animationData: any
  width: number
  height: number
}

export function parseDotLottie(buffer: ArrayBuffer): DotLottieAnimation {
  const archive = unzipSync(new Uint8Array(buffer))
  const manifestRaw = archive['manifest.json']

  if (!manifestRaw) {
    throw new Error('manifest.json을 찾을 수 없습니다.')
  }

  const manifest = JSON.parse(strFromU8(manifestRaw))
  const animations: Array<{ id?: string; name?: string }> =
    manifest?.animations ?? []
  if (animations.length === 0) {
    throw new Error('manifest에 애니메이션 정보가 없습니다.')
  }

  const animationId = animations[0]?.id || animations[0]?.name
  if (!animationId) {
    throw new Error('애니메이션 ID를 확인할 수 없습니다.')
  }

  const animationPath = `animations/${animationId}.json`
  const animationRaw = archive[animationPath]
  if (!animationRaw) {
    throw new Error(`${animationPath} 파일을 찾을 수 없습니다.`)
  }

  const animationData = JSON.parse(strFromU8(animationRaw))
  const width = animationData.w ?? 1
  const height = animationData.h ?? 1
  return { animationData, width, height }
}
