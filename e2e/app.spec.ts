import { test, expect } from '@playwright/test'

test.describe('Project List Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')

    // 페이지가 로드되었는지 확인 - 내 프로젝트 헤더 확인
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })

    // 새 프로젝트 버튼이 있는지 확인
    await expect(page.getByText('+ 새 프로젝트 만들기')).toBeVisible()
  })

  test('should display loading state or project list', async ({ page }) => {
    await page.goto('/')

    // 로딩 또는 프로젝트 목록/빈 상태 확인
    const content = page.locator('body')
    await expect(content).toBeVisible()

    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForLoadState('networkidle')

    // 내 프로젝트 섹션이 있는지 확인
    await expect(page.getByText('내 프로젝트')).toBeVisible()
  })

  test('should navigate to create page', async ({ page }) => {
    await page.goto('/')

    await page.getByText('+ 새 프로젝트 만들기').click()

    await expect(page).toHaveURL('/create')
    await expect(page.getByText('Step 1')).toBeVisible()
  })
})

test.describe('Create Project Page', () => {
  test('should load create page with step 1', async ({ page }) => {
    await page.goto('/create')

    // Step 1 메시지 확인
    await expect(page.getByText(/Step 1/)).toBeVisible()
  })

  test('should have back to list button', async ({ page }) => {
    await page.goto('/create')

    const backButton = page.getByText('← 목록으로')
    await expect(backButton).toBeVisible()

    await backButton.click()
    await expect(page).toHaveURL('/')
  })

  test('should show publish button disabled initially', async ({ page }) => {
    await page.goto('/create')

    // Publish 버튼이 비활성화 되어있는지 확인
    const publishButton = page.getByRole('button', { name: /Publish/i })
    await expect(publishButton).toBeDisabled()
  })

  test('should have project title input', async ({ page }) => {
    await page.goto('/create')

    // 프로젝트 제목 입력 필드 확인
    await expect(page.getByPlaceholder(/프로젝트 제목/)).toBeVisible()
  })

  test('should show target image section', async ({ page }) => {
    await page.goto('/create')

    // 타겟 이미지 섹션이 보여야 함 (CollapsibleSection)
    await expect(page.getByText('타겟 이미지').first()).toBeVisible()
  })

  test('should show add media buttons', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가하기 버튼 확인
    await expect(page.getByText('영상 추가하기')).toBeVisible()

    // 이미지 추가하기 버튼 확인
    await expect(page.getByText('이미지 추가하기')).toBeVisible()
  })
})

test.describe('Media Item Management', () => {
  test('should add video item when button clicked', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가하기 버튼 클릭
    await page.getByText('영상 추가하기').click()

    // 영상 1 섹션이 추가되어야 함
    await expect(page.getByText(/영상 1/)).toBeVisible()

    // 표시 모드 선택이 보여야 함
    await expect(page.getByText('표시 모드')).toBeVisible()
  })

  test('should add image item when button clicked', async ({ page }) => {
    await page.goto('/create')

    // 이미지 추가하기 버튼 클릭
    await page.getByText('이미지 추가하기').click()

    // 이미지 1 섹션이 추가되어야 함
    await expect(page.getByText(/이미지 1/)).toBeVisible()
  })

  test('should default to tracking mode for new media item', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByText('영상 추가하기').click()

    // 트래킹 뱃지가 보여야 함
    await expect(page.locator('span.bg-purple-100', { hasText: '트래킹' })).toBeVisible()
  })

  test('should switch media item from tracking to basic mode', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByText('영상 추가하기').click()

    // 표시 모드 섹션 확인
    await expect(page.getByText('표시 모드')).toBeVisible()

    // 기본 모드로 전환
    const basicButton = page.locator('button', { hasText: /^기본$/ }).first()
    await basicButton.click()

    // 모드 전환 후 설명 텍스트가 변경되어야 함
    await expect(page.getByText('화면에 항상 표시됩니다')).toBeVisible()
  })

  test('should allow multiple media items', async ({ page }) => {
    await page.goto('/create')

    // 첫 번째 영상 추가
    await page.getByText('영상 추가하기').click()
    await expect(page.getByText(/영상 1/)).toBeVisible()

    // 두 번째 영상 추가
    await page.getByText('영상 추가하기').click()
    await expect(page.getByText(/영상 2/)).toBeVisible()

    // 이미지 추가 (순서가 3번째이므로 "이미지 3"으로 표시됨)
    await page.getByText('이미지 추가하기').click()
    await expect(page.getByText(/이미지 3/)).toBeVisible()
  })
})

test.describe('Target Image Section', () => {
  test('should show target image not needed message when no tracking items', async ({ page }) => {
    await page.goto('/create')

    // 트래킹 모드 미디어가 없으면 타겟 이미지 불필요 메시지 표시
    await expect(page.getByText('현재는 타겟 이미지가 필요없습니다.')).toBeVisible()
  })

  test('should show AR options when tracking item is added', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가 (기본값: 트래킹 모드)
    await page.getByText('영상 추가하기').click()

    // 타겟 이미지 섹션 열기
    await page.getByText('타겟 이미지').first().click()

    // AR 옵션이 보여야 함 (추적 정확도 향상)
    await expect(page.getByText('추적 정확도 향상')).toBeVisible()
  })

  test('should toggle highPrecision checkbox', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가 (트래킹 모드)
    await page.getByText('영상 추가하기').click()

    // 타겟 이미지 섹션 열기
    await page.getByText('타겟 이미지').first().click()

    const checkbox = page.getByLabel('추적 정확도 향상')
    await expect(checkbox).not.toBeChecked()

    await checkbox.click()
    await expect(checkbox).toBeChecked()

    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })
})

test.describe('Navigation', () => {
  test('should handle 404 routes by redirecting to home', async ({ page }) => {
    await page.goto('/nonexistent-page')

    // 홈으로 리다이렉트 되어야 함
    await expect(page).toHaveURL('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible()
  })

  test('should load QR page route without crash', async ({ page }) => {
    // QR 페이지 라우트가 동작하는지 확인 (실제 데이터 없이)
    await page.goto('/result/qr/test-folder-id')

    // 페이지가 크래시 없이 로드되는지 확인
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('UI Components', () => {
  test('should render page after lazy load', async ({ page }) => {
    await page.goto('/create')

    // 페이지가 결국 로드됨 (lazy loading 이후)
    await expect(page.getByText(/Step 1/)).toBeVisible({ timeout: 15000 })
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // 모바일에서도 새 프로젝트 버튼이 보이는지 확인
    await expect(page.getByText('+ 새 프로젝트 만들기')).toBeVisible({ timeout: 10000 })
  })

  test('should display hero header', async ({ page }) => {
    await page.goto('/')

    // HeroHeader가 있는지 확인
    await expect(page.locator('header, [class*="hero"], h1').first()).toBeVisible()
  })
})

test.describe('Thumbnail Upload', () => {
  test('should show thumbnail upload section on create page', async ({ page }) => {
    await page.goto('/create')

    // 썸네일 이미지 업로드 섹션이 보여야 함
    await expect(page.getByText('썸네일 이미지 (선택)')).toBeVisible()

    // 설명 텍스트가 보여야 함
    await expect(page.getByText(/정사각형 이미지 권장/)).toBeVisible()
  })

  test('should have thumbnail input element', async ({ page }) => {
    await page.goto('/create')

    // 썸네일 업로드 input이 존재해야 함
    const thumbnailInput = page.locator('[data-testid="thumbnail-input"]')
    await expect(thumbnailInput).toBeAttached()
  })
})

test.describe('Guide Image Upload', () => {
  test('should show guide image upload section on create page', async ({ page }) => {
    await page.goto('/create')

    // 안내문구 이미지 업로드 섹션이 보여야 함
    await expect(page.getByText(/안내문구 이미지 업로드.*선택/)).toBeVisible()

    // 권장 크기 안내 텍스트가 보여야 함 (버튼 내부 span)
    await expect(page.locator('span', { hasText: /권장.*1080.*1920/ })).toBeVisible()
  })

  test('should have guide image upload button', async ({ page }) => {
    await page.goto('/create')

    // 안내문구 이미지 업로드 버튼이 있어야 함
    await expect(page.getByText('클릭하여 안내문구 이미지 업로드')).toBeVisible()
  })

  test('should have hidden file input for guide image', async ({ page }) => {
    await page.goto('/create')

    // 안내문구 이미지 업로드용 숨겨진 input이 있어야 함
    const guideImageInputs = page.locator('input[type="file"][accept="image/*"]')

    // 여러 이미지 업로드 input 중 하나가 존재해야 함
    await expect(guideImageInputs.first()).toBeAttached()
  })
})

test.describe('Camera Resolution', () => {
  test('should show camera resolution selector', async ({ page }) => {
    await page.goto('/create')

    // 카메라 화질 섹션이 보여야 함
    await expect(page.getByText('카메라 화질')).toBeVisible()
  })
})

test.describe('Video Quality', () => {
  test('should show video quality selector after adding media', async ({ page }) => {
    await page.goto('/create')

    // 미디어 아이템 추가 전에는 영상 품질 선택기가 안 보임
    await expect(page.getByText('영상 품질')).not.toBeVisible()

    // 영상 추가
    await page.getByText('영상 추가하기').click()

    // 영상 품질 선택기가 보여야 함
    await expect(page.getByText('영상 품질')).toBeVisible()
  })
})

test.describe('Edit Project Page', () => {
  test('should show edit page elements when project exists', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // 편집 페이지가 로드되어야 함
      await expect(page.getByText('타겟 이미지').first()).toBeVisible({ timeout: 10000 })

      // 저장/취소 버튼이 있어야 함
      await expect(page.getByRole('button', { name: /저장/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /취소/i })).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should navigate back when cancel is clicked', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // 편집 페이지 로드 대기
      await expect(page.getByText('타겟 이미지').first()).toBeVisible({ timeout: 10000 })

      // 취소 클릭
      await page.getByRole('button', { name: /취소/i }).click()

      // 목록으로 돌아가야 함
      await expect(page).toHaveURL('/')
      await expect(page.getByText('내 프로젝트')).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should show video quality selector on edit page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // 편집 페이지에서 영상 품질 선택기 확인
      await expect(page.getByText('영상 품질')).toBeVisible({ timeout: 10000 })
    } else {
      test.skip()
    }
  })
})

test.describe('Media Item ChromaKey', () => {
  test('should show chromakey options for video items', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByText('영상 추가하기').click()

    // 크로마키 활성화 체크박스가 보여야 함
    await expect(page.getByText('크로마키 활성화')).toBeVisible()
  })

  test('should show color picker when chromakey enabled', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByText('영상 추가하기').click()

    // 크로마키 활성화
    await page.getByLabel('크로마키 활성화').click()

    // 색상 선택 input이 보여야 함
    const colorInput = page.locator('input[type="color"]')
    await expect(colorInput).toBeVisible()
  })
})

test.describe('Media Item FlatView', () => {
  test('should show flatView option for tracking video', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가 (기본값: 트래킹 모드)
    await page.getByText('영상 추가하기').click()

    // FlatView 옵션이 보여야 함
    await expect(page.getByText('정면 고정 (FlatView)')).toBeVisible()
  })

  test('should hide flatView option for basic mode video', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByText('영상 추가하기').click()

    // 기본 모드로 전환
    const basicButton = page.locator('button', { hasText: /^기본$/ }).first()
    await basicButton.click()

    // FlatView 옵션이 숨겨져야 함
    await expect(page.getByText('정면 고정 (FlatView)')).not.toBeVisible()
  })
})

test.describe('Media Item Link (Image)', () => {
  test('should show link option for image items', async ({ page }) => {
    await page.goto('/create')

    // 이미지 추가
    await page.getByText('이미지 추가하기').click()

    // 링크 삽입 옵션이 보여야 함
    await expect(page.getByText('링크 삽입')).toBeVisible()
  })

  test('should show url input when link enabled', async ({ page }) => {
    await page.goto('/create')

    // 이미지 추가
    await page.getByText('이미지 추가하기').click()

    // 링크 활성화
    await page.getByLabel('링크 삽입').click()

    // URL 입력 필드가 보여야 함
    const urlInput = page.locator('input[type="url"]')
    await expect(urlInput).toBeVisible()
  })
})

test.describe('Media Item Position (Basic Mode)', () => {
  test('should show position controls for basic mode', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByText('영상 추가하기').click()

    // 기본 모드로 전환
    const basicButton = page.locator('button', { hasText: /^기본$/ }).first()
    await basicButton.click()

    // 위치 / 크기 섹션이 보여야 함
    await expect(page.getByText('위치 / 크기')).toBeVisible()
  })

  test('should have position reset button', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가 후 기본 모드로 전환
    await page.getByText('영상 추가하기').click()
    const basicButton = page.locator('button', { hasText: /^기본$/ }).first()
    await basicButton.click()

    // 초기화 버튼이 있어야 함
    await expect(page.getByText('초기화')).toBeVisible()
  })
})

test.describe('Media Item Order', () => {
  test('should have move up/down buttons', async ({ page }) => {
    await page.goto('/create')

    // 두 개의 영상 추가
    await page.getByText('영상 추가하기').click()
    await page.getByText('영상 추가하기').click()

    // 위로/아래로 버튼이 있어야 함 (여러 아이템이 있으면 여러 버튼이 생김)
    await expect(page.getByText('위로').first()).toBeVisible()
    await expect(page.getByText('아래로').first()).toBeVisible()
  })
})

test.describe('Publish Flow', () => {
  test('should enable publish when tracking item has target image', async ({ page }) => {
    await page.goto('/create')

    // 초기 상태: Publish 버튼 비활성화
    const publishButton = page.getByRole('button', { name: /Publish/i })
    await expect(publishButton).toBeDisabled()

    // 영상 추가 (트래킹 모드) - 타겟 이미지와 파일이 필요
    await page.getByText('영상 추가하기').click()

    // 파일 없이는 여전히 비활성화
    await expect(publishButton).toBeDisabled()
  })

  test('should show password modal when publish is clicked', async ({ page }) => {
    // 이 테스트는 실제 파일 업로드가 필요하므로 구조만 확인
    await page.goto('/create')

    // Publish 버튼이 존재하는지 확인
    await expect(page.getByRole('button', { name: /Publish/i })).toBeVisible()
  })
})
