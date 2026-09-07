// src/pages/admin/projects/wizard/StepperHeader.tsx
import { Check } from 'lucide-react';

export interface WizardStepDef {
  key: number;
  label: string;
}

interface Props {
  steps: WizardStepDef[];
  currentStep: number;      // étape affichée actuellement
  maxUnlockedStep: number;  // étape la plus loin déjà validée + 1
  onStepClick: (step: number) => void;
}

export default function StepperHeader({ steps, currentStep, maxUnlockedStep, onStepClick }: Props) {
  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center">
        {steps.map((step, idx) => {
          const isDone     = step.key < currentStep || step.key < maxUnlockedStep;
          const isActive   = step.key === currentStep;
          const isLocked   = step.key > maxUnlockedStep;
          const isLast     = idx === steps.length - 1;

          return (
            <div key={step.key} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => !isLocked && onStepClick(step.key)}
                className="flex flex-col items-center gap-1.5 group flex-shrink-0"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                    ${isActive
                      ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-200'
                      : isDone
                        ? 'bg-green-50 border-green-500 text-green-600'
                        : isLocked
                          ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'bg-white border-gray-300 text-gray-400 hover:border-green-400'}`}
                >
                  {isDone && !isActive ? <Check className="w-4 h-4" /> : step.key}
                </div>
                <span className={`text-[11px] font-medium text-center max-w-[90px] leading-tight
                  ${isActive ? 'text-green-700' : isLocked ? 'text-gray-300' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </button>

              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1.5 mb-5 rounded-full transition-colors
                  ${step.key < maxUnlockedStep ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
