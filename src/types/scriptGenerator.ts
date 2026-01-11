// Business Context JSON Structure (Stage 0 - Grok fills this)
export interface BusinessContext {
  video_title: string;
  business_context: {
    business: {
      name: string;
      description: string;
      type: 'coaching' | 'agency' | 'saas' | 'ecommerce' | 'info_product' | 'service' | 'personal_brand';
      unique_mechanism: string;
      key_differentiator: string;
    };
    offer: {
      name: string;
      description: string;
      offer_type: 'high_ticket' | 'mid_ticket' | 'low_ticket' | 'community' | 'free_lead_magnet';
      price_point: string;
      pricing_structure: 'one_time' | 'monthly' | 'annual' | 'payment_plan';
      delivery_method: 'done_for_you' | 'done_with_you' | 'course' | 'coaching' | 'software' | 'community' | 'physical_product';
      what_they_get: string[];
      main_outcome: string;
      timeline_to_result: string;
      guarantee: string;
      bonuses: string[];
    };
    creator: {
      name: string;
      positioning: string;
      credibility_claim: string;
      origin_story: string;
    };
    icp: {
      demographics: {
        profession_or_role: string;
        income_level: string;
        business_stage: 'pre_revenue' | 'side_hustle' | 'full_time' | 'scaling' | 'established';
        experience_level: 'beginner' | 'intermediate' | 'advanced';
      };
      psychographics: {
        aspirations: string[];
        fears: string[];
        values: string[];
        beliefs_about_topic: string[];
      };
      current_situation: string;
      what_theyve_tried: string[];
      why_previous_solutions_failed: string;
      awareness_level: {
        problem_aware: 'yes' | 'no' | 'partially';
        solution_aware: 'yes' | 'no' | 'partially';
        product_aware: 'yes' | 'no' | 'partially';
      };
    };
    icp_pain_points: {
      primary_problem: string;
      root_cause: string;
      emotional_pain: {
        frustrations: string[];
        fears: string[];
        embarrassments: string[];
        keeps_them_up_at_night: string;
      };
      practical_pain: {
        time_impact: string;
        financial_impact: string;
        opportunities_missed: string;
      };
      social_pain: {
        how_others_perceive_them: string;
        comparison_to_peers: string;
      };
      false_beliefs: string[];
      common_objections: string[];
    };
    transformation: {
      from_state: {
        situation: string;
        struggles: string[];
        limiting_identity: string;
      };
      to_state: {
        outcome: string;
        benefits: string[];
        new_identity: string;
      };
      timeline: string;
      proof_points: string[];
    };
    industry: {
      niche: string;
      sub_niche: string;
      competition_level: 'low' | 'medium' | 'high';
      common_competitors: string[];
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
