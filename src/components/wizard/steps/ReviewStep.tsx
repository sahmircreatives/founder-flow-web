import { BusinessContext, VoiceData } from '@/types/scriptGenerator';
import { Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReviewStepProps {
  businessContext: BusinessContext;
  voiceData: VoiceData;
  onEditStep: (step: number) => void;
}

const ReviewStep = ({ businessContext, voiceData, onEditStep }: ReviewStepProps) => {
  const business_context = businessContext?.business_context;

  const sections = [
    {
      step: 1,
      title: 'Business Context',
      items: [
        { label: 'Video Title', value: businessContext?.video_title || '' },
        { label: 'Business', value: business_context?.business?.name || '' },
        { label: 'Offer', value: business_context?.offer?.name || '' },
        { label: 'Type', value: business_context?.business?.type || '' },
        { label: 'ICP Role', value: business_context?.icp?.demographics?.profession_or_role || '' },
        { label: 'Primary Problem', value: business_context?.icp_pain_points?.primary_problem || '' },
      ],
    },
    {
      step: 2,
      title: 'Voice & Tone',
      items: [
        { label: 'Tone Goals', value: voiceData?.tone_goals?.join(', ') || 'Not set' },
        { label: "Don't Phrases", value: (voiceData?.dont_phrases?.length || 0) + ' phrases' },
        { label: 'Content Examples', value: voiceData?.tweet_examples ? 'Provided' : 'Not provided' },
      ],
    },
  ];

  const isComplete = (section: typeof sections[0]) => {
    return section.items.every(item => item.value && item.value.length > 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Review Your Inputs</h3>
        <p className="text-muted-foreground text-sm">Make sure everything looks good before generating your script.</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.step}
            className="p-4 rounded-xl border border-border bg-secondary/20 relative group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isComplete(section)
                      ? 'gradient-bg text-white'
                      : 'border border-border bg-secondary/30 text-muted-foreground'
                  }`}
                >
                  {isComplete(section) ? <Check className="w-3 h-3" /> : section.step}
                </div>
                <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditStep(section.step)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {section.items.map((item) => (
                <div key={item.label}>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</span>
                  <p className="text-sm text-foreground truncate" title={item.value}>
                    {item.value || <span className="text-muted-foreground italic">Not set</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
        <p className="text-sm text-foreground">
          <strong>Ready to generate?</strong> Click the button below to create your high-retention YouTube script.
          The AI will use all the information above to craft a personalized script matching your voice and audience.
        </p>
      </div>
    </div>
  );
};

export default ReviewStep;
