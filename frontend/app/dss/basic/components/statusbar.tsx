// app/dss/basic/components/statusbar.tsx 
'use client'

import { useState, useEffect, useMemo } from 'react'
import { CheckCircle, CircleDot, Circle, ChevronDown, ArrowLeft } from 'lucide-react'

interface Step {
  id: string
  name: string
  status: 'completed' | 'current' | 'upcoming' | 'skipped'
}

interface StatusBarProps {
  currentStep: number
  onStepChange?: (stepIndex: number) => void
  skippedSteps?: number[]
}

export default function StatusBar({ currentStep, onStepChange, skippedSteps = [] }: StatusBarProps) {
  // Define base steps outside of render
  const baseSteps: Step[] = useMemo(() => [
    { id: 'population', name: 'Population Forecasting', status: 'upcoming' },
    { id: 'demand', name: 'Water Demand', status: 'upcoming' },
    { id: 'supply', name: 'Water Supply', status: 'upcoming' },
    { id: 'quality', name: 'Sewage', status: 'upcoming' }
  ], []);

  // Calculate steps with status only when dependencies change
  const steps = useMemo(() => {
    return baseSteps.map((step, i) => ({
      ...step,
      status: i < currentStep
        ? (skippedSteps.includes(i) ? 'skipped' : 'completed')
        : i === currentStep
        ? 'current'
        : 'upcoming'
    }));
  }, [currentStep, skippedSteps, baseSteps]);

  const handleStepClick = (index: number) => {
    if (index < currentStep && onStepChange) {
      onStepChange(index);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 shadow-sm h-full">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">Basic Module</h2>
      </div>

      <nav aria-label="Progress" className="p-6">
        <ol className="space-y-10 relative">
          {steps.map((step, idx) => (
            <li 
              key={step.id} 
              className={`relative ${idx < currentStep ? 'cursor-pointer group' : ''}`}
              onClick={() => handleStepClick(idx)}
            >
              {/* Rest of your JSX remains the same */}
              <div className={`flex items-start space-x-3 transition-all duration-300 ${idx < currentStep ? 'group-hover:translate-x-1' : ''}`}>
                <div className="flex flex-col items-center">
                  {step.status === 'completed' ? (
                    <div className="relative">
                    <CheckCircle className="h-6 w-6 text-green-600 transition-all duration-300 group-hover:scale-110" />
                    <ArrowLeft className="absolute -left-5 opacity-0 group-hover:opacity-100 text-green-600 transition-all duration-300" size={14} />
                    </div>
                  ) : step.status === 'skipped' ? (
                    <div className="relative">
                    <CheckCircle className="h-6 w-6 text-yellow-500 transition-all duration-300 group-hover:scale-110" />
                    <ArrowLeft className="absolute -left-5 opacity-0 group-hover:opacity-100 text-yellow-600 transition-all duration-300" size={14} />
                    </div>
                  ) : step.status === 'current' ? (
                    <CircleDot className="h-6 w-6 text-blue-600 animate-pulse" />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-300" />
                  )}

                  {idx < steps.length - 1 && (
                    <div className="relative h-10 flex items-center justify-center">
                      <div className={`h-10 w-1 rounded-full transition-all duration-500 ${
                        step.status === 'completed' ? 'bg-green-400' :
                        step.status === 'skipped' ? 'bg-yellow-400' :
                        step.status === 'current' ? 'bg-blue-300' :
                        'bg-gray-200'
                      }`} />
                      {(step.status === 'completed' || step.status === 'skipped') && (
                        <ChevronDown 
                          className={`absolute animate-bounce opacity-70 ${
                            step.status === 'completed' ? 'text-green-500' : 'text-yellow-500'
                          }`}
                          size={30}
                          style={{ top: '80%' }}
                        />
                      )}
                      {step.status === 'current' && (
                        <div className="absolute w-3 h-3 bg-blue-400 rounded-full opacity-0 animate-ping"
                             style={{ top: '80%' }} />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div
                    className={`text-sm font-semibold transition-colors duration-300 ${
                      step.status === 'completed' ? 'text-green-600' :
                      step.status === 'skipped' ? 'text-yellow-600' :
                      step.status === 'current' ? 'text-blue-600' :
                      'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </div>
                  {idx < currentStep && (
                    <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Click to return
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-auto p-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Step <span className="font-medium">{currentStep + 1}</span> of {steps.length}
        </div>
      </div>
    </div>
  );
}