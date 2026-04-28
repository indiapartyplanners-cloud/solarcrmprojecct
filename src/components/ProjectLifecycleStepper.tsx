import { Check } from 'lucide-react';
import { stageLabels } from '@/components/StatusBadges';

const lifecycleStages = [
  'lead_created',
  'proposal_approved',
  'contract_signed',
  'design_started',
  'design_approved',
  'build_started',
  'qa_passed',
  'commissioned',
  'closeout_delivered',
] as const;

interface ProjectLifecycleStepperProps {
  currentStage: string;
}

export const ProjectLifecycleStepper = ({ currentStage }: ProjectLifecycleStepperProps) => {
  const currentIndex = Math.max(lifecycleStages.indexOf(currentStage as (typeof lifecycleStages)[number]), 0);

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">Project Lifecycle</h3>
        <span className="text-xs text-muted-foreground">
          Step {currentIndex + 1} of {lifecycleStages.length}
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[820px] items-start">
          {lifecycleStages.map((stage, index) => {
            const completed = index < currentIndex;
            const active = index === currentIndex;

            return (
              <div key={stage} className="flex flex-1 items-start">
                <div className="flex w-full flex-col items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                      completed
                        ? 'border-success bg-success text-success-foreground'
                        : active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    {completed ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <p className={`text-center text-xs leading-tight ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {stageLabels[stage]}
                  </p>
                </div>

                {index < lifecycleStages.length - 1 && (
                  <div
                    className={`mt-4 h-0.5 flex-1 transition-colors ${
                      completed ? 'bg-success/70' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
