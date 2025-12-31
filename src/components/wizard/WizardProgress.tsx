import { Check } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

const WizardProgress = ({ currentStep, totalSteps, stepLabels }: WizardProgressProps) => {
  return (
    <div className="mb-8">
      {/* Progress Bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
        <span className="font-medium">{stepLabels[currentStep - 1]}</span>
        <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full gradient-bg transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between mt-4">
        {stepLabels.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={label} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isCompleted
                    ? 'gradient-bg text-white'
                    : isCurrent
                    ? 'border-2 border-primary bg-primary/20 text-primary'
                    : 'border border-border bg-secondary/30 text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-[10px] mt-1 hidden sm:block ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WizardProgress;
