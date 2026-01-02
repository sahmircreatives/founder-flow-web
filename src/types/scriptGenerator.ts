// Business Context JSON Structure
export interface BusinessContext {
  video_title: string;
  vsl_context: {
    product_service: {
      name: string;
      description: string;
      type: 'coaching' | 'course' | 'software' | 'service' | 'product';
    };
    target_audience: {
      demographics: {
        age_range: string;
        income_level: string;
        profession: string;
        business_size: string;
        experience_level: string;
        location: string;
      };
      psychographics: {
        values: string[];
        interests: string[];
        lifestyle: string;
        personality_traits: string[];
      };
    };
    core_problem: {
      primary_pain_point: string;
      keeps_them_up_at_night: string;
      emotional_impact: string;
      financial_impact: string;
      time_impact: string;
      relationship_impact: string;
    };
    transformation_promise: {
      from_state: {
        current_situation: string;
        pain_points: string[];
        limitations: string[];
      };
      to_state: {
        desired_outcome: string;
        benefits: string[];
        new_capabilities: string[];
      };
      timeline: string;
      success_metrics: string[];
    };
    pricing: {
      price_point: string;
      price_range: {
        low: number;
        high: number;
      };
      payment_structure: 'one-time' | 'monthly' | 'annual' | 'payment_plan';
      currency: string;
      value_justification: string;
    };
    industry_niche: {
      primary_industry: string;
      sub_niche: string;
      market_size: string;
      competition_level: 'low' | 'medium' | 'high';
      market_maturity: 'emerging' | 'growing' | 'mature' | 'declining';
    };
    vsl_specifications: {
      target_length: {
        minutes: number;
        range: '15-60s' | '5-6m' | '8-15m' | '20-30m';
      };
    };
  };
}

// Voice Data Structure
export interface VoiceData {
  tweet_examples: string;
  tone_goals: string[];
  do_phrases: string[];
  dont_phrases: string[];
}

// Tone Summary (extracted from tweets - style only)
export interface ToneSummary {
  one_sentence_voice: string;
  tone_rules: string[];
  do_phrases: string[];
  dont_phrases: string[];
  cadence_notes: string[];
  example_lines: string[];
}

// Context Use Log (tracks tweet usage in script)
export interface ContextUseLog {
  tweet_proof_items_used: number;
  tweet_proof_items: string[];
  sections: { name: string; non_tweet_value_points: number }[];
}

// Generation Request
export interface GenerateScriptRequest {
  business: BusinessContext;
  voice: VoiceData;
  variation: 'A' | 'B' | 'C';
}

// Generation Response
export interface GenerateScriptResponse {
  context_profile: BusinessContext;
  script: string;
  tone_summary?: ToneSummary;
  context_use_log?: ContextUseLog;
}
