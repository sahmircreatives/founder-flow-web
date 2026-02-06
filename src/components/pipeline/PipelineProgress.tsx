import { Check, Loader2 } from 'lucide-react';

interface PipelineProgressProps {
  currentStage: number;
  stages: { name: string; label: string }[];
}

const PipelineProgress = ({ currentStage, stages }: PipelineProgressProps) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {stages.map((stage, index) => {
        const isComplete = index < currentStage;
        const isCurrent = index === currentStage;
        const isFuture = index > currentStage;

        return (
          <div key={stage.name} className="flex items-center">
            <div className="flex flex-col items-center min-w-[60px]">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isComplete
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                    ? 'gradient-bg text-white animate-pulse'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? <Check className="w-3.5 h-3.5" /> : isCurrent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : index}
              </div>
              <span
                className={`text-[10px] mt-1 text-center leading-tight ${
                  isCurrent ? 'text-foreground font-medium' : isComplete ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {stage.label}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div
                className={`w-4 h-0.5 mt-[-14px] ${
                  isComplete ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PipelineProgress;
