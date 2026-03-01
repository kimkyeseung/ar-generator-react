import { ReactNode } from 'react'

interface TwoColumnLayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
  rightPanelTitle?: string
}

export default function TwoColumnLayout({
  leftPanel,
  rightPanel,
  rightPanelTitle = '화면 배치 미리보기',
}: TwoColumnLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* 좌측: 설정 패널 */}
      <div className="flex-1">
        {leftPanel}
      </div>

      {/* 우측: 미리보기 패널 (데스크톱에서만 표시) */}
      <div className="hidden lg:block w-[400px] flex-shrink-0">
        <div className="sticky top-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            {rightPanelTitle}
          </h2>
          <div className="bg-gray-900 rounded-lg p-4">
            {rightPanel}
          </div>
        </div>
      </div>
    </div>
  )
}
