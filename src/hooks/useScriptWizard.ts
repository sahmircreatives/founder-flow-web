import { useState, useCallback } from 'react';
import { BusinessContext, VoiceData } from '@/types/scriptGenerator';

// Initial empty state for business context (new structure)
const initialBusinessContext: BusinessContext = {
  video_title: '',
  business_context: {
    business: {
      name: '',
      description: '',
      type: 'coaching',
      unique_mechanism: '',
      key_differentiator: '',
    },
    offer: {
      name: '',
      description: '',
      offer_type: 'high_ticket',
      price_point: '',
      pricing_structure: 'one_time',
      delivery_method: 'coaching',
      what_they_get: [],
      main_outcome: '',
      timeline_to_result: '',
      guarantee: '',
      bonuses: [],
    },
    creator: {
      name: '',
      positioning: '',
      credibility_claim: '',
      origin_story: '',
    },
    icp: {
      demographics: {
        profession_or_role: '',
        income_level: '',
        business_stage: 'full_time',
        experience_level: 'intermediate',
      },
      psychographics: {
        aspirations: [],
        fears: [],
        values: [],
        beliefs_about_topic: [],
      },
      current_situation: '',
      what_theyve_tried: [],
      why_previous_solutions_failed: '',
      awareness_level: {
        problem_aware: 'yes',
        solution_aware: 'partially',
        product_aware: 'no',
      },
    },
    icp_pain_points: {
      primary_problem: '',
      root_cause: '',
      emotional_pain: {
        frustrations: [],
        fears: [],
        embarrassments: [],
        keeps_them_up_at_night: '',
      },
      practical_pain: {
        time_impact: '',
        financial_impact: '',
        opportunities_missed: '',
      },
      social_pain: {
        how_others_perceive_them: '',
        comparison_to_peers: '',
      },
      false_beliefs: [],
      common_objections: [],
    },
    transformation: {
      from_state: {
        situation: '',
        struggles: [],
        limiting_identity: '',
      },
      to_state: {
        outcome: '',
        benefits: [],
        new_identity: '',
      },
      timeline: '',
      proof_points: [],
    },
    industry: {
      niche: '',
      sub_niche: '',
      competition_level: 'medium',
      common_competitors: [],
    },
  },
};

const initialVoiceData: VoiceData = {
  tweet_examples: '',
  tone_goals: [],
  dont_phrases: [],
};

export const useScriptWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessContext, setBusinessContextState] = useState<BusinessContext>(initialBusinessContext);
  const [voiceData, setVoiceDataState] = useState<VoiceData>(initialVoiceData);
  const [twitterUsername, setTwitterUsernameState] = useState<string>('');

  // 3 steps: Business Context, Voice, Review
  const totalSteps = 3;

  // Bulk update for business context (used by Grok auto-fill)
  const setBusinessContext = useCallback((context: BusinessContext) => {
    setBusinessContextState(context);
  }, []);

  const setTwitterUsername = useCallback((username: string) => {
    setTwitterUsernameState(username);
  }, []);

  const updateVoiceData = useCallback((field: keyof VoiceData, value: string | string[]) => {
    setVoiceDataState(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const reset = useCallback(() => {
    setCurrentStep(1);
    setBusinessContextState(initialBusinessContext);
    setVoiceDataState(initialVoiceData);
    setTwitterUsernameState('');
  }, []);

  return {
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
    reset,
  };
};
