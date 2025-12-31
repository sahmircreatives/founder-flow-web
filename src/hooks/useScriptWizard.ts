import { useState, useCallback } from 'react';
import { BusinessContext, VoiceData } from '@/types/scriptGenerator';

// Initial empty state for business context
const initialBusinessContext: BusinessContext = {
  vsl_context: {
    product_service: {
      name: '',
      description: '',
      type: 'service',
    },
    target_audience: {
      demographics: {
        age_range: '',
        income_level: '',
        profession: '',
        business_size: '',
        experience_level: '',
        location: '',
      },
      psychographics: {
        values: [],
        interests: [],
        lifestyle: '',
        personality_traits: [],
      },
    },
    core_problem: {
      primary_pain_point: '',
      keeps_them_up_at_night: '',
      emotional_impact: '',
      financial_impact: '',
      time_impact: '',
      relationship_impact: '',
    },
    transformation_promise: {
      from_state: {
        current_situation: '',
        pain_points: [],
        limitations: [],
      },
      to_state: {
        desired_outcome: '',
        benefits: [],
        new_capabilities: [],
      },
      timeline: '',
      success_metrics: [],
    },
    pricing: {
      price_point: '',
      price_range: {
        low: 0,
        high: 0,
      },
      payment_structure: 'one-time',
      currency: 'USD',
      value_justification: '',
    },
    industry_niche: {
      primary_industry: '',
      sub_niche: '',
      market_size: '',
      competition_level: 'medium',
      market_maturity: 'growing',
    },
    vsl_specifications: {
      target_length: {
        minutes: 10,
        range: '45-60',
      },
    },
  },
};

const initialVoiceData: VoiceData = {
  tweet_examples: '',
  tone_goals: [],
  do_phrases: [],
  dont_phrases: [],
};

export const useScriptWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessContext, setBusinessContext] = useState<BusinessContext>(initialBusinessContext);
  const [voiceData, setVoiceData] = useState<VoiceData>(initialVoiceData);

  // Total steps: Business sections (1-5) + Voice Data (6) + Review (7)
  const totalSteps = 7;

  const updateProductService = useCallback((field: keyof BusinessContext['vsl_context']['product_service'], value: string) => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        product_service: {
          ...prev.vsl_context.product_service,
          [field]: value,
        },
      },
    }));
  }, []);

  const updateDemographics = useCallback((field: keyof BusinessContext['vsl_context']['target_audience']['demographics'], value: string) => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        target_audience: {
          ...prev.vsl_context.target_audience,
          demographics: {
            ...prev.vsl_context.target_audience.demographics,
            [field]: value,
          },
        },
      },
    }));
  }, []);

  const updatePsychographics = useCallback((field: keyof BusinessContext['vsl_context']['target_audience']['psychographics'], value: string | string[]) => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        target_audience: {
          ...prev.vsl_context.target_audience,
          psychographics: {
            ...prev.vsl_context.target_audience.psychographics,
            [field]: value,
          },
        },
      },
    }));
  }, []);

  const updateCoreProblem = useCallback((field: keyof BusinessContext['vsl_context']['core_problem'], value: string) => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        core_problem: {
          ...prev.vsl_context.core_problem,
          [field]: value,
        },
      },
    }));
  }, []);

  const updateTransformationFromState = useCallback((field: keyof BusinessContext['vsl_context']['transformation_promise']['from_state'], value: string | string[]) => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        transformation_promise: {
          ...prev.vsl_context.transformation_promise,
          from_state: {
            ...prev.vsl_context.transformation_promise.from_state,
            [field]: value,
          },
        },
      },
    }));
  }, []);

  const updateTransformationToState = useCallback((field: keyof BusinessContext['vsl_context']['transformation_promise']['to_state'], value: string | string[]) => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        transformation_promise: {
          ...prev.vsl_context.transformation_promise,
          to_state: {
            ...prev.vsl_context.transformation_promise.to_state,
            [field]: value,
          },
        },
      },
    }));
  }, []);

  const updateTransformationMeta = useCallback((field: 'timeline' | 'success_metrics', value: string | string[]) => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        transformation_promise: {
          ...prev.vsl_context.transformation_promise,
          [field]: value,
        },
      },
    }));
  }, []);

  const updatePricing = useCallback((field: keyof BusinessContext['vsl_context']['pricing'], value: any) => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        pricing: {
          ...prev.vsl_context.pricing,
          [field]: value,
        },
      },
    }));
  }, []);

  const updateIndustryNiche = useCallback((field: keyof BusinessContext['vsl_context']['industry_niche'], value: string) => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        industry_niche: {
          ...prev.vsl_context.industry_niche,
          [field]: value,
        },
      },
    }));
  }, []);

  const updateVslSpecs = useCallback((minutes: number, range: '30-45' | '45-60' | '60-75' | '75-90') => {
    setBusinessContext(prev => ({
      ...prev,
      vsl_context: {
        ...prev.vsl_context,
        vsl_specifications: {
          target_length: { minutes, range },
        },
      },
    }));
  }, []);

  const updateVoiceData = useCallback((field: keyof VoiceData, value: string | string[]) => {
    setVoiceData(prev => ({
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
    setBusinessContext(initialBusinessContext);
    setVoiceData(initialVoiceData);
  }, []);

  return {
    currentStep,
    totalSteps,
    businessContext,
    voiceData,
    updateProductService,
    updateDemographics,
    updatePsychographics,
    updateCoreProblem,
    updateTransformationFromState,
    updateTransformationToState,
    updateTransformationMeta,
    updatePricing,
    updateIndustryNiche,
    updateVslSpecs,
    updateVoiceData,
    nextStep,
    prevStep,
    goToStep,
    reset,
  };
};
