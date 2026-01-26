# AR기본모드 구현 계획

> **CRITICAL INSTRUCTIONS**: 각 페이즈 완료 후:
> 1. 완료된 체크박스를 체크하세요
> 2. 품질 게이트 검증 명령어 실행
> 3. 모든 품질 게이트 항목 통과 확인
> 4. "Last Updated" 날짜 업데이트
> 5. Notes 섹션에 학습 내용 문서화
> 6. 그 후에만 다음 페이즈 진행
>
> **DO NOT** skip quality gates or proceed with failing checks

**Created**: 2025-01-26
**Last Updated**: 2025-01-26
**Status**: Planning
**Estimated Scope**: Medium (5 phases, 10-15 hours)

---

## Overview

### 목표
타겟 이미지 없이 카메라 화면 중앙에 업로드한 영상을 바로 띄우는 "AR기본모드" 기능 구현.

### 핵심 기능
1. **기본모드 선택**: 프로젝트 생성 시 AR모드(기존) vs 기본모드 선택
2. **위치/크기 조정**: 드래그 & 핀치 제스처로 비디오 위치 및 크기 설정
3. **미리보기**: 실시간 카메라 + 비디오 오버레이로 설정 확인
4. **크로마키 지원**: 기본모드에서도 크로마키 기능 사용 가능

### 아키텍처 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| 뷰어 컴포넌트 | `BasicModeViewer.tsx` 신규 생성 | MindAR 없이 순수 WebRTC + CSS Transform |
| 편집 UI | 드래그 & 핀치 제스처 | 모바일 친화적, 직관적 |
| 미리보기 | 실시간 카메라 + 오버레이 | 실제 결과물과 동일한 경험 |
| 데이터 저장 | Project 타입에 `mode`, `videoPosition`, `videoScale` 추가 | 기존 구조 확장 |

---

## Phase Breakdown

### Phase 1: 데이터 모델 및 모드 선택 UI (2-3시간)

**Goal**: 프로젝트 타입 확장 및 모드 선택 UI 구현

**Test Strategy**:
- Unit tests: Project 타입 확장, 모드 선택 컴포넌트
- Coverage target: 80%

**Tasks (TDD)**:

**RED - 테스트 작성**:
- [ ] `src/types/project.ts` 타입 확장 테스트 작성
  - `mode: 'ar' | 'basic'` 필드
  - `videoPosition: { x: number, y: number }` 필드 (기본모드용)
  - `videoScale: number` 필드 (기본모드용)
- [ ] `ModeSelector.test.tsx` 작성
  - 모드 선택 UI 렌더링
  - AR모드/기본모드 전환 이벤트

**GREEN - 구현**:
- [ ] `src/types/project.ts` 타입 확장
- [ ] `src/components/home/ModeSelector.tsx` 생성
  - AR모드 / 기본모드 선택 카드 UI
  - 각 모드 설명 표시
- [ ] `CreateProjectPage.tsx`에 ModeSelector 통합
  - 기본모드 선택 시 타겟 이미지 업로드 건너뛰기

**REFACTOR**:
- [ ] 공통 스타일 추출
- [ ] 접근성 개선 (aria-labels)

**Quality Gate**:
- [ ] 프로젝트 빌드 성공
- [ ] 모든 기존 테스트 통과
- [ ] 새 테스트 통과
- [ ] 린트 통과

**Dependencies**: 없음

---

### Phase 2: 비디오 위치/크기 편집 컴포넌트 (3-4시간)

**Goal**: 드래그 & 핀치 제스처로 비디오 위치/크기 조정 UI 구현

**Test Strategy**:
- Unit tests: 제스처 핸들러, 상태 관리
- Integration tests: 드래그/핀치 동작
- Coverage target: 75%

**Tasks (TDD)**:

**RED - 테스트 작성**:
- [ ] `VideoPositionEditor.test.tsx` 작성
  - 초기 위치/크기 렌더링
  - 드래그 이벤트로 위치 변경
  - 핀치 이벤트로 크기 변경
  - 위치/크기 범위 제한

**GREEN - 구현**:
- [ ] `src/components/VideoPositionEditor.tsx` 생성
  - 카메라 배경 위에 비디오 오버레이
  - 터치/마우스 드래그로 위치 이동
  - 핀치 줌(모바일) / 마우스 휠(데스크탑)로 크기 조정
  - 경계 제한: 화면 밖으로 이동 불가
- [ ] 실시간 카메라 프리뷰 연동
  - `navigator.mediaDevices.getUserMedia()` 활용
  - 편집 중 카메라 피드 표시

**REFACTOR**:
- [ ] 제스처 로직 커스텀 훅으로 분리 (`useGesture.ts`)
- [ ] 성능 최적화 (throttle/debounce)

**Quality Gate**:
- [ ] 프로젝트 빌드 성공
- [ ] 모든 테스트 통과
- [ ] 모바일/데스크탑 제스처 동작 확인
- [ ] 60fps 유지 (성능)

**Dependencies**: Phase 1

---

### Phase 3: BasicModeViewer 컴포넌트 (3-4시간)

**Goal**: MindAR 없이 카메라 화면에 비디오 오버레이하는 뷰어 구현

**Test Strategy**:
- Unit tests: 뷰어 렌더링, 비디오 재생
- Integration tests: 카메라 + 비디오 통합
- Coverage target: 70%

**Tasks (TDD)**:

**RED - 테스트 작성**:
- [ ] `BasicModeViewer.test.tsx` 작성
  - 카메라 피드 표시
  - 비디오 오버레이 위치/크기 적용
  - 크로마키 적용
  - 음소거 토글

**GREEN - 구현**:
- [ ] `src/components/BasicModeViewer.tsx` 생성
  - 카메라 피드 획득 및 표시
  - 비디오 오버레이 (CSS transform으로 위치/크기 적용)
  - 크로마키 셰이더 (Canvas 2D 또는 WebGL)
  - 사운드 토글 버튼
- [ ] 모바일 최적화
  - 후면 카메라 기본 선택
  - 전체화면 레이아웃
  - iOS/Android 호환성

**REFACTOR**:
- [ ] 카메라 로직 커스텀 훅 분리 (`useCamera.ts`)
- [ ] 크로마키 로직 분리

**Quality Gate**:
- [ ] 프로젝트 빌드 성공
- [ ] 모든 테스트 통과
- [ ] 실제 기기에서 카메라 동작 확인
- [ ] 비디오 재생 및 크로마키 동작 확인

**Dependencies**: Phase 1

---

### Phase 4: 백엔드 API 및 라우팅 통합 (2-3시간)

**Goal**: 기본모드 프로젝트 저장/조회 및 뷰어 페이지 라우팅

**Test Strategy**:
- Integration tests: API 호출, 라우팅
- E2E tests: 전체 플로우
- Coverage target: 70%

**Tasks (TDD)**:

**RED - 테스트 작성**:
- [ ] 기본모드 프로젝트 업로드 API 테스트
- [ ] 라우팅 테스트 (mode에 따라 다른 뷰어 렌더링)

**GREEN - 구현**:
- [ ] 백엔드 API 수정 (ar-generator-server)
  - `/upload` 엔드포인트에 `mode`, `videoPosition`, `videoScale` 파라미터 추가
  - 기본모드 시 `.mind` 파일 저장 건너뛰기
- [ ] `MindARViewerPage.tsx` 수정
  - `mode === 'basic'`이면 `BasicModeViewer` 렌더링
  - `mode === 'ar'`이면 기존 `MindARViewer` 렌더링
- [ ] `CreateProjectPage.tsx` 완성
  - 기본모드 선택 시 위치/크기 편집 단계 추가
  - 발행 시 mode, position, scale 전송

**REFACTOR**:
- [ ] 뷰어 선택 로직 분리

**Quality Gate**:
- [ ] 프로젝트 빌드 성공
- [ ] 모든 테스트 통과
- [ ] 기본모드 프로젝트 생성 → QR → 뷰어 전체 플로우 동작

**Dependencies**: Phase 2, Phase 3

---

### Phase 5: 편집 페이지 통합 및 마무리 (2시간)

**Goal**: 기존 프로젝트 편집 페이지에 기본모드 지원 추가 및 최종 테스트

**Test Strategy**:
- E2E tests: 전체 CRUD 플로우
- Coverage target: 전체 70% 이상

**Tasks (TDD)**:

**RED - 테스트 작성**:
- [ ] E2E 테스트: 기본모드 프로젝트 생성 → 편집 → 뷰어

**GREEN - 구현**:
- [ ] `EditProjectPage.tsx` 수정
  - 기본모드 프로젝트 편집 시 위치/크기 조정 UI 표시
  - 모드 변경 불가 (생성 시에만 선택)
- [ ] `ProjectListPage.tsx` 수정
  - 기본모드 프로젝트 뱃지 표시

**REFACTOR**:
- [ ] 중복 코드 제거
- [ ] CLAUDE.md 업데이트

**Quality Gate**:
- [ ] 프로젝트 빌드 성공
- [ ] 모든 테스트 통과
- [ ] E2E 테스트 통과
- [ ] 전체 커버리지 70% 이상

**Dependencies**: Phase 4

---

## Risk Assessment

| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|-----------|
| 모바일 제스처 호환성 | 중 | 중 | iOS/Android 실기기 테스트, fallback UI |
| 카메라 권한 거부 | 낮 | 높 | 명확한 권한 요청 UX, 에러 핸들링 |
| 크로마키 성능 | 중 | 중 | WebGL 최적화, 저사양 기기 테스트 |
| 백엔드 API 호환성 | 낮 | 중 | 기존 API 하위호환 유지 |

---

## Rollback Strategy

### Phase별 롤백

- **Phase 1**: Project 타입 변경 revert, ModeSelector 컴포넌트 삭제
- **Phase 2**: VideoPositionEditor 컴포넌트 삭제
- **Phase 3**: BasicModeViewer 컴포넌트 삭제
- **Phase 4**: 백엔드 API 변경 revert, 라우팅 원복
- **Phase 5**: 편집 페이지 변경 revert

### 전체 롤백
- 모든 기본모드 관련 코드 삭제
- Project 타입에서 `mode`, `videoPosition`, `videoScale` 제거
- 백엔드 DB에서 해당 필드 제거 (마이그레이션 필요)

---

## Quality Gate Commands

```bash
# 빌드 확인
npm run build

# 테스트 실행
npm test -- --coverage

# 린트 확인
npm run lint

# E2E 테스트
npm run test:e2e
```

---

## Notes & Learnings

*(각 페이즈 완료 후 학습 내용 기록)*

---

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 1 | 대기 | - | - | - |
| 2 | 대기 | - | - | - |
| 3 | 대기 | - | - | - |
| 4 | 대기 | - | - | - |
| 5 | 대기 | - | - | - |
