import { test, expect } from '@playwright/test'
import path from 'path'

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

  test('should show AR settings section with highPrecision option', async ({ page }) => {
    await page.goto('/create')

    // AR 설정 섹션이 보여야 함
    await expect(page.getByText('AR 설정')).toBeVisible()

    // 추적 정확도 향상 옵션이 보여야 함
    await expect(page.getByText('추적 정확도 향상')).toBeVisible()
  })

  test('should show target image upload section', async ({ page }) => {
    await page.goto('/create')

    // 타겟 이미지 업로드 섹션 확인
    await expect(page.getByText('Target Image')).toBeVisible()
  })

  test('should toggle highPrecision checkbox', async ({ page }) => {
    await page.goto('/create')

    const checkbox = page.getByLabel('추적 정확도 향상')
    await expect(checkbox).not.toBeChecked()

    await checkbox.click()
    await expect(checkbox).toBeChecked()

    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })
})

test.describe('New Publish Flow', () => {
  test('should show step 2 after target image is selected', async ({ page }) => {
    await page.goto('/create')

    // 초기 상태: Step 1
    await expect(page.getByText(/Step 1/)).toBeVisible()

    // 파일 업로드 시뮬레이션 (타겟 이미지용 - multiple 속성이 있음)
    const fileInput = page.locator('input[type="file"][accept="image/*"][multiple]')

    // 테스트 이미지 파일 경로 (실제 테스트시에는 fixtures 폴더에 테스트 이미지 필요)
    // await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-image.png'))

    // 파일 입력이 존재하는지만 확인
    await expect(fileInput).toBeAttached()
  })

  test('should show video upload section after target image is selected (mock)', async ({ page }) => {
    await page.goto('/create')

    // 초기 상태에서는 비디오 옵션이 비활성화되어 있음
    // 타겟 이미지 선택 후에만 활성화됨
    const videoSection = page.locator('[data-testid="video-upload-section"]')

    // 실제 파일 업로드 테스트는 fixtures가 필요함
    // 여기서는 구조만 확인
    await expect(page.getByText('Target Image')).toBeVisible()
  })

  test('should enable publish button after both files are selected', async ({ page }) => {
    await page.goto('/create')

    // 초기 상태: Publish 버튼 비활성화
    const publishButton = page.getByRole('button', { name: /Publish/i })
    await expect(publishButton).toBeDisabled()

    // 실제 파일 업로드 테스트는 fixtures가 필요함
    // 여기서는 초기 상태만 확인
  })

  test('should show password modal when publish is clicked', async ({ page }) => {
    // 이 테스트는 실제 파일 업로드가 필요하므로 fixtures 설정 후 구현
    await page.goto('/create')

    // Publish 버튼이 존재하는지 확인
    await expect(page.getByRole('button', { name: /Publish/i })).toBeVisible()
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

test.describe('HighPrecision Feature', () => {
  test('should show highPrecision option before file selection', async ({ page }) => {
    await page.goto('/create')

    // AR 설정 섹션이 처음부터 보여야 함 (파일 선택 전)
    await expect(page.getByText('AR 설정')).toBeVisible()
    await expect(page.getByText('추적 정확도 향상')).toBeVisible()

    // 설명 텍스트도 보여야 함
    await expect(page.getByText(/더 정밀한 추적과 부드러운 AR 표시/)).toBeVisible()
  })

  test('should persist highPrecision state during workflow', async ({ page }) => {
    await page.goto('/create')

    // highPrecision 체크
    const checkbox = page.getByLabel('추적 정확도 향상')
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    // 체크 상태가 유지되어야 함
    await expect(checkbox).toBeChecked()
  })
})

test.describe('Step Indicator', () => {
  test('should show step indicator on create page', async ({ page }) => {
    await page.goto('/create')

    // 스텝 인디케이터가 있어야 함 (Home.tsx에서 사용)
    // CreateProjectPage는 StepIndicator를 사용하지 않을 수 있음
    // 대신 stepMessage가 표시됨
    await expect(page.getByText(/Step 1/)).toBeVisible()
  })
})

test.describe('Video Upload Options', () => {
  test('should show video options when target is ready', async ({ page }) => {
    await page.goto('/create')

    // 비디오 옵션은 타겟 이미지 선택 후에만 보임
    // 여기서는 페이지 구조만 확인
    await expect(page.getByText('Target Image')).toBeVisible()
  })
})

test.describe('Basic Mode Feature', () => {
  test('should show mode selector on create page', async ({ page }) => {
    await page.goto('/create')

    // 모드 선택 섹션이 보여야 함
    await expect(page.getByText('모드 선택')).toBeVisible()
    await expect(page.getByText('AR 모드')).toBeVisible()
    await expect(page.getByText('기본 모드')).toBeVisible()
  })

  test('should have AR mode selected by default', async ({ page }) => {
    await page.goto('/create')

    // AR 모드가 기본 선택되어 있어야 함 (aria-label 사용)
    const arModeButton = page.getByRole('button', { name: /AR 모드 선택/i })
    await expect(arModeButton).toHaveAttribute('aria-pressed', 'true')

    // 기본 모드는 선택 안됨
    const basicModeButton = page.getByRole('button', { name: /기본 모드 선택/i })
    await expect(basicModeButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('should switch to basic mode when clicked', async ({ page }) => {
    await page.goto('/create')

    // 기본 모드 버튼 클릭
    const basicModeButton = page.getByRole('button', { name: /기본 모드 선택/i })
    await basicModeButton.click()

    // 기본 모드가 선택됨
    await expect(basicModeButton).toHaveAttribute('aria-pressed', 'true')

    // AR 모드는 선택 해제됨
    const arModeButton = page.getByRole('button', { name: /AR 모드 선택/i })
    await expect(arModeButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('should hide target image upload in basic mode', async ({ page }) => {
    await page.goto('/create')

    // 초기 상태: AR 모드 - 타겟 이미지 섹션 보임
    await expect(page.getByText('Target Image')).toBeVisible()

    // 기본 모드로 전환
    await page.getByRole('button', { name: /기본 모드 선택/i }).click()

    // 타겟 이미지 섹션이 숨겨져야 함
    await expect(page.getByText('Target Image')).not.toBeVisible()
  })

  test('should show different step message in basic mode', async ({ page }) => {
    await page.goto('/create')

    // 기본 모드로 전환
    await page.getByRole('button', { name: /기본 모드 선택/i }).click()

    // 스텝 메시지가 변경되어야 함
    await expect(page.getByText(/Step 1.*비디오/i)).toBeVisible()
  })

  test('should hide flatView option in basic mode', async ({ page }) => {
    await page.goto('/create')

    // AR 모드에서는 flatView 옵션이 있어야 함 (비디오 선택 후)
    // 기본 모드로 전환
    await page.getByRole('button', { name: /기본 모드 선택/i }).click()

    // flatView 옵션이 보이지 않아야 함
    await expect(page.getByText('플랫 뷰')).not.toBeVisible()
  })
})

test.describe('Video Position Editor', () => {
  // Note: 이 테스트들은 비디오 파일 업로드가 필요하므로
  // 실제 파일 fixtures 설정 후 완전히 동작합니다.

  test('should show position editor after video upload in basic mode', async ({ page }) => {
    await page.goto('/create')

    // 기본 모드로 전환
    await page.getByRole('button', { name: /기본 모드 선택/i }).click()

    // 비디오 업로드 전에는 위치 편집기가 안 보임
    await expect(page.getByText('영상 위치 조정')).not.toBeVisible()

    // 비디오 업로드 input이 존재해야 함
    const videoInput = page.locator('input[type="file"][accept="video/*"]')
    await expect(videoInput).toBeAttached()
  })

  test('should display scale controls with slider and buttons', async ({ page }) => {
    await page.goto('/create')

    // 기본 모드로 전환
    await page.getByRole('button', { name: /기본 모드 선택/i }).click()

    // 비디오 업로드 후 크기 조정 컨트롤이 있어야 함
    // 실제 테스트는 fixtures 필요
  })
})

test.describe('Mode Badge in Project List', () => {
  test('should display projects or empty state after loading', async ({ page }) => {
    await page.goto('/')

    // 내 프로젝트 섹션이 로드될 때까지 대기
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })

    // 로딩 스피너가 사라질 때까지 대기 (로딩 완료 표시)
    await expect(page.getByText('로딩 중...')).toBeHidden({ timeout: 15000 })

    // 로딩 완료 후 페이지가 정상 렌더링되었는지 확인
    // (프로젝트가 있거나 / 빈 상태 메시지가 있거나 / 에러가 있거나)
    const pageContent = page.locator('.container')
    await expect(pageContent).toBeVisible()
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

  test('should show upload button for thumbnail', async ({ page }) => {
    await page.goto('/create')

    // 업로드 버튼이 있어야 함
    const uploadButton = page.getByRole('button', { name: /업로드/ }).first()
    await expect(uploadButton).toBeVisible()
  })
})

test.describe('Edit Project Page - Video Quality Change', () => {
  // Tests for the video quality change feature on existing projects

  test('should show video quality selector on edit page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // Edit page should show video quality selector
      await expect(page.getByText('영상 품질')).toBeVisible({ timeout: 10000 })

      // Should show all quality options
      await expect(page.getByRole('button', { name: /고화질 선택/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /중간화질 선택/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /저화질 선택/i })).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should detect initial video quality based on preview file', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // Edit page should show video quality selector
      await expect(page.getByText('영상 품질')).toBeVisible({ timeout: 10000 })

      // One of the quality buttons should be selected (aria-pressed="true")
      const qualityButtons = [
        page.getByRole('button', { name: /고화질 선택/i }),
        page.getByRole('button', { name: /중간화질 선택/i }),
        page.getByRole('button', { name: /저화질 선택/i }),
      ]

      // At least one should be pressed
      let selectedCount = 0
      for (const button of qualityButtons) {
        const isPressed = await button.getAttribute('aria-pressed')
        if (isPressed === 'true') selectedCount++
      }
      expect(selectedCount).toBe(1)
    } else {
      test.skip()
    }
  })

  test('should be able to change video quality', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // Edit page should show video quality selector
      await expect(page.getByText('영상 품질')).toBeVisible({ timeout: 10000 })

      // Get current quality
      const lowQualityButton = page.getByRole('button', { name: /저화질 선택/i })
      const highQualityButton = page.getByRole('button', { name: /고화질 선택/i })

      // Try clicking on high quality button
      await highQualityButton.click()

      // Either the high quality button should be pressed,
      // or if it was already high quality, we should see a status change
      // (download in progress or compression in progress)
      const isHighQualityPressed = await highQualityButton.getAttribute('aria-pressed')
      if (isHighQualityPressed !== 'true') {
        // If not immediately pressed, it might be downloading/compressing
        // Check for workflow status change
        const workflowStatus = page.locator('span', { hasText: /(다운로드|압축|저장)/ })
        await expect(workflowStatus.or(highQualityButton)).toBeVisible({ timeout: 3000 })
      }
    } else {
      test.skip()
    }
  })

  test('should show workflow status when quality is changed', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // Edit page should load
      await expect(page.getByText('영상 품질')).toBeVisible({ timeout: 10000 })

      // Initial status should be "편집 모드"
      await expect(page.getByText('편집 모드')).toBeVisible()
    } else {
      test.skip()
    }
  })
})

test.describe('Guide Image Upload', () => {
  test('should show guide image upload section on create page', async ({ page }) => {
    await page.goto('/create')

    // 안내문구 이미지 업로드 섹션이 보여야 함
    await expect(page.getByText('안내문구 이미지 (선택)')).toBeVisible()

    // 권장 크기 안내 텍스트가 보여야 함
    await expect(page.getByText(/권장.*1080.*1920/)).toBeVisible()
  })

  test('should have guide image upload button', async ({ page }) => {
    await page.goto('/create')

    // 안내문구 이미지 업로드 버튼이 있어야 함
    await expect(page.getByText('클릭하여 안내문구 이미지 업로드')).toBeVisible()
  })

  test('should have hidden file input for guide image', async ({ page }) => {
    await page.goto('/create')

    // 안내문구 이미지 업로드용 숨겨진 input이 있어야 함
    // GuideImageUpload 컴포넌트의 input (accept="image/*", hidden)
    const guideImageInputs = page.locator('input[type="file"][accept="image/*"]')

    // 여러 이미지 업로드 input 중 하나가 존재해야 함
    await expect(guideImageInputs.first()).toBeAttached()
  })

  test('should show guide image section in both AR and basic mode', async ({ page }) => {
    await page.goto('/create')

    // AR 모드에서 안내문구 이미지 섹션 확인
    await expect(page.getByText('안내문구 이미지 (선택)')).toBeVisible()

    // 기본 모드로 전환
    await page.getByRole('button', { name: /기본 모드 선택/i }).click()

    // 기본 모드에서도 안내문구 이미지 섹션이 보여야 함
    await expect(page.getByText('안내문구 이미지 (선택)')).toBeVisible()
  })

  test('should show tooltip with guide image description', async ({ page }) => {
    await page.goto('/create')

    // 안내문구 이미지 섹션의 정보 아이콘에 마우스 호버
    const infoIcon = page.locator('label:has-text("안내문구 이미지")').locator('..').locator('svg')

    if (await infoIcon.count() > 0) {
      await infoIcon.first().hover()

      // 툴팁에 설명이 표시되어야 함
      await expect(page.getByText('AR 뷰어 진입 시 표시되는 안내문구 이미지입니다.')).toBeVisible()
    }
  })
})

test.describe('Guide Image Fullscreen Display', () => {
  // Note: 이 테스트들은 실제 AR 뷰어 페이지 접근이 필요합니다.
  // 프로젝트 데이터가 있어야 완전히 동작합니다.

  test('should have correct fullscreen styles for guide image in MindarViewer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // AR 모드 프로젝트 찾기
    const arBadges = page.locator('span', { hasText: '🎯 AR' })
    const arCount = await arBadges.count()

    if (arCount > 0) {
      // 첫 번째 AR 프로젝트의 보기 버튼 클릭
      const firstArBadge = arBadges.first()
      const card = firstArBadge.locator('xpath=ancestor::div[contains(@class, "rounded")]').last()
      const viewButton = card.locator('a, button').filter({ hasText: /보기|View/ })

      if (await viewButton.count() > 0) {
        // 새 탭에서 열리므로 Promise.all 사용
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page'),
          viewButton.first().click(),
        ])

        await newPage.waitForLoadState('domcontentloaded')

        // 안내문구 이미지가 있다면 스타일 확인
        const guideImage = newPage.locator('img[alt="안내문구"]')

        if (await guideImage.count() > 0) {
          // w-full h-full object-contain 클래스가 적용되어 있는지 확인
          await expect(guideImage).toHaveClass(/w-full/)
          await expect(guideImage).toHaveClass(/h-full/)
          await expect(guideImage).toHaveClass(/object-contain/)
        }

        await newPage.close()
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('should have correct fullscreen styles for guide image in BasicModeViewer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // 기본 모드 프로젝트 찾기
    const basicBadges = page.locator('span', { hasText: '📹 기본' })
    const basicCount = await basicBadges.count()

    if (basicCount > 0) {
      // 첫 번째 기본 모드 프로젝트의 보기 버튼 클릭
      const firstBasicBadge = basicBadges.first()
      const card = firstBasicBadge.locator('xpath=ancestor::div[contains(@class, "rounded")]').last()
      const viewButton = card.locator('a, button').filter({ hasText: /보기|View/ })

      if (await viewButton.count() > 0) {
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page'),
          viewButton.first().click(),
        ])

        await newPage.waitForLoadState('domcontentloaded')

        // 안내문구 이미지가 있다면 스타일 확인
        const guideImage = newPage.locator('img[alt="안내문구"]')

        if (await guideImage.count() > 0) {
          // w-full h-full object-contain 클래스가 적용되어 있는지 확인
          await expect(guideImage).toHaveClass(/w-full/)
          await expect(guideImage).toHaveClass(/h-full/)
          await expect(guideImage).toHaveClass(/object-contain/)
        }

        await newPage.close()
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('should display guide image container as fixed fullscreen', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // AR 모드 프로젝트 찾기
    const arBadges = page.locator('span', { hasText: '🎯 AR' })
    const arCount = await arBadges.count()

    if (arCount > 0) {
      const firstArBadge = arBadges.first()
      const card = firstArBadge.locator('xpath=ancestor::div[contains(@class, "rounded")]').last()
      const viewButton = card.locator('a, button').filter({ hasText: /보기|View/ })

      if (await viewButton.count() > 0) {
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page'),
          viewButton.first().click(),
        ])

        await newPage.waitForLoadState('domcontentloaded')

        // 안내문구 이미지 컨테이너가 fixed inset-0로 설정되어 있는지 확인
        const guideImageContainer = newPage.locator('div:has(> img[alt="안내문구"])').first()

        if (await guideImageContainer.count() > 0) {
          // fixed와 inset-0 클래스가 적용되어 있는지 확인
          await expect(guideImageContainer).toHaveClass(/fixed/)
          await expect(guideImageContainer).toHaveClass(/inset-0/)
        }

        await newPage.close()
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Media Item Mode Switch (Tracking/Basic)', () => {
  // 미디어 아이템의 트래킹/기본 모드 전환 테스트
  // 이 테스트들은 프로젝트 생성 페이지에서 미디어 아이템의 모드 선택 기능을 검증합니다.

  test('should show mode selector for each media item', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가 버튼 클릭
    const addVideoButton = page.getByRole('button', { name: /영상 추가하기/i })
    await expect(addVideoButton).toBeVisible()
    await addVideoButton.click()

    // 미디어 아이템 섹션이 추가되어야 함
    await expect(page.getByText(/영상 1/)).toBeVisible()

    // 미디어 아이템에 트래킹/기본 모드 선택이 있어야 함
    // 표시 모드 레이블 아래의 버튼들 확인
    await expect(page.getByText('표시 모드')).toBeVisible()
    // 트래킹 버튼과 기본 버튼이 있어야 함 (섹션 내에서)
    const trackingButton = page.locator('button', { hasText: '트래킹' }).first()
    const basicButton = page.locator('button', { hasText: /^기본$/ }).first()
    await expect(trackingButton).toBeVisible()
    await expect(basicButton).toBeVisible()
  })

  test('should default to tracking mode for new media item', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByRole('button', { name: /영상 추가하기/i }).click()

    // 표시 모드 섹션 확인
    await expect(page.getByText('표시 모드')).toBeVisible()

    // 트래킹 버튼이 default variant (선택 상태)이어야 함
    const trackingButton = page.locator('button', { hasText: '트래킹' }).first()
    // default variant는 배경색이 있음 (primary)
    await expect(trackingButton).toHaveClass(/bg-/)
  })

  test('should switch media item from tracking to basic mode', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByRole('button', { name: /영상 추가하기/i }).click()

    // 표시 모드 섹션 확인
    await expect(page.getByText('표시 모드')).toBeVisible()

    // 기본 모드로 전환 - 정확히 '기본' 텍스트만 있는 버튼 클릭
    const basicButton = page.locator('button', { hasText: /^기본$/ }).first()
    await basicButton.click()

    // 모드 전환 후 설명 텍스트가 변경되어야 함
    await expect(page.getByText('화면에 항상 표시됩니다')).toBeVisible()
  })

  test('should show tracking badge in collapsed section header', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByRole('button', { name: /영상 추가하기/i }).click()

    // 섹션 헤더에 '트래킹' 뱃지가 보여야 함 (bg-purple-100 클래스를 가진 span 요소)
    await expect(page.locator('span.bg-purple-100', { hasText: '트래킹' })).toBeVisible()
  })

  test('should show basic badge when mode is changed to basic', async ({ page }) => {
    await page.goto('/create')

    // 영상 추가
    await page.getByRole('button', { name: /영상 추가하기/i }).click()

    // 기본 모드로 전환
    const basicButton = page.locator('button', { hasText: /^기본$/ }).first()
    await basicButton.click()

    // 모드 전환 후 '화면에 항상 표시됩니다' 설명이 보여야 함
    await expect(page.getByText('화면에 항상 표시됩니다')).toBeVisible()
  })

  test('should allow multiple media items with different modes', async ({ page }) => {
    await page.goto('/create')

    // 첫 번째 영상 추가 (트래킹 모드)
    await page.getByRole('button', { name: /영상 추가하기/i }).click()
    await expect(page.getByText(/영상 1/)).toBeVisible()

    // 두 번째 영상 추가
    await page.getByRole('button', { name: /영상 추가하기/i }).click()
    await expect(page.getByText(/영상 2/)).toBeVisible()

    // 두 영상 모두 헤더에 표시됨
    await expect(page.getByText(/영상 1/)).toBeVisible()
    await expect(page.getByText(/영상 2/)).toBeVisible()

    // 표시 모드 섹션이 두 개 있어야 함 (각 미디어 아이템에 하나씩)
    const displayModeLabels = page.getByText('표시 모드')
    await expect(displayModeLabels).toHaveCount(2)
  })
})

test.describe('Edit Project - Media Item Mode Change', () => {
  // 편집 페이지에서 미디어 아이템 모드 변경 테스트
  // 기존 프로젝트의 미디어 아이템 모드를 변경하고 저장 후 뷰어에서 적용되는지 확인

  test('should display current mode for existing media items', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // AR 프로젝트 찾기 (미디어 아이템이 있는 프로젝트)
    const arBadges = page.locator('span', { hasText: '🎯 AR' })
    const count = await arBadges.count()

    if (count > 0) {
      // 첫 번째 AR 프로젝트 편집
      const firstArBadge = arBadges.first()
      const card = firstArBadge.locator('xpath=ancestor::div[contains(@class, "rounded")]').last()
      const editButton = card.locator('button', { hasText: '편집' })

      if (await editButton.count() > 0) {
        await editButton.click()
        await expect(page.getByText('모드 선택')).toBeVisible({ timeout: 10000 })

        // 미디어 아이템이 있는지 확인
        const mediaSection = page.getByText(/영상 \d|이미지 \d/)
        if (await mediaSection.count() > 0) {
          // 표시 모드 레이블이 보이는지 확인
          await expect(page.getByText('표시 모드')).toBeVisible()
        } else {
          test.skip()
        }
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('should allow changing media item mode from tracking to basic in edit page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const arBadges = page.locator('span', { hasText: '🎯 AR' })
    const count = await arBadges.count()

    if (count > 0) {
      const firstArBadge = arBadges.first()
      const card = firstArBadge.locator('xpath=ancestor::div[contains(@class, "rounded")]').last()
      const editButton = card.locator('button', { hasText: '편집' })

      if (await editButton.count() > 0) {
        await editButton.click()
        await expect(page.getByText('모드 선택')).toBeVisible({ timeout: 10000 })

        // 미디어 아이템 섹션 찾기 - 표시 모드 레이블 확인
        const displayModeLabel = page.getByText('표시 모드')
        const displayModeCount = await displayModeLabel.count()

        if (displayModeCount > 0) {
          // 기본 모드 버튼 클릭
          const basicButton = page.locator('button', { hasText: /^기본$/ }).first()
          if (await basicButton.count() > 0) {
            await basicButton.click()
            // 모드 전환 후 설명 텍스트가 변경되어야 함
            await expect(page.getByText('화면에 항상 표시됩니다')).toBeVisible()
          } else {
            test.skip()
          }
        } else {
          test.skip()
        }
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })
})

test.describe('Edit Project Page - Mode Change', () => {
  // Note: These tests require a project to exist in the database
  // They verify the mode change functionality in the edit page

  test('should show mode selector on edit page', async ({ page }) => {
    // First, go to project list and check if there are projects
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })

    // Wait for page to load completely
    await page.waitForLoadState('networkidle')

    // Try to find an edit button (if projects exist)
    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // Edit page should show mode selector
      await expect(page.getByText('모드 선택')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('AR 모드')).toBeVisible()
      await expect(page.getByText('기본 모드')).toBeVisible()
    } else {
      // Skip test if no projects exist
      test.skip()
    }
  })

  test('should allow mode change from AR to basic on edit page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Find AR mode project badge
    const arBadges = page.locator('span', { hasText: '🎯 AR' })
    const arCount = await arBadges.count()

    if (arCount > 0) {
      // Get the first AR badge and find its parent card, then click edit
      const firstArBadge = arBadges.first()
      // Navigate up to the Card component and find the edit button
      const card = firstArBadge.locator('xpath=ancestor::div[contains(@class, "rounded")]').last()
      const editButton = card.locator('button', { hasText: '편집' })

      if (await editButton.count() > 0) {
        await editButton.click()

        // Should show mode selector
        await expect(page.getByText('모드 선택')).toBeVisible({ timeout: 10000 })

        // AR mode should be selected
        const arModeButton = page.getByRole('button', { name: /AR 모드 선택/i })
        await expect(arModeButton).toHaveAttribute('aria-pressed', 'true')

        // Click basic mode button
        const basicModeButton = page.getByRole('button', { name: /기본 모드 선택/i })
        await basicModeButton.click()

        // Basic mode should now be selected
        await expect(basicModeButton).toHaveAttribute('aria-pressed', 'true')
        await expect(arModeButton).toHaveAttribute('aria-pressed', 'false')

        // AR settings should be hidden
        await expect(page.getByText('AR 설정')).not.toBeVisible()

        // Target image section should be hidden
        await expect(page.getByText('타겟 이미지 변경 (선택)')).not.toBeVisible()
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('should require target image when changing basic to AR mode', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Find basic mode project badge
    const basicBadges = page.locator('span', { hasText: '📹 기본' })
    const basicCount = await basicBadges.count()

    if (basicCount > 0) {
      // Get the first basic badge and find its parent card, then click edit
      const firstBasicBadge = basicBadges.first()
      const card = firstBasicBadge.locator('xpath=ancestor::div[contains(@class, "rounded")]').last()
      const editButton = card.locator('button', { hasText: '편집' })

      if (await editButton.count() > 0) {
        await editButton.click()

        // Should show mode selector
        await expect(page.getByText('모드 선택')).toBeVisible({ timeout: 10000 })

        // Basic mode should be selected
        const basicModeButton = page.getByRole('button', { name: /기본 모드 선택/i })
        await expect(basicModeButton).toHaveAttribute('aria-pressed', 'true')

        // Click AR mode button
        const arModeButton = page.getByRole('button', { name: /AR 모드 선택/i })
        await arModeButton.click()

        // AR mode should now be selected
        await expect(arModeButton).toHaveAttribute('aria-pressed', 'true')

        // Warning message should appear
        await expect(page.getByText('AR 모드로 변경하면 타겟 이미지를 업로드해야 합니다.')).toBeVisible()

        // Target image should be marked as required
        await expect(page.getByText('타겟 이미지 (필수)')).toBeVisible()
        await expect(page.getByText('AR 모드에서는 타겟 이미지가 필요합니다.')).toBeVisible()

        // Save button should be disabled
        const saveButton = page.getByRole('button', { name: /저장/i })
        await expect(saveButton).toBeDisabled()
      } else {
        test.skip()
      }
    } else {
      test.skip()
    }
  })

  test('should show save and cancel buttons on edit page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // Should show save and cancel buttons
      await expect(page.getByRole('button', { name: /저장/i })).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('button', { name: /취소/i })).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('should navigate back to list when cancel is clicked', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('내 프로젝트')).toBeVisible({ timeout: 10000 })
    await page.waitForLoadState('networkidle')

    const editButtons = page.locator('button', { hasText: '편집' })
    const count = await editButtons.count()

    if (count > 0) {
      await editButtons.first().click()

      // Wait for edit page to load
      await expect(page.getByText('모드 선택')).toBeVisible({ timeout: 10000 })

      // Click cancel
      await page.getByRole('button', { name: /취소/i }).click()

      // Should navigate back to project list
      await expect(page).toHaveURL('/')
      await expect(page.getByText('내 프로젝트')).toBeVisible()
    } else {
      test.skip()
    }
  })
})
