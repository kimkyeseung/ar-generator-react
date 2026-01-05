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
│   ├── MindARCompiler.tsx    # 이미지 → .mind 파일 컴파일
│   ├── MindarViewer.tsx      # AR 뷰어 (MindAR + A-Frame)
│   ├── PasswordModal.tsx     # 관리자 비밀번호 입력 모달
│   ├── Home.tsx              # 메인 업로드 페이지
│   └── VideoUploadSection.tsx # 비디오 업로드 UI
├── pages/
│   ├── CreateProjectPage.tsx # 프로젝트 생성 페이지
│   ├── EditProjectPage.tsx   # 프로젝트 편집 페이지
│   └── ProjectListPage.tsx   # 프로젝트 목록 페이지
├── hooks/
│   └── useVideoCompressor.ts # ffmpeg.wasm 비디오 압축 훅
├── lib/
│   └── image-target/         # 커스텀 MindAR 라이브러리 (카메라 해상도 수정)
├── MindARViewerPage.tsx      # AR 뷰어 페이지
└── App.tsx                   # 라우팅
vendor/
└── mind-ar/                  # 로컬 MindAR 패키지 (npm link)
```

## Key Components

### MindARCompiler
- 브라우저에서 이미지를 `.mind` 파일로 컴파일 (CPU 집약적)
- MindAR의 `Compiler` 클래스 사용

### MindarViewer
- A-Frame 기반 AR 뷰어
- 커스텀 컴포넌트:
  - `billboard`: flatView 모드에서 비디오가 항상 카메라를 향함
  - `chromakey-material`: 크로마키(그린스크린) 제거 셰이더

### useVideoCompressor Hook
- ffmpeg.wasm을 사용한 클라이언트 사이드 비디오 압축
- UMD 빌드 사용 (`@ffmpeg/core@0.12.6/dist/umd`)
- 압축 설정: 480p, CRF 35, ultrafast preset, 64kbps 오디오
- AR 뷰어에서 프리뷰 먼저 로드 후 HD로 전환

## Environment Variables

```
REACT_APP_API_URL=http://localhost:4000  # 백엔드 API URL
```

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

## Technical Notes

- 비디오 크기 제한: 32MB
- 타겟 이미지 비율이 AR 오버레이에 보존됨
- MindAR 컴파일은 클라이언트에서 실행 (서버 부하 없음)
- ffmpeg.wasm은 UMD 빌드 사용 (ESM 모듈 문제 회피)
- 카메라 해상도: 1920x1080 (Full HD) - `src/lib/image-target/aframe.js`에서 설정
- 프로젝트 생성/편집/삭제 시 관리자 비밀번호 필요 (`X-Admin-Password` 헤더)

## Testing

```bash
npm test                           # 전체 테스트
npm test -- --testPathPattern=useVideoCompressor  # 특정 테스트
```

주요 테스트 파일:
- `useVideoCompressor.test.tsx` - 압축 훅 테스트
- `MindarViewer.test.tsx` - AR 뷰어 테스트
- `Home.test.tsx` - 업로드 페이지 테스트
