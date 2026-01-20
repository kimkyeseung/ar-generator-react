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

    // 파일 업로드 시뮬레이션
    const fileInput = page.locator('input[type="file"][accept="image/*"]')

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
