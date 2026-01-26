# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AR Generator 프론트엔드 - React 기반 AR 콘텐츠 생성 웹 애플리케이션. 사용자가 타겟 이미지와 동영상을 업로드하면 MindAR을 사용해 이미지 타겟을 컴파일하고, QR 코드를 생성하여 AR 경험을 공유할 수 있습니다.

## Tech Stack

- React 18 + TypeScript
- Create React App
- MindAR (이미지 타겟 컴파일 및 AR 뷰어)
- A-Frame (WebXR)
- ffmpeg.wasm (클라이언트 사이드 비디오 압축)

## Commands

```bash
npm install              # 의존성 설치
npm start                # 개발 서버 (HTTP)
npm run start-https      # 개발 서버 (HTTPS, 모바일 테스트용)
npm run build            # 프로덕션 빌드
npm test                 # 테스트 실행
```

## Project Structure

```
src/
├── components/
│   ├── MindARCompiler.tsx      # 이미지 → .mind 파일 컴파일 (레거시)
│   ├── MindarViewer.tsx        # AR 뷰어 (MindAR + A-Frame)
│   ├── BasicModeViewer.tsx     # 기본 모드 뷰어 (카메라 + 비디오 오버레이)
│   ├── VideoPositionEditor.tsx # 기본 모드 비디오 위치/크기 편집
│   ├── PasswordModal.tsx       # 관리자 비밀번호 입력 모달
│   ├── Home.tsx                # 메인 업로드 페이지
│   ├── TargetImageUpload.tsx   # 타겟 이미지 업로드 UI
│   └── home/                   # Home 페이지 하위 컴포넌트
│       ├── ModeSelector.tsx        # AR/기본 모드 선택 UI
│       ├── ArOptionsSection.tsx    # AR 옵션 설정 (추적 정확도 등)
│       ├── VideoUploadSection.tsx  # 비디오 업로드 UI
│       ├── PublishSection.tsx      # 발행 버튼 섹션
│       ├── StepIndicator.tsx       # 단계 표시기
│       └── ...                     # 기타 UI 컴포넌트
├── pages/
│   ├── CreateProjectPage.tsx   # 프로젝트 생성 페이지
│   ├── EditProjectPage.tsx     # 프로젝트 편집 페이지
│   └── ProjectListPage.tsx     # 프로젝트 목록 페이지
├── hooks/
│   ├── useVideoCompressor.ts   # ffmpeg.wasm 비디오 압축 훅
│   └── useImageCompiler.ts     # 이미지 타겟 컴파일 훅
├── lib/
│   └── image-target/           # 커스텀 MindAR 라이브러리 (카메라 해상도 수정)
├── types/
│   └── project.ts              # Project 타입 정의 (mode, videoPosition 등)
├── MindARViewerPage.tsx        # AR/기본 모드 뷰어 라우팅 페이지
└── App.tsx                     # 라우팅
e2e/
└── app.spec.ts                 # Playwright E2E 테스트
vendor/
└── mind-ar/                    # 로컬 MindAR 패키지 (npm link)
```

## Key Components

### MindARCompiler
- 브라우저에서 이미지를 `.mind` 파일로 컴파일 (CPU 집약적)
- MindAR의 `Compiler` 클래스 사용

### MindarViewer
- A-Frame 기반 AR 뷰어 (AR 모드용)
- 커스텀 컴포넌트:
  - `billboard`: flatView 모드에서 비디오가 항상 카메라를 향함
  - `chromakey-material`: 크로마키(그린스크린) 제거 셰이더

### BasicModeViewer
- 기본 모드 뷰어 (타겟 이미지 없이 카메라에 비디오 오버레이)
- 카메라 피드 위에 비디오를 지정된 위치/크기로 표시
- Canvas 2D 기반 크로마키 처리 (WebGL 없이)
- HD 비디오 백그라운드 프리로드 지원

### VideoPositionEditor
- 기본 모드에서 비디오 위치/크기 편집 UI
- 비디오 영역 드래그로 위치 이동 (패닝)
- 우하단 모서리 드래그 핸들로 크기 조절
- 슬라이더 및 +/- 버튼으로도 크기 조절 가능
- 실시간 카메라 프리뷰 배경
- File 또는 URL 소스 지원 (편집 시 기존 영상 사용 가능)

### useVideoCompressor Hook
- ffmpeg.wasm을 사용한 클라이언트 사이드 비디오 압축
- UMD 빌드 사용 (`@ffmpeg/core@0.12.6/dist/umd`)
- 압축 설정: 480p, CRF 35, ultrafast preset, 64kbps 오디오
- AR 뷰어에서 프리뷰 먼저 로드 후 HD로 전환

### useImageCompiler Hook
- 이미지 파일을 `.mind` 파일로 컴파일하는 훅
- `compile(files, options)` 함수 제공
- `highPrecision` 옵션: 추적 정확도 향상 (컴파일 시간 증가)
- 진행률(progress)과 상태(isCompiling) 제공

## Environment Variables

```
REACT_APP_API_URL=http://localhost:4000  # 백엔드 API URL
```

## Project Modes

### AR 모드 (기본)
- 타겟 이미지를 인식하면 영상이 재생되는 전통적인 AR 경험
- `.mind` 파일 컴파일 필요
- MindAR + A-Frame 기반
- 옵션: flatView, highPrecision, chromaKey

### 기본 모드
- 타겟 이미지 없이 카메라 화면에 바로 비디오 표시
- `.mind` 파일 불필요 (컴파일 시간 절약)
- 순수 WebRTC + CSS Transform 기반
- 사용자가 비디오 위치/크기를 드래그로 조정
- 옵션: chromaKey만 지원 (flatView, highPrecision 불필요)

## AR Viewer Features

### Preview Video (프리뷰 영상)
1. 업로드 시 클라이언트에서 480p로 압축
2. AR 뷰어 진입 시 프리뷰 먼저 재생 (빠른 로딩)
3. 백그라운드에서 HD 영상 로드
4. HD 준비 완료 시 자동 전환

### Flat View (Billboard)
- `flatView: true` 설정 시 활성화
- 비디오가 타겟 이미지 각도와 관계없이 항상 카메라를 향함
- 매 프레임 카메라 쿼터니언을 계산하여 적용

### Chroma Key
- WebGL 셰이더로 실시간 색상 키잉
- HEX 색상 코드로 키 색상 지정 (예: #00FF00)
- similarity, smoothness 파라미터 조절 가능

### High Precision Tracking (추적 정확도 향상)
- `highPrecision: true` 설정 시 활성화
- 컴파일 시 더 많은 특징점 추출 (컴파일 시간 증가)
- 복잡한 이미지나 저조도 환경에서 추적 안정성 향상

## Technical Notes

- 비디오 크기 제한: 32MB
- 타겟 이미지 비율이 AR 오버레이에 보존됨
- MindAR 컴파일은 클라이언트에서 실행 (서버 부하 없음)
- ffmpeg.wasm은 UMD 빌드 사용 (ESM 모듈 문제 회피)
- 카메라 해상도: 1920x1080 (Full HD) - `src/lib/image-target/aframe.js`에서 설정
- 프로젝트 생성/편집/삭제 시 관리자 비밀번호 필요 (`X-Admin-Password` 헤더)
- 발행 시 컴파일+업로드가 한 번에 실행됨 (1-click flow)

## Testing

```bash
npm test                           # 전체 유닛 테스트
npm test -- --testPathPattern=useVideoCompressor  # 특정 테스트
npm run test:e2e                   # E2E 테스트 (Playwright)
npm run test:e2e:ui                # E2E 테스트 UI 모드
```

주요 테스트 파일:
- `useVideoCompressor.test.tsx` - 압축 훅 테스트
- `useImageCompiler.test.tsx` - 이미지 컴파일 훅 테스트
- `MindarViewer.test.tsx` - AR 뷰어 테스트
- `Home.test.tsx` - 업로드 페이지 테스트
- `TargetImageUpload.test.tsx` - 타겟 이미지 업로드 테스트
- `CreateProjectPage.test.tsx` - 프로젝트 생성 페이지 테스트
- `e2e/app.spec.ts` - E2E 테스트 (Playwright)
