import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import WizardProgress from '@/components/wizard/WizardProgress';
import BusinessContextStep from '@/components/wizard/steps/BusinessContextStep';
import VoiceDataStep from '@/components/wizard/steps/VoiceDataStep';
import ReviewStep from '@/components/wizard/steps/ReviewStep';
import StageCheckpoint from '@/components/pipeline/StageCheckpoint';
import PipelineProgress from '@/components/pipeline/PipelineProgress';
import { useScriptWizard } from '@/hooks/useScriptWizard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const stepLabels = ['Business Context', 'Voice', 'Review'];

const PIPELINE_STAGES = [
  { name: 'rag', label: 'RAG' },
  { name: 'research', label: 'Research' },
  { name: 'claims', label: 'Claims' },
  { name: 'alignment', label: 'Alignment' },
  { name: 'tone', label: 'Tone' },
  { name: 'structure', label: 'Structure' },
  { name: 'writing', label: 'Writing' },
  { name: 'polish', label: 'Polish' },
];

// Helpers to format stage output for display
function formatStageOutput(stageName: string, data: any): string {
  if (!data) return 'No output';
  
  switch (stageName) {
    case 'rag': {
      const r = data.rag_results || {};
      const lines = ['=== RAG Retrieved Examples ===\n'];
      lines.push(`Hooks: ${r.hooks?.length || 0}`);
      r.hooks?.forEach((h: any, i: number) => lines.push(`  [${i+1}] (sim: ${h.similarity?.toFixed(2)}) ${h.content?.slice(0, 150)}...`));
      lines.push(`\nBody Sections: ${r.body_sections?.length || 0}`);
      r.body_sections?.forEach((b: any, i: number) => lines.push(`  [${i+1}] (sim: ${b.similarity?.toFixed(2)}) ${b.content?.slice(0, 150)}...`));
      lines.push(`\nProof Sections: ${r.proof_sections?.length || 0}`);
      r.proof_sections?.forEach((p: any, i: number) => lines.push(`  [${i+1}] ${p.content?.slice(0, 150)}...`));
      lines.push(`\nObjection Handlers: ${r.objection_handlers?.length || 0}`);
      r.objection_handlers?.forEach((o: any, i: number) => lines.push(`  [${i+1}] ${o.content?.slice(0, 150)}...`));
      if (data.rag_examples_section) {
        lines.push('\n--- RAG Examples Section (sent to later stages) ---\n');
        lines.push(data.rag_examples_section);
      }
      return lines.join('\n');
    }
    case 'research': {
      const rp = data.research_pack || {};
      const lines = ['=== Research Results ===\n'];
      lines.push(`Sources: ${rp.sources?.length || 0}`);
      rp.sources?.forEach((s: any, i: number) => lines.push(`  [${i+1}] ${s.title} - ${s.url}`));
      lines.push(`\nClaims: ${rp.claims?.length || 0}`);
      rp.claims?.forEach((c: any, i: number) => lines.push(`  [${i+1}] (score: ${c.relevance_score}) ${c.claim}\n       Source: ${c.source_url}`));
      return lines.join('\n');
    }
    case 'claims': {
      const claims = data.claims || [];
      const lines = ['=== Extracted Claims ===\n'];
      claims.forEach((c: any, i: number) => lines.push(`[${i+1}] (score: ${c.relevance_score}) ${c.claim}\n    Source: ${c.source_url}\n`));
      return lines.join('\n');
    }
    case 'alignment': {
      const ac = data.aligned_claims || [];
      const stats = data.alignment_stats || {};
      const lines = [`=== Aligned Claims ===\nKept ${stats.filtered_claims_count || ac.length} of ${stats.original_claims_count || '?'} claims\n`];
      ac.forEach((c: any, i: number) => lines.push(`[${i+1}] (score: ${c.relevance_score}) ${c.claim}\n    Source: ${c.source_url}\n`));
      return lines.join('\n');
    }
    case 'tone': {
      const ts = data.tone_summary || {};
      const lines = ['=== Tone Summary ===\n'];
      lines.push(`Voice: ${ts.one_sentence_voice}\n`);
      if (ts.tone_rules?.length) { lines.push('Tone Rules:'); ts.tone_rules.forEach((r: string, i: number) => lines.push(`  ${i+1}. ${r}`)); lines.push(''); }
      if (ts.writing_patterns?.length) { lines.push('Writing Patterns:'); ts.writing_patterns.forEach((p: string, i: number) => lines.push(`  ${i+1}. ${p}`)); lines.push(''); }
      if (ts.dont_phrases?.length) { lines.push(`Don't Use: ${ts.dont_phrases.join(', ')}`); lines.push(''); }
      if (ts.cadence_notes?.length) { lines.push('Cadence Notes:'); ts.cadence_notes.forEach((n: string) => lines.push(`  • ${n}`)); }
      return lines.join('\n');
    }
    case 'structure': {
      const s = data.structure || {};
      return JSON.stringify(s, null, 2);
    }
    case 'writing':
      return data.script || '';
    case 'polish':
      return data.script || '';
    default:
      return JSON.stringify(data, null, 2);
  }
}

const CreateScript = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  
  // Pipeline state
  const [pipelineActive, setPipelineActive] = useState(false);
  const [currentPipelineStage, setCurrentPipelineStage] = useState(-1); // -1 = not started
  const [stageOutputs, setStageOutputs] = useState<Record<string, any>>({});
  const [stageDisplayOutputs, setStageDisplayOutputs] = useState<Record<string, string>>({});
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  
  const {
    currentStep,
    totalSteps,
    businessContext,
    voiceData,
    twitterUsername,
    setBusinessContext,
    setTwitterUsername,
    updateVoiceData,
    nextStep,
    prevStep,
    goToStep,
  } = useScriptWizard();

  // Run a single pipeline stage
  const runStage = useCallback(async (stageIndex: number, userModifications?: string) => {
    const stageName = PIPELINE_STAGES[stageIndex].name;
    setCurrentPipelineStage(stageIndex);
    setWaitingForApproval(false);
    setIsRerunning(stageIndex > 0 && !!userModifications);
    
    try {
      let data: any;

      if (stageName === 'rag') {
        const { data: d, error } = await supabase.functions.invoke('generate-script-v3', {
          body: {
            stage: 'rag',
            topic: businessContext.video_title,
            context_profile: businessContext,
          },
        });
        if (error) throw error;
        data = d;
      } else if (stageName === 'research') {
        const { data: d, error } = await supabase.functions.invoke('generate-script-v3', {
          body: {
            stage: 'research',
            topic: businessContext.video_title,
            context_profile: businessContext,
          },
        });
        if (error) throw error;
        data = d;
      } else if (stageName === 'claims') {
        // Claims come from research; user can modify
        const researchData = stageOutputs['research'];
        data = {
          claims: researchData?.research_pack?.claims || [],
        };
      } else if (stageName === 'alignment') {
        const claimsData = stageOutputs['claims'];
        const researchData = stageOutputs['research'];
        const { data: d, error } = await supabase.functions.invoke('generate-script-v3', {
          body: {
            stage: 'alignment',
            topic: businessContext.video_title,
            context_profile: businessContext,
            research_pack: {
              sources: researchData?.research_pack?.sources || [],
              claims: claimsData?.claims || [],
            },
          },
        });
        if (error) throw error;
        data = d;
      } else if (stageName === 'tone') {
        const { data: d, error } = await supabase.functions.invoke('generate-script-v3', {
          body: {
            stage: 'tone',
            topic: businessContext.video_title,
            context_profile: businessContext,
            tweets: voiceData.tweet_examples,
          },
        });
        if (error) throw error;
        data = d;
      } else if (stageName === 'structure') {
        const alignmentData = stageOutputs['alignment'];
        const ragData = stageOutputs['rag'];
        const { data: d, error } = await supabase.functions.invoke('script-structure', {
          body: {
            topic: businessContext.video_title,
            context_profile: businessContext,
            aligned_claims: alignmentData?.aligned_claims || [],
            target_length: 10,
            rag_examples_section: ragData?.rag_examples_section || '',
          },
        });
        if (error) throw error;
        data = d;
      } else if (stageName === 'writing') {
        const structureData = stageOutputs['structure'];
        const toneData = stageOutputs['tone'];
        const alignmentData = stageOutputs['alignment'];
        const ragData = stageOutputs['rag'];
        const { data: d, error } = await supabase.functions.invoke('script-write', {
          body: {
            structure: structureData?.structure,
            topic: businessContext.video_title,
            context_profile: businessContext,
            tone_summary: toneData?.tone_summary,
            aligned_claims: alignmentData?.aligned_claims || [],
            rag_examples_section: ragData?.rag_examples_section || '',
          },
        });
        if (error) throw error;
        data = d;
      } else if (stageName === 'polish') {
        const writeData = stageOutputs['writing'];
        const toneData = stageOutputs['tone'];
        const alignmentData = stageOutputs['alignment'];
        const ragData = stageOutputs['rag'];
        const { data: d, error } = await supabase.functions.invoke('script-polish', {
          body: {
            script: writeData?.script,
            tone_summary: toneData?.tone_summary,
            aligned_claims: alignmentData?.aligned_claims || [],
            rag_results: ragData?.rag_results,
          },
        });
        if (error) throw error;
        data = d;
      }

      // Store raw data and formatted display
      setStageOutputs(prev => ({ ...prev, [stageName]: data }));
      setStageDisplayOutputs(prev => ({ ...prev, [stageName]: formatStageOutput(stageName, data) }));
      setWaitingForApproval(true);
      setIsRerunning(false);

    } catch (error: any) {
      console.error(`Stage ${stageName} error:`, error);
      toast({
        title: `Stage ${stageIndex}: ${PIPELINE_STAGES[stageIndex].label} failed`,
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
      setIsRerunning(false);
      setWaitingForApproval(false);
    }
  }, [businessContext, voiceData, stageOutputs, toast]);

  // Start pipeline
  const handleGenerate = async () => {
    setIsGenerating(true);
    setPipelineActive(true);
    setStageOutputs({});
    setStageDisplayOutputs({});
    await runStage(0);
    setIsGenerating(false);
  };

  // Approve current stage and move to next
  const handleApproveStage = useCallback(async () => {
    const nextStageIndex = currentPipelineStage + 1;
    
    if (nextStageIndex >= PIPELINE_STAGES.length) {
      // All stages complete - navigate to result
      const polishData = stageOutputs['polish'];
      const researchData = stageOutputs['research'];
      const alignmentData = stageOutputs['alignment'];
      const toneData = stageOutputs['tone'];
      
      navigate('/script', {
        state: {
          script: polishData?.script,
          businessContext,
          voiceData,
          researchPack: researchData?.research_pack,
          alignmentChecklist: alignmentData?.alignment_stats,
          toneSummary: toneData?.tone_summary,
          contextUseLog: polishData?.context_use_log,
          retentionElements: polishData?.retention_elements,
          validation: { passed: true, issues: [] },
        },
      });
      return;
    }

    await runStage(nextStageIndex);
  }, [currentPipelineStage, stageOutputs, businessContext, voiceData, navigate, runStage]);

  // Re-run current stage with feedback
  const handleRerunStage = useCallback(async (feedback: string) => {
    // For now, re-run the same stage (the AI model will produce different output)
    // TODO: Pass feedback to the model for refinement
    await runStage(currentPipelineStage, feedback);
  }, [currentPipelineStage, runStage]);

  // Handle manual text edits to stage output
  const handleEditOutput = useCallback((stageName: string, editedText: string) => {
    setStageDisplayOutputs(prev => ({ ...prev, [stageName]: editedText }));
    
    // Also update raw data for stages that pass data forward
    const currentData = stageOutputs[stageName];
    if (stageName === 'claims') {
      // Try to parse edited claims back
      try {
        const lines = editedText.split('\n').filter(l => l.match(/^\[/));
        const claims = lines.map(line => {
          const claimMatch = line.match(/\]\s*\(score:\s*(\d+)\)\s*(.*)/);
          const sourceMatch = editedText.split('\n').find(l => l.trim().startsWith('Source:'));
          return {
            claim: claimMatch?.[2] || line,
            relevance_score: parseInt(claimMatch?.[1] || '5'),
            source_url: sourceMatch?.replace('Source:', '').trim() || '',
          };
        });
        if (claims.length > 0) {
          setStageOutputs(prev => ({ ...prev, claims: { claims } }));
        }
      } catch { /* keep original data */ }
    } else if (stageName === 'writing') {
      setStageOutputs(prev => ({ ...prev, writing: { ...currentData, script: editedText } }));
    } else if (stageName === 'polish') {
      setStageOutputs(prev => ({ ...prev, polish: { ...currentData, script: editedText } }));
    } else if (stageName === 'structure') {
      try {
        const parsed = JSON.parse(editedText);
        setStageOutputs(prev => ({ ...prev, structure: { structure: parsed } }));
      } catch { /* keep original data */ }
    }
  }, [stageOutputs]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessContextStep
            businessContext={businessContext}
            onSetBusinessContext={setBusinessContext}
            twitterUsername={twitterUsername}
            onSetTwitterUsername={setTwitterUsername}
          />
        );
      case 2:
        return <VoiceDataStep data={voiceData} onUpdate={updateVoiceData} twitterUsername={twitterUsername} />;
      case 3:
        return <ReviewStep businessContext={businessContext} voiceData={voiceData} onEditStep={goToStep} />;
      default:
        return null;
    }
  };

  const renderPipeline = () => {
    const currentStageName = currentPipelineStage >= 0 ? PIPELINE_STAGES[currentPipelineStage].name : '';
    
    return (
      <div className="space-y-6">
        {/* Pipeline progress bar */}
        <PipelineProgress currentStage={currentPipelineStage} stages={PIPELINE_STAGES} waitingForApproval={waitingForApproval} />

        {/* Completed stages (collapsed) */}
        {PIPELINE_STAGES.map((stage, index) => {
          if (index > currentPipelineStage) return null;
          const isCurrentStage = index === currentPipelineStage;
          const displayOutput = stageDisplayOutputs[stage.name];

          if (!displayOutput) {
            // Stage is running
            if (isCurrentStage && !waitingForApproval) {
              return (
                <div key={stage.name} className="border border-border rounded-xl p-6 bg-card/50 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center glow-orange">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground">
                      Running Stage {index}: {stage.label}...
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
                  </div>
                </div>
              );
            }
            return null;
          }

          return (
            <StageCheckpoint
              key={stage.name}
              stageName={`Stage ${index}: ${stage.label}`}
              stageNumber={index}
              output={displayOutput}
              onApprove={handleApproveStage}
              onRerun={(feedback) => handleRerunStage(feedback)}
              onEditOutput={(edited) => handleEditOutput(stage.name, edited)}
              isRerunning={isRerunning && isCurrentStage}
            />
          );
        })}
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
        <div className={pipelineActive ? 'max-w-4xl mx-auto' : 'max-w-2xl mx-auto'}>
          {!pipelineActive && (
            <WizardProgress currentStep={currentStep} totalSteps={totalSteps} stepLabels={stepLabels} />
          )}

          <div className={`bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-8 mb-8 ${pipelineActive ? '' : 'max-h-[60vh] overflow-y-auto'}`}>
            {pipelineActive ? renderPipeline() : renderStep()}
          </div>

          {!pipelineActive && (
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
