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
    // Step 1 헤딩 확인
    await expect(page.getByRole('heading', { name: /타겟 이미지를 업로드/ })).toBeVisible()
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

  test('should show status callout before target upload', async ({ page }) => {
    await page.goto('/create')

    // 타겟 이미지 업로드 전에는 상태 메시지가 보여야 함
    await expect(page.getByText('.mind 파일을 생성하면')).toBeVisible()
  })

  test('should have project title input', async ({ page }) => {
    await page.goto('/create')

    // 프로젝트 제목 입력 필드 확인
    await expect(page.getByPlaceholder(/프로젝트 제목/)).toBeVisible()
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
