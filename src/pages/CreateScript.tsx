import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Search, FileText, PenTool, Wand2 } from 'lucide-react';
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

type GenerationStage = 'idle' | 'research' | 'structure' | 'writing' | 'polish' | 'complete';

const stageInfo: Record<GenerationStage, { label: string; icon: React.ReactNode; description: string }> = {
  idle: { label: '', icon: null, description: '' },
  research: { 
    label: 'Researching', 
    icon: <Search className="w-5 h-5" />, 
    description: 'Finding sources, extracting claims, analyzing your voice...' 
  },
  structure: { 
    label: 'Structuring', 
    icon: <FileText className="w-5 h-5" />, 
    description: 'Planning sections, mapping retention elements...' 
  },
  writing: { 
    label: 'Writing', 
    icon: <PenTool className="w-5 h-5" />, 
    description: 'Crafting each section with your voice...' 
  },
  polish: { 
    label: 'Polishing', 
    icon: <Wand2 className="w-5 h-5" />, 
    description: 'Final pass for flow and voice consistency...' 
  },
  complete: { label: 'Complete', icon: null, description: '' },
};

const CreateScript = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  
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
    setGenerationStage('research');
    
    try {
      // Stage 1-3: Research, Alignment, Tone, RAG
      const { data: prepData, error: prepError } = await supabase.functions.invoke('generate-script-v3', {
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

      if (prepError) throw prepError;
      console.log('Prep stages complete:', prepData);

      // Stage 4A: Structure
      setGenerationStage('structure');
      const { data: structureData, error: structureError } = await supabase.functions.invoke('script-structure', {
        body: {
          topic: prepData.topic,
          context_profile: prepData.context_profile,
          aligned_claims: prepData.aligned_claims,
          target_length: prepData.target_length,
          rag_examples_section: prepData.rag_examples_section,
        },
      });

      if (structureError) throw structureError;
      console.log('Structure complete:', structureData);

      // Stage 4B: Writing
      setGenerationStage('writing');
      const { data: writeData, error: writeError } = await supabase.functions.invoke('script-write', {
        body: {
          structure: structureData.structure,
          topic: prepData.topic,
          context_profile: prepData.context_profile,
          tone_summary: prepData.tone_summary,
          aligned_claims: prepData.aligned_claims,
          rag_examples_section: prepData.rag_examples_section,
        },
      });

      if (writeError) throw writeError;
      console.log('Writing complete:', writeData);

      // Stage 4C: Polish
      setGenerationStage('polish');
      const { data: polishData, error: polishError } = await supabase.functions.invoke('script-polish', {
        body: {
          script: writeData.script,
          tone_summary: prepData.tone_summary,
          aligned_claims: prepData.aligned_claims,
          rag_results: prepData.rag_results,
        },
      });

      if (polishError) throw polishError;
      console.log('Polish complete:', polishData);

      setGenerationStage('complete');

      navigate('/script', { 
        state: { 
          script: polishData.script, 
          contextProfile: businessContext,
          businessContext,
          voiceData,
          researchPack: prepData.research_pack,
          alignmentChecklist: prepData.alignment_stats,
          toneSummary: prepData.tone_summary,
          contextUseLog: polishData.context_use_log,
          retentionElements: polishData.retention_elements,
          validation: { passed: true, issues: [] },
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
      setGenerationStage('idle');
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

  const renderGenerationProgress = () => {
    const stages: GenerationStage[] = ['research', 'structure', 'writing', 'polish'];
    const currentIndex = stages.indexOf(generationStage);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            {stageInfo[generationStage].icon}
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {stageInfo[generationStage].label}...
          </h3>
          <p className="text-muted-foreground">
            {stageInfo[generationStage].description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {stages.map((stage, index) => (
            <div key={stage} className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index < currentIndex
                    ? 'bg-primary'
                    : index === currentIndex
                    ? 'bg-primary animate-pulse'
                    : 'bg-muted'
                }`}
              />
              {index < stages.length - 1 && (
                <div
                  className={`w-8 h-0.5 transition-all duration-300 ${
                    index < currentIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          {stages.map((stage, index) => (
            <span
              key={stage}
              className={`transition-colors ${
                index <= currentIndex ? 'text-foreground' : ''
              }`}
            >
              {stageInfo[stage].label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <main className="relative pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          {!isGenerating && (
            <WizardProgress currentStep={currentStep} totalSteps={totalSteps} stepLabels={stepLabels} />
          )}

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-8 mb-8 max-h-[60vh] overflow-y-auto">
            {isGenerating ? renderGenerationProgress() : renderStep()}
          </div>

          {!isGenerating && (
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
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Script
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateScript;
