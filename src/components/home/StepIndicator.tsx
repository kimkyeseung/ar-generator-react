import { Check } from 'lucide-react'

type Step = {
  label: string
  description: string
}

type StepIndicatorProps = {
  steps: Step[]
  currentStep: number
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className='mb-8'>
      <div className='flex items-center justify-between'>
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isPending = stepNumber > currentStep

          return (
            <div key={index} className='flex flex-1 items-center'>
              {/* 스텝 원형 */}
              <div className='flex flex-col items-center'>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                    isCompleted
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isCurrent
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className='h-5 w-5' />
                  ) : (
                    stepNumber
                  )}
                </div>
                <div className='mt-2 text-center'>
                  <p
                    className={`text-xs font-medium ${
                      isCompleted
                        ? 'text-emerald-600'
                        : isCurrent
                          ? 'text-indigo-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      isPending ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>

              {/* 연결선 */}
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 transition-all ${
                    stepNumber < currentStep
                      ? 'bg-emerald-500'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
