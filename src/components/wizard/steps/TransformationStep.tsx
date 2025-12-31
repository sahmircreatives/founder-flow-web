import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BusinessContext } from '@/types/scriptGenerator';

interface TransformationStepProps {
  fromState: BusinessContext['vsl_context']['transformation_promise']['from_state'];
  toState: BusinessContext['vsl_context']['transformation_promise']['to_state'];
  timeline: string;
  successMetrics: string[];
  onUpdateFromState: (field: keyof BusinessContext['vsl_context']['transformation_promise']['from_state'], value: string | string[]) => void;
  onUpdateToState: (field: keyof BusinessContext['vsl_context']['transformation_promise']['to_state'], value: string | string[]) => void;
  onUpdateMeta: (field: 'timeline' | 'success_metrics', value: string | string[]) => void;
}

const TransformationStep = ({
  fromState,
  toState,
  timeline,
  successMetrics,
  onUpdateFromState,
  onUpdateToState,
  onUpdateMeta,
}: TransformationStepProps) => {
  const handleArrayField = (
    section: 'from' | 'to' | 'meta',
    field: string,
    value: string
  ) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    if (section === 'from') {
      onUpdateFromState(field as any, items);
    } else if (section === 'to') {
      onUpdateToState(field as any, items);
    } else {
      onUpdateMeta(field as any, items);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">The Transformation</h3>
        <p className="text-muted-foreground text-sm">What change does your offer deliver?</p>
      </div>

      <div className="space-y-5">
        {/* FROM State */}
        <div className="p-4 rounded-xl border border-border bg-secondary/20">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Before (Current Situation)</h4>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentSituation" className="text-sm font-medium text-foreground mb-2 block">
                Describe their current situation in one sentence
              </Label>
              <Textarea
                id="currentSituation"
                placeholder="e.g., Posting content randomly with no strategy, hoping something sticks..."
                value={fromState.current_situation}
                onChange={(e) => onUpdateFromState('current_situation', e.target.value)}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground min-h-[60px]"
              />
            </div>

            <div>
              <Label htmlFor="painPoints" className="text-sm font-medium text-foreground mb-2 block">
                3 pain points they deal with daily (comma-separated)
              </Label>
              <Input
                id="painPoints"
                placeholder="e.g., No leads from content, Inconsistent posting, No clear strategy"
                value={fromState.pain_points.join(', ')}
                onChange={(e) => handleArrayField('from', 'pain_points', e.target.value)}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <Label htmlFor="limitations" className="text-sm font-medium text-foreground mb-2 block">
                3 limitations holding them back (comma-separated)
              </Label>
              <Input
                id="limitations"
                placeholder="e.g., Limited time, No proven system, Lack of expertise"
                value={fromState.limitations.join(', ')}
                onChange={(e) => handleArrayField('from', 'limitations', e.target.value)}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* TO State */}
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
          <h4 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">After (Desired Outcome)</h4>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="desiredOutcome" className="text-sm font-medium text-foreground mb-2 block">
                What is the desired outcome in one sentence?
              </Label>
              <Textarea
                id="desiredOutcome"
                placeholder="e.g., A predictable content-to-client pipeline generating qualified leads weekly..."
                value={toState.desired_outcome}
                onChange={(e) => onUpdateToState('desired_outcome', e.target.value)}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground min-h-[60px]"
              />
            </div>

            <div>
              <Label htmlFor="benefits" className="text-sm font-medium text-foreground mb-2 block">
                3 benefits they get (comma-separated)
              </Label>
              <Input
                id="benefits"
                placeholder="e.g., Consistent lead flow, Authority positioning, Time freedom"
                value={toState.benefits.join(', ')}
                onChange={(e) => handleArrayField('to', 'benefits', e.target.value)}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <Label htmlFor="capabilities" className="text-sm font-medium text-foreground mb-2 block">
                3 new capabilities they'll have (comma-separated)
              </Label>
              <Input
                id="capabilities"
                placeholder="e.g., Create viral hooks, Repurpose content, Scale without more time"
                value={toState.new_capabilities.join(', ')}
                onChange={(e) => handleArrayField('to', 'new_capabilities', e.target.value)}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Timeline & Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timeline" className="text-sm font-medium text-foreground mb-2 block">
              How long to see results?
            </Label>
            <Input
              id="timeline"
              placeholder="e.g., 30-60 days"
              value={timeline}
              onChange={(e) => onUpdateMeta('timeline', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <Label htmlFor="metrics" className="text-sm font-medium text-foreground mb-2 block">
              3 success metrics (comma-separated)
            </Label>
            <Input
              id="metrics"
              placeholder="e.g., 5+ leads/week, 2x engagement, $10k revenue"
              value={successMetrics.join(', ')}
              onChange={(e) => handleArrayField('meta', 'success_metrics', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransformationStep;
