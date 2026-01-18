import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BusinessContext } from '@/types/scriptGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';

interface TitleSuggestion {
  title: string;
  angle: string;
}

interface BestTitle {
  title: string;
  reason: string;
}

interface BusinessContextStepProps {
  businessContext: BusinessContext;
  onSetBusinessContext: (context: BusinessContext) => void;
  twitterUsername: string;
  onSetTwitterUsername: (username: string) => void;
}

const emptyTemplate = {
  business_context: {
    business: {
      name: "",
      description: "",
      type: "coaching|agency|saas|ecommerce|info_product|service|personal_brand",
      unique_mechanism: "",
      key_differentiator: ""
    },
    offer: {
      name: "",
      description: "",
      offer_type: "high_ticket|mid_ticket|low_ticket|community|free_lead_magnet",
      price_point: "",
      pricing_structure: "one_time|monthly|annual|payment_plan",
      delivery_method: "done_for_you|done_with_you|course|coaching|software|community|physical_product",
      what_they_get: [],
      main_outcome: "",
      timeline_to_result: "",
      guarantee: "",
      bonuses: []
    },
    creator: {
      name: "",
      positioning: "",
      credibility_claim: "",
      origin_story: ""
    },
    icp: {
      demographics: {
        profession_or_role: "",
        income_level: "",
        business_stage: "pre_revenue|side_hustle|full_time|scaling|established",
        experience_level: "beginner|intermediate|advanced"
      },
      psychographics: {
        aspirations: [],
        fears: [],
        values: [],
        beliefs_about_topic: []
      },
      current_situation: "",
      what_theyve_tried: [],
      why_previous_solutions_failed: "",
      awareness_level: {
        problem_aware: "yes|no|partially",
        solution_aware: "yes|no|partially",
        product_aware: "yes|no|partially"
      }
    },
    icp_pain_points: {
      primary_problem: "",
      root_cause: "",
      emotional_pain: {
        frustrations: [],
        fears: [],
        embarrassments: [],
        keeps_them_up_at_night: ""
      },
      practical_pain: {
        time_impact: "",
        financial_impact: "",
        opportunities_missed: ""
      },
      social_pain: {
        how_others_perceive_them: "",
        comparison_to_peers: ""
      },
      false_beliefs: [],
      common_objections: []
    },
    transformation: {
      from_state: {
        situation: "",
        struggles: [],
        limiting_identity: ""
      },
      to_state: {
        outcome: "",
        benefits: [],
        new_identity: ""
      },
      timeline: "",
      proof_points: []
    },
    industry: {
      niche: "",
      sub_niche: "",
      competition_level: "low|medium|high",
      common_competitors: []
    }
  }
};

const BusinessContextStep = ({ businessContext, onSetBusinessContext, twitterUsername, onSetTwitterUsername }: BusinessContextStepProps) => {
  const { toast } = useToast();
  const [username, setUsername] = useState(twitterUsername || '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wasAutoFilled, setWasAutoFilled] = useState(false);
  const [jsonValue, setJsonValue] = useState(() => 
    JSON.stringify(businessContext.business_context, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  // Title suggestion state
  const [titleUsername, setTitleUsername] = useState(twitterUsername || '');
  const [roughTopic, setRoughTopic] = useState('');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isSelectingBest, setIsSelectingBest] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<TitleSuggestion[]>([]);
  const [bestTitles, setBestTitles] = useState<BestTitle[]>([]);

  const handleGrokFill = async () => {
    if (!username.trim()) {
      toast({
        title: 'Username required',
        description: 'Please enter a Twitter/X username to research.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setJsonError(null);

    try {
      const { data, error } = await supabase.functions.invoke('grok-fill-business', {
        body: {
          username: username.trim(),
          websiteUrl: websiteUrl.trim() || null,
          template: emptyTemplate,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Update the business context with the filled data
      const newContext: BusinessContext = {
        video_title: businessContext.video_title,
        business_context: data.business_context,
      };

      onSetBusinessContext(newContext);
      setJsonValue(JSON.stringify(data.business_context, null, 2));
      setWasAutoFilled(true);
      
      // Save the username to global state for use in Voice step
      onSetTwitterUsername(username.trim());
      setTitleUsername(username.trim());

      toast({
        title: 'Auto-filled successfully',
        description: 'Review the business context for accuracy.',
      });
    } catch (error: any) {
      console.error('Grok fill error:', error);
      toast({
        title: 'Auto-fill failed',
        description: error.message || 'Please try again or fill manually.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    setJsonError(null);

    try {
      // Sanitize: fix newlines inside strings by replacing them with spaces
      const sanitized = value.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
        return match.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s+/g, ' ');
      });
      
      const parsed = JSON.parse(sanitized);
      onSetBusinessContext({
        video_title: businessContext.video_title,
        business_context: parsed,
      });
    } catch (e) {
      setJsonError('Invalid JSON format');
    }
  };

  const handleVideoTitleChange = (title: string) => {
    onSetBusinessContext({
      ...businessContext,
      video_title: title,
    });
  };

  const handleGetTopicAndTitles = async () => {
    if (!titleUsername.trim()) {
      toast({
        title: 'Username required',
        description: 'Please enter a Twitter/X username.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingTopic(true);
    setRoughTopic('');
    setTitleSuggestions([]);
    setBestTitles([]);

    try {
      // Step 1: Get topic from Grok
      const { data: topicData, error: topicError } = await supabase.functions.invoke('generate-topic-idea', {
        body: {
          username: titleUsername.trim(),
          businessContext: businessContext,
        },
      });

      if (topicError) throw topicError;
      if (topicData.error) throw new Error(topicData.error);

      const generatedTopic = topicData.topic || '';
      setRoughTopic(generatedTopic);

      if (!generatedTopic) {
        throw new Error('No topic was generated');
      }

      // Step 2: Generate 5 titles from the topic
      setIsGeneratingTopic(false);
      setIsGeneratingTitles(true);

      const { data: titlesData, error: titlesError } = await supabase.functions.invoke('generate-title-suggestions', {
        body: {
          roughTopic: generatedTopic,
          businessContext: businessContext,
        },
      });

      if (titlesError) throw titlesError;
      if (titlesData.error) throw new Error(titlesData.error);

      const allSuggestions = titlesData.suggestions || [];
      setTitleSuggestions(allSuggestions);

      // Step 3: Have Claude select the best 2
      setIsGeneratingTitles(false);
      setIsSelectingBest(true);

      const { data: bestData, error: bestError } = await supabase.functions.invoke('select-best-titles', {
        body: {
          titles: allSuggestions,
          roughTopic: generatedTopic,
          businessContext: businessContext,
        },
      });

      if (bestError) throw bestError;
      if (bestData.error) throw new Error(bestData.error);

      setBestTitles(bestData.best_titles || []);
      
      // Save the username to global state for use in Voice step
      onSetTwitterUsername(titleUsername.trim());

      toast({
        title: 'Top 2 titles ready',
        description: 'Pick your favorite.',
      });
    } catch (error: any) {
      console.error('Topic/title generation error:', error);
      toast({
        title: 'Failed to generate titles',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingTopic(false);
      setIsGeneratingTitles(false);
      setIsSelectingBest(false);
    }
  };

  const handleSelectTitle = (title: string) => {
    handleVideoTitleChange(title);
    toast({
      title: 'Title selected',
      description: 'You can edit it further if needed.',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Business Context</h3>
        <p className="text-muted-foreground text-sm">
          Let Grok research your business automatically, or edit the JSON directly.
        </p>
      </div>

      {/* Video Title */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="videoTitle" className="text-sm font-medium text-foreground mb-2 block">
            Video Title
          </Label>
          <Input
            id="videoTitle"
            placeholder="e.g., How I Built a 6-Figure Coaching Business"
            value={businessContext.video_title}
            onChange={(e) => handleVideoTitleChange(e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Title Generator */}
        <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Need help with the title?</span>
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="@username"
              value={titleUsername}
              onChange={(e) => setTitleUsername(e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground flex-1"
            />
            <Button
              onClick={handleGetTopicAndTitles}
              disabled={isGeneratingTopic || isGeneratingTitles || isSelectingBest || !titleUsername.trim()}
              className="shrink-0 gradient-bg text-white hover:opacity-90"
            >
              {isGeneratingTopic || isGeneratingTitles || isSelectingBest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isGeneratingTopic ? 'Finding topic...' : isGeneratingTitles ? 'Generating titles...' : 'Picking best 2...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Titles
                </>
              )}
            </Button>
          </div>

          {/* Show generated topic */}
          {roughTopic && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-xs text-muted-foreground mb-1">Topic idea:</p>
              <p className="text-sm text-foreground">{roughTopic}</p>
            </div>
          )}

          {/* Best 2 Titles - Primary Selection */}
          {bestTitles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-primary">🏆 Top 2 picks — click to select:</p>
              <div className="space-y-2">
                {bestTitles.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTitle(suggestion.title)}
                    className="w-full text-left p-3 rounded-lg border-2 border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-colors group"
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {suggestion.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {suggestion.reason}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Title Suggestions - Secondary */}
          {titleSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">All generated titles:</p>
              <div className="space-y-1">
                {titleSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectTitle(suggestion.title)}
                    className="w-full text-left p-2 rounded-lg border border-border bg-background hover:bg-secondary/50 hover:border-primary/30 transition-colors group text-xs"
                  >
                    <p className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                      {suggestion.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grok Auto-fill Section */}
      <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Auto-fill with Grok</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="username" className="text-xs text-muted-foreground mb-1 block">
              Target X/Twitter Username
            </Label>
            <Input
              id="username"
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <Label htmlFor="website" className="text-xs text-muted-foreground mb-1 block">
              Website / Link-in-bio (optional)
            </Label>
            <Input
              id="website"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <Button
          onClick={handleGrokFill}
          disabled={isLoading}
          className="w-full gradient-bg text-white hover:opacity-90"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Have Grok research & fill this
            </>
          )}
        </Button>
      </div>

      {/* Auto-filled Banner */}
      {wasAutoFilled && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm text-foreground">
            Auto-filled by Grok — review for accuracy
          </span>
        </div>
      )}

      {/* JSON Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="jsonEditor" className="text-sm font-medium text-foreground">
            Business Context JSON
          </Label>
          {jsonError && (
            <div className="flex items-center gap-1 text-destructive text-xs">
              <AlertCircle className="w-3 h-3" />
              {jsonError}
            </div>
          )}
        </div>
        <Textarea
          id="jsonEditor"
          value={jsonValue}
          onChange={(e) => handleJsonChange(e.target.value)}
          className={`bg-secondary/50 border-border text-foreground font-mono text-xs min-h-[400px] ${
            jsonError ? 'border-destructive' : ''
          }`}
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Edit the JSON directly or use the auto-fill feature above.
        </p>
      </div>
    </div>
  );
};

export default BusinessContextStep;
