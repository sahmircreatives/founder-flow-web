import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import WizardProgress from '@/components/wizard/WizardProgress';
import BusinessContextStep from '@/components/wizard/steps/BusinessContextStep';
import VoiceDataStep from '@/components/wizard/steps/VoiceDataStep';
import ReviewStep from '@/components/wizard/steps/ReviewStep';
import { useScriptWizard } from '@/hooks/useScriptWizard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const stepLabels = [
  'Business Context',
  'Voice',
  'Review',
];

const CreateScript = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const {
    currentStep,
    totalSteps,
    businessContext,
    voiceData,
    setBusinessContext,
    updateVoiceData,
    nextStep,
    prevStep,
    goToStep,
  } = useScriptWizard();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script-v3', {
        body: {
          topic: businessContext.video_title,
          context_profile: businessContext,
          tweets: voiceData.tweet_examples,
          constraints: {
            tone_goals: voiceData.tone_goals,
            dont_phrases: voiceData.dont_phrases,
          },
        },
      });

      if (error) throw error;

      navigate('/script', { 
        state: { 
          script: data.script, 
          contextProfile: businessContext,
          businessContext,
          voiceData,
          researchPack: data.research_pack,
          alignmentChecklist: data.alignment_checklist,
          toneSummary: data.tone_summary,
          contextUseLog: data.context_use_log,
          validation: data.validation,
        } 
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessContextStep
            businessContext={businessContext}
            onSetBusinessContext={setBusinessContext}
          />
        );
      case 2:
        return <VoiceDataStep data={voiceData} onUpdate={updateVoiceData} />;
      case 3:
        return <ReviewStep businessContext={businessContext} voiceData={voiceData} onEditStep={goToStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <main className="relative pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <WizardProgress currentStep={currentStep} totalSteps={totalSteps} stepLabels={stepLabels} />

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-8 mb-8 max-h-[60vh] overflow-y-auto">
            {renderStep()}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => currentStep === 1 ? navigate('/') : prevStep()}
              className="border-border text-foreground hover:bg-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? 'Home' : 'Back'}
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={nextStep} className="gradient-bg text-white hover:opacity-90">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gradient-bg text-white hover:opacity-90 glow-orange px-8"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Script
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateScript;
