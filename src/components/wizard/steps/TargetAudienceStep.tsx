import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BusinessContext } from '@/types/scriptGenerator';

interface TargetAudienceStepProps {
  demographics: BusinessContext['vsl_context']['target_audience']['demographics'];
  psychographics: BusinessContext['vsl_context']['target_audience']['psychographics'];
  onUpdateDemographics: (field: keyof BusinessContext['vsl_context']['target_audience']['demographics'], value: string) => void;
  onUpdatePsychographics: (field: keyof BusinessContext['vsl_context']['target_audience']['psychographics'], value: string | string[]) => void;
}

const TargetAudienceStep = ({ demographics, psychographics, onUpdateDemographics, onUpdatePsychographics }: TargetAudienceStepProps) => {
  const handleArrayField = (field: 'values' | 'interests' | 'personality_traits', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    onUpdatePsychographics(field, items);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Target Audience</h3>
        <p className="text-muted-foreground text-sm">Who is your ideal customer?</p>
      </div>

      <div className="space-y-5">
        {/* Demographics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ageRange" className="text-sm font-medium text-foreground mb-2 block">
              Age range
            </Label>
            <Input
              id="ageRange"
              placeholder="e.g., 25-45"
              value={demographics.age_range}
              onChange={(e) => onUpdateDemographics('age_range', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <Label htmlFor="incomeLevel" className="text-sm font-medium text-foreground mb-2 block">
              Income level
            </Label>
            <Input
              id="incomeLevel"
              placeholder="e.g., $100k-$500k/year"
              value={demographics.income_level}
              onChange={(e) => onUpdateDemographics('income_level', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="profession" className="text-sm font-medium text-foreground mb-2 block">
              Job/Profession
            </Label>
            <Input
              id="profession"
              placeholder="e.g., Startup founders, Marketing directors..."
              value={demographics.profession}
              onChange={(e) => onUpdateDemographics('profession', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <Label htmlFor="businessSize" className="text-sm font-medium text-foreground mb-2 block">
              Business size (if applicable)
            </Label>
            <Input
              id="businessSize"
              placeholder="e.g., 1-10 employees, Solo..."
              value={demographics.business_size}
              onChange={(e) => onUpdateDemographics('business_size', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="experienceLevel" className="text-sm font-medium text-foreground mb-2 block">
              Experience level
            </Label>
            <Input
              id="experienceLevel"
              placeholder="e.g., Beginner, Intermediate, Advanced..."
              value={demographics.experience_level}
              onChange={(e) => onUpdateDemographics('experience_level', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <Label htmlFor="location" className="text-sm font-medium text-foreground mb-2 block">
              Location
            </Label>
            <Input
              id="location"
              placeholder="e.g., USA, Global, English-speaking..."
              value={demographics.location}
              onChange={(e) => onUpdateDemographics('location', e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Psychographics */}
        <div>
          <Label htmlFor="values" className="text-sm font-medium text-foreground mb-2 block">
            Top 3 values (comma-separated)
          </Label>
          <Input
            id="values"
            placeholder="e.g., Freedom, Growth, Impact"
            value={psychographics.values.join(', ')}
            onChange={(e) => handleArrayField('values', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <Label htmlFor="interests" className="text-sm font-medium text-foreground mb-2 block">
            Top 3 interests (comma-separated)
          </Label>
          <Input
            id="interests"
            placeholder="e.g., Business, Technology, Self-improvement"
            value={psychographics.interests.join(', ')}
            onChange={(e) => handleArrayField('interests', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <Label htmlFor="lifestyle" className="text-sm font-medium text-foreground mb-2 block">
            Describe their lifestyle in one line
          </Label>
          <Input
            id="lifestyle"
            placeholder="e.g., Busy professional juggling work and family..."
            value={psychographics.lifestyle}
            onChange={(e) => onUpdatePsychographics('lifestyle', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <Label htmlFor="personality" className="text-sm font-medium text-foreground mb-2 block">
            3 personality traits (comma-separated)
          </Label>
          <Input
            id="personality"
            placeholder="e.g., Ambitious, Analytical, Action-oriented"
            value={psychographics.personality_traits.join(', ')}
            onChange={(e) => handleArrayField('personality_traits', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
};

export default TargetAudienceStep;
