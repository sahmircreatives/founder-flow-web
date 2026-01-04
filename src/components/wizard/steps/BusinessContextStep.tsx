import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BusinessContext } from '@/types/scriptGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BusinessContextStepProps {
  businessContext: BusinessContext;
  onSetBusinessContext: (context: BusinessContext) => void;
}

const emptyTemplate = {
  vsl_context: {
    product_service: {
      name: "",
      description: "",
      type: "coaching|course|software|service|product"
    },
    target_audience: {
      demographics: {
        age_range: "",
        income_level: "",
        profession: "",
        business_size: "",
        experience_level: "",
        location: ""
      },
      psychographics: {
        values: [],
        interests: [],
        lifestyle: "",
        personality_traits: []
      }
    },
    core_problem: {
      primary_pain_point: "",
      keeps_them_up_at_night: "",
      emotional_impact: "",
      financial_impact: "",
      time_impact: "",
      relationship_impact: ""
    },
    transformation_promise: {
      from_state: {
        current_situation: "",
        pain_points: [],
        limitations: []
      },
      to_state: {
        desired_outcome: "",
        benefits: [],
        new_capabilities: []
      },
      timeline: "",
      success_metrics: []
    },
    pricing: {
      price_point: "",
      price_range: { low: 0, high: 0 },
      payment_structure: "one-time|monthly|annual|payment_plan",
      currency: "USD",
      value_justification: ""
    },
    industry_niche: {
      primary_industry: "",
      sub_niche: "",
      market_size: "",
      competition_level: "low|medium|high",
      market_maturity: "emerging|growing|mature|declining"
    },
    script_specifications: {
      target_length: {
        minutes: 0,
        range: "30-45|45-60|60-75|75-90"
      }
    }
  }
};

const BusinessContextStep = ({ businessContext, onSetBusinessContext }: BusinessContextStepProps) => {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wasAutoFilled, setWasAutoFilled] = useState(false);
  const [jsonValue, setJsonValue] = useState(() => 
    JSON.stringify(businessContext.vsl_context, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

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
        vsl_context: data.vsl_context,
      };

      onSetBusinessContext(newContext);
      setJsonValue(JSON.stringify(data.vsl_context, null, 2));
      setWasAutoFilled(true);

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
      const parsed = JSON.parse(value);
      onSetBusinessContext({
        video_title: businessContext.video_title,
        vsl_context: parsed,
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Business Context</h3>
        <p className="text-muted-foreground text-sm">
          Let Grok research your business automatically, or edit the JSON directly.
        </p>
      </div>

      {/* Video Title */}
      <div>
        <Label htmlFor="videoTitle" className="text-sm font-medium text-foreground mb-2 block">
          Video Title / Topic
        </Label>
        <Input
          id="videoTitle"
          placeholder="e.g., How I Built a 6-Figure Coaching Business"
          value={businessContext.video_title}
          onChange={(e) => handleVideoTitleChange(e.target.value)}
          className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
        />
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
              Filling...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Have Grok fill this out for you
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
          className={`bg-secondary/50 border-border text-foreground font-mono text-xs min-h-[300px] ${
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
