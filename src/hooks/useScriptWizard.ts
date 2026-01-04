import { useState, useCallback, useEffect } from 'react';
import { BusinessContext, VoiceData } from '@/types/scriptGenerator';

const STORAGE_KEY_BUSINESS = 'script_wizard_business_context';
const STORAGE_KEY_VOICE = 'script_wizard_voice_data';

// Initial empty state for business context
const initialBusinessContext: BusinessContext = {
  video_title: '',
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
    script_specifications: {
      target_length: {
        minutes: 5,
        range: '5-6m',
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

// Load from localStorage
const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error(`Failed to load ${key} from localStorage:`, e);
  }
  return fallback;
};

// Save to localStorage
const saveToStorage = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage:`, e);
  }
};

export const useScriptWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessContext, setBusinessContextState] = useState<BusinessContext>(() => 
    loadFromStorage(STORAGE_KEY_BUSINESS, initialBusinessContext)
  );
  const [voiceData, setVoiceDataState] = useState<VoiceData>(() => 
    loadFromStorage(STORAGE_KEY_VOICE, initialVoiceData)
  );

  // 3 steps: Business Context, Voice, Review
  const totalSteps = 3;

  // Persist businessContext to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEY_BUSINESS, businessContext);
  }, [businessContext]);

  // Persist voiceData to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEY_VOICE, voiceData);
  }, [voiceData]);

  // Bulk update for business context (used by Grok auto-fill)
  const setBusinessContext = useCallback((context: BusinessContext) => {
    setBusinessContextState(context);
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
    localStorage.removeItem(STORAGE_KEY_BUSINESS);
    localStorage.removeItem(STORAGE_KEY_VOICE);
  }, []);

  return {
    currentStep,
    totalSteps,
    businessContext,
    voiceData,
    setBusinessContext,
    updateVoiceData,
    nextStep,
    prevStep,
    goToStep,
    reset,
  };
};
