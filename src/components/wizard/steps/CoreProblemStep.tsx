import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BusinessContext } from '@/types/scriptGenerator';

interface CoreProblemStepProps {
  data: BusinessContext['vsl_context']['core_problem'];
  onUpdate: (field: keyof BusinessContext['vsl_context']['core_problem'], value: string) => void;
}

const CoreProblemStep = ({ data, onUpdate }: CoreProblemStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">The Core Problem</h3>
        <p className="text-muted-foreground text-sm">What painful problem does your offer solve?</p>
      </div>

      <div className="space-y-5">
        <div>
          <Label htmlFor="primaryPain" className="text-sm font-medium text-foreground mb-2 block">
            What is the #1 problem your offer solves?
          </Label>
          <Textarea
            id="primaryPain"
            placeholder="e.g., They're creating content but not getting leads or clients from it..."
            value={data.primary_pain_point}
            onChange={(e) => onUpdate('primary_pain_point', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
          />
        </div>

        <div>
          <Label htmlFor="keepsAwake" className="text-sm font-medium text-foreground mb-2 block">
            What specific thought keeps them up at night?
          </Label>
          <Input
            id="keepsAwake"
            placeholder="e.g., 'What if I'm wasting my time on content that doesn't convert?'"
            value={data.keeps_them_up_at_night}
            onChange={(e) => onUpdate('keeps_them_up_at_night', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <Label htmlFor="emotional" className="text-sm font-medium text-foreground mb-2 block">
            What does this problem make them feel emotionally?
          </Label>
          <Input
            id="emotional"
            placeholder="e.g., Frustrated, overwhelmed, imposter syndrome..."
            value={data.emotional_impact}
            onChange={(e) => onUpdate('emotional_impact', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="financial" className="text-sm font-medium text-foreground mb-2 block">
              Financial cost of this problem
            </Label>
            <Input
              id="financial"
              placeholder="e.g., $50k+ in lost revenue per year"
              value={data.financial_impact}
              onChange={(e) => onUpdate('financial_impact', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <Label htmlFor="time" className="text-sm font-medium text-foreground mb-2 block">
              Time cost of this problem
            </Label>
            <Input
              id="time"
              placeholder="e.g., 10+ hours/week wasted"
              value={data.time_impact}
              onChange={(e) => onUpdate('time_impact', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="relationship" className="text-sm font-medium text-foreground mb-2 block">
            How does this problem hurt relationships?
          </Label>
          <Input
            id="relationship"
            placeholder="e.g., Strains family time, team friction, client trust issues..."
            value={data.relationship_impact}
            onChange={(e) => onUpdate('relationship_impact', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
};

export default CoreProblemStep;
